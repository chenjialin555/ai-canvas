import { memo, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Circle, Group, Image as KonvaImage, Rect, Text } from "react-konva";
import type Konva from "konva";
import { useEditorStore } from "../../../features/editor/store";
import {
  gestureHistoryDragEnd,
  gestureHistoryDragStart,
} from "../../../features/editor/commands/interactionGestureHistory";
import { buildComfyBridgeDefinition } from "../comfy/buildComfyBridgeDefinition";
import { getWorkflowNodeDefinition } from "../model/nodeRegistry";
import {
  AI_NODE_ACTIONS_GAP,
  AI_NODE_ACTIONS_H,
  AI_NODE_BODY_PAD_BOTTOM,
  AI_NODE_BODY_PAD_X,
  AI_NODE_DESC_SECTION_H,
  AI_NODE_HEADER_H,
  AI_NODE_INPUT_PORT_CX,
  AI_NODE_MIN_HEIGHT,
  AI_NODE_MIN_WIDTH,
  AI_NODE_OUTPUT_PORT_CX,
  AI_NODE_PORT_GAP,
  AI_NODE_PORT_ROW_START,
  AI_NODE_PREVIEW_MAX_H,
  AI_NODE_TOP_BAR_H,
  computeWorkflowNodeHeight,
} from "../model/nodeLayout";
import { useWorkflowNodeTheme } from "../../../shared/hooks/useWorkflowNodeTheme";
import { extFromImageUrl, randomImageFilename } from "../../../shared/lib/randomFilename";
import { PORT_COLORS } from "../model/portColors";
import type { WorkflowNode } from "../model/types";

type Props = {
  nodeId: string;
};

const PORT_RADIUS = 6.5;
const PORT_GLOW = 4;
const CARD_STROKE = 1;

/** 与卡片圆角一致的裁剪路径，顶栏渐变条等子元素不再单独设过大 cornerRadius */
function clipWorkflowNodeCard(
  ctx: Konva.Context,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(w - radius, 0);
  ctx.arcTo(w, 0, w, radius, radius);
  ctx.lineTo(w, h - radius);
  ctx.arcTo(w, h, w - radius, h, radius);
  ctx.lineTo(radius, h);
  ctx.arcTo(0, h, 0, h - radius, radius);
  ctx.lineTo(0, radius);
  ctx.arcTo(0, 0, radius, 0, radius);
  ctx.closePath();
}
/** 仅画布缩得很小时再隐藏节点正文（预览/参数等）；默认 zoom=0.45，若用 0.45 作阈值会「略缩小就整块空白」 */
const COMPACT_BODY_ZOOM_THRESHOLD = 0.2;

function safeDim(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
  return fallback;
}

function useHtmlImage(url?: string) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!url) {
      setImg(null);
      return;
    }
    const i = new window.Image();
    i.crossOrigin = "anonymous";
    i.onload = () => setImg(i);
    i.onerror = () => setImg(null);
    i.src = url;
  }, [url]);
  return img;
}

function statusText(status: WorkflowNode["status"]): string {
  switch (status) {
    case "running":
      return "运行中";
    case "success":
      return "完成";
    case "error":
      return "错误";
    case "ready":
      return "就绪";
    default:
      return "空闲";
  }
}

type PortCircleProps = {
  x: number;
  y: number;
  color: string;
  stroke: string;
  onMouseDown?: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onMouseUp?: (e: Konva.KonvaEventObject<MouseEvent>) => void;
};

function PortCircle(props: PortCircleProps) {
  return (
    <>
      <Circle
        x={props.x}
        y={props.y}
        radius={PORT_RADIUS + PORT_GLOW}
        fill={props.color}
        opacity={0.2}
        listening={false}
      />
      <Circle
        x={props.x}
        y={props.y}
        radius={PORT_RADIUS}
        fill={props.color}
        stroke={props.stroke}
        strokeWidth={2}
        shadowBlur={4}
        shadowOpacity={0.15}
        shadowColor={props.color}
        onMouseDown={props.onMouseDown}
        onMouseUp={props.onMouseUp}
      />
    </>
  );
}

/** 预览区内按宽高比缩放（contain），返回相对节点局部的绘制矩形 */
function previewImageContainRect(
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  imgW: number,
  imgH: number,
): { x: number; y: number; w: number; h: number } {
  if (boxW <= 0 || boxH <= 0) return { x: boxX, y: boxY, w: 0, h: 0 };
  const iw = imgW > 0 ? imgW : 1;
  const ih = imgH > 0 ? imgH : 1;
  const scale = Math.min(boxW / iw, boxH / ih);
  const w = iw * scale;
  const h = ih * scale;
  return {
    x: boxX + (boxW - w) / 2,
    y: boxY + (boxH - h) / 2,
    w,
    h,
  };
}

/** 下载远程图像（失败则改为新窗口打开） */
async function downloadImageFromUrl(url: string): Promise<void> {
  const name = randomImageFilename(extFromImageUrl(url));
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = name;
    a.rel = "noopener";
    a.click();
    URL.revokeObjectURL(href);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export const WorkflowNodeView = memo(function WorkflowNodeView(props: Props) {
  const theme = useWorkflowNodeTheme();
  const node = useEditorStore((s) => {
    const page = s.pages.find((p) => p.id === s.activePageId);
    return page?.aiNodes.find((n) => n.id === props.nodeId);
  });
  const zoom = useEditorStore((s) => s.zoom);

  const def = useMemo(() => {
    if (!node) return null;
    if (node.type === "comfy-bridge") return buildComfyBridgeDefinition(node);
    return getWorkflowNodeDefinition(node.type);
  }, [node?.type, node?.params]);
  const selected = useEditorStore((s) =>
    node ? s.selectedWorkflowNodeIds.includes(node.id) : false,
  );
  const updateNode = useEditorStore((s) => s.updateWorkflowNode);
  const setSel = useEditorStore((s) => s.setSelectedWorkflowNodeIds);
  const startConn = useEditorStore((s) => s.startWorkflowConnecting);
  const completeConn = useEditorStore((s) => s.completeWorkflowConnectingToInput);
  /** 不订阅 pointerX/Y，避免拖线时每帧重渲染全部节点 */
  const connectingActive = useEditorStore((s) => s.workflowConnecting.active);
  const connectingDataType = useEditorStore((s) => s.workflowConnecting.dataType);
  const runNode = useEditorStore((s) => s.runWorkflowNode);
  const sendCanvas = useEditorStore((s) => s.sendWorkflowResultToCanvas);

  const compactEarly = zoom < COMPACT_BODY_ZOOM_THRESHOLD;

  const nw = node
    ? Math.max(AI_NODE_MIN_WIDTH, safeDim(node.width, AI_NODE_MIN_WIDTH))
    : AI_NODE_MIN_WIDTH;
  const nh = useMemo(() => {
    if (!def) return AI_NODE_MIN_HEIGHT;
    return computeWorkflowNodeHeight(def, compactEarly);
  }, [def, compactEarly]);

  useLayoutEffect(() => {
    if (!node) return;
    const tw = Math.round(nw);
    const th = Math.round(nh);
    const rw = Math.round(node.width);
    const rh = Math.round(node.height);
    if (rw === tw && rh === th) return;
    updateNode(node.id, { width: nw, height: nh }, { history: false });
  }, [node?.id, node?.width, node?.height, nw, nh, updateNode]);

  const previewKey = def?.preview?.outputKey ?? "result";
  const previewOut = node?.outputs[previewKey];
  const previewUrl =
    previewOut?.type === "image" || previewOut?.type === "mask"
      ? previewOut.url
      : undefined;
  const previewImg = useHtmlImage(previewUrl);

  if (!node || !def) return null;

  const compact = compactEarly;
  const zLay = Math.max(0.45, Math.min(zoom, 4));
  const fs = (screenPx: number) =>
    Math.max(10, Math.min(24, screenPx / zLay));

  const padX = AI_NODE_BODY_PAD_X;
  const portRows = Math.max(def.inputs.length, def.outputs.length, 1);
  const portBlockBottom = AI_NODE_PORT_ROW_START + portRows * AI_NODE_PORT_GAP;
  const hasDesc = !compact && Boolean(def.description?.trim());
  const descSectionY = portBlockBottom + 6;
  const previewSectionY = hasDesc
    ? descSectionY + AI_NODE_DESC_SECTION_H
    : descSectionY;
  const hasPreview = !compact && Boolean(def.preview?.enabled);
  const previewH = hasPreview ? AI_NODE_PREVIEW_MAX_H : 0;
  const previewY = previewSectionY + 18;
  const actionsY = nh - AI_NODE_BODY_PAD_BOTTOM - AI_NODE_ACTIONS_H;
  const btnW = (nw - padX * 2 - AI_NODE_ACTIONS_GAP) / 2;
  const descText = (def.description || "").trim();

  const previewW = Math.max(40, nw - padX * 2);

  const previewBox = useMemo(() => {
    const bx = padX;
    const by = previewY;
    const bw = previewW;
    const bh = previewH;
    const pad = 2;
    const innerX = bx + pad;
    const innerY = by + pad;
    const innerW = Math.max(0, bw - pad * 2);
    const innerH = Math.max(0, bh - pad * 2);
    return { bx, by, bw, bh, innerX, innerY, innerW, innerH };
  }, [previewY, previewW, previewH]);

  const previewImgDraw = useMemo(() => {
    if (!previewImg || previewBox.innerW <= 0 || previewBox.innerH <= 0) {
      return null;
    }
    let iw: number | undefined;
    let ih: number | undefined;
    if (previewOut?.type === "image" || previewOut?.type === "mask") {
      const ow = previewOut.width;
      const oh = previewOut.height;
      if (
        typeof ow === "number" &&
        ow > 0 &&
        typeof oh === "number" &&
        oh > 0
      ) {
        iw = ow;
        ih = oh;
      }
    }
    if (!iw || !ih) {
      iw = previewImg.naturalWidth || previewImg.width;
      ih = previewImg.naturalHeight || previewImg.height;
    }
    if (!iw || !ih) return null;
    return previewImageContainRect(
      previewBox.innerX,
      previewBox.innerY,
      previewBox.innerW,
      previewBox.innerH,
      iw,
      ih,
    );
  }, [previewImg, previewOut, previewBox]);

  const titleFont = compact ? 15 : 17;
  const labelFont = compact ? 11 : 13;
  const sectionFont = 12;
  const descFont = 13;

  const statusPill = theme.statusPill(node.status);
  const statusLabel = statusText(node.status);
  const statusPillW = Math.min(88, 24 + statusLabel.length * 12);
  const cardRadius = theme.cardRadius;
  const previewRadius = theme.previewRadius;
  const descRadius = theme.descRadius;
  const [barC1, barC2, barC3] =
    node.status === "running"
      ? ([theme.barRunning[0], theme.barRunning[1], theme.barRunning[1]] as const)
      : selected
        ? theme.accentBar
        : theme.accentBar;

  const showRunBar = def.executor !== "none" || Boolean(def.showRunBar);
  const resultLinkY =
    !compact && node.outputs.result?.type === "image"
      ? actionsY - fs(13) - 6
      : 0;

  const runPrimaryLabel =
    def.type === "output-view"
      ? node.status === "error"
        ? "重试同步"
        : "同步上游预览"
      : node.status === "running"
        ? "运行中…"
        : node.status === "error"
          ? "重试运行"
          : "运行节点";

  return (
    <Group
      id={node.id}
      name="workflow-node"
      x={node.x}
      y={node.y}
      draggable
      onDragStart={() => {
        gestureHistoryDragStart();
        useEditorStore.getState().setFloatingToolbarSuppressed(true);
      }}
      onDragEnd={(e) => {
        try {
          useEditorStore.getState().setFloatingToolbarSuppressed(false);
          updateNode(
            node.id,
            {
              x: e.target.x(),
              y: e.target.y(),
            },
            { history: false },
          );
        } finally {
          gestureHistoryDragEnd();
        }
      }}
      onMouseDown={() => setSel([node.id])}
    >
      {/* 底层柔阴影 */}
      <Rect
        width={nw}
        height={nh}
        cornerRadius={cardRadius}
        fill={theme.bg}
        shadowBlur={selected ? 28 : 18}
        shadowOpacity={selected ? 0.16 : 0.09}
        shadowOffsetX={0}
        shadowOffsetY={selected ? 10 : 6}
        shadowColor={selected ? theme.shadowSelected : theme.shadow}
        listening={false}
      />

      <Group
        clipFunc={(ctx) => clipWorkflowNodeCard(ctx, nw, nh, cardRadius)}
      >
        <Rect
          width={nw}
          height={nh}
          fill={theme.bg}
          cornerRadius={cardRadius}
          stroke={selected ? theme.borderSelected : theme.border}
          strokeWidth={selected ? 1.5 : CARD_STROKE}
          opacity={selected ? 1 : 0.98}
        />

        {/* 顶栏三色渐变条（由父级圆角裁剪贴合卡片顶边） */}
        <Rect
          x={0}
          y={0}
          width={nw}
          height={AI_NODE_TOP_BAR_H}
          fillLinearGradientStartPoint={{ x: 0, y: 0 }}
          fillLinearGradientEndPoint={{ x: nw, y: 0 }}
          fillLinearGradientColorStops={[0, barC1, 0.5, barC2, 1, barC3]}
          listening={false}
        />

      <Text
        text={node.title}
        x={padX}
        y={AI_NODE_TOP_BAR_H + 12}
        width={nw - statusPillW - padX * 2 - 12}
        fontSize={titleFont}
        fill={theme.title}
        fontStyle="bold"
        ellipsis
        wrap="none"
      />

      <Group x={nw - statusPillW - padX} y={AI_NODE_TOP_BAR_H + 10}>
        <Rect
          width={statusPillW}
          height={24}
          fill={statusPill.bg}
          cornerRadius={12}
          stroke={statusPill.stroke}
          strokeWidth={1}
          listening={false}
        />
        <Text
          text={statusLabel}
          x={0}
          y={6}
          width={statusPillW}
          align="center"
          fontSize={12}
          fontStyle="bold"
          fill={statusPill.fg}
          listening={false}
        />
      </Group>

      {Array.from({ length: portRows }, (_, idx) => {
        const rowY = AI_NODE_PORT_ROW_START + idx * AI_NODE_PORT_GAP;
        const inp = def.inputs[idx];
        const out = def.outputs[idx];
        return (
          <Group key={`port-row-${idx}`}>
            {inp && (
              <>
                <PortCircle
                  x={AI_NODE_INPUT_PORT_CX}
                  y={rowY}
                  color={PORT_COLORS[inp.dataType]}
                  stroke={theme.portStroke}
                  onMouseDown={(e) => {
                    e.cancelBubble = true;
                    if (
                      connectingActive &&
                      connectingDataType === inp.dataType
                    ) {
                      completeConn({
                        kind: "ai-node",
                        nodeId: node.id,
                        portId: inp.id,
                      });
                    }
                  }}
                  onMouseUp={(e) => {
                    if (
                      connectingActive &&
                      connectingDataType === inp.dataType
                    ) {
                      e.cancelBubble = true;
                      completeConn({
                        kind: "ai-node",
                        nodeId: node.id,
                        portId: inp.id,
                      });
                    }
                  }}
                />
                {!compact && (
                  <Text
                    text={inp.label}
                    x={AI_NODE_INPUT_PORT_CX + PORT_RADIUS + 8}
                    y={rowY - labelFont * 0.45}
                    fontSize={labelFont}
                    fill={theme.portLabel}
                  />
                )}
              </>
            )}
            {out && (
              <>
                {!compact && (
                  <Text
                    text={out.label}
                    x={padX}
                    y={rowY - labelFont * 0.45}
                    width={nw - padX * 2 - 80}
                    align="right"
                    fontSize={labelFont}
                    fill={theme.portLabel}
                  />
                )}
                <PortCircle
                  x={nw - AI_NODE_OUTPUT_PORT_CX}
                  y={rowY}
                  color={PORT_COLORS[out.dataType]}
                  stroke={theme.portStroke}
                  onMouseDown={(e) => {
                    e.cancelBubble = true;
                    const stage = e.target.getStage();
                    if (!stage) return;
                    const pos = stage.getRelativePointerPosition();
                    if (!pos) return;
                    startConn(
                      { kind: "ai-node", nodeId: node.id, portId: out.id },
                      pos.x,
                      pos.y,
                    );
                  }}
                />
              </>
            )}
          </Group>
        );
      })}

      {hasDesc && (
        <>
          <Text
            text="节点说明"
            x={padX}
            y={descSectionY}
            fontSize={sectionFont}
            fill={theme.sectionLabel}
            listening={false}
          />
          <Rect
            x={padX}
            y={descSectionY + 16}
            width={nw - padX * 2}
            height={52}
            fill={theme.descBg}
            stroke={theme.descBorder}
            strokeWidth={1}
            cornerRadius={descRadius}
            listening={false}
          />
          <Text
            text={descText}
            x={padX + 14}
            y={descSectionY + 28}
            width={nw - padX * 2 - 28}
            height={44}
            fontSize={descFont}
            fill={theme.bodyText}
            wrap="word"
            ellipsis
            listening={false}
          />
        </>
      )}

      {hasPreview && (
        <Text
          text="输出预览"
          x={padX}
          y={previewSectionY}
          fontSize={sectionFont}
          fill={theme.sectionLabel}
          listening={false}
        />
      )}

      {!compact && previewImg && hasPreview && previewH > 0 && (
        <Group>
          <Rect
            x={previewBox.bx}
            y={previewBox.by}
            width={previewBox.bw}
            height={previewBox.bh}
            fillLinearGradientStartPoint={{ x: 0, y: 0 }}
            fillLinearGradientEndPoint={{ x: 0, y: previewBox.bh }}
            fillLinearGradientColorStops={[
              0,
              theme.previewFrom,
              1,
              theme.previewTo,
            ]}
            stroke={theme.previewBorder}
            strokeWidth={1}
            cornerRadius={previewRadius}
          />
          {previewImgDraw && (
            <KonvaImage
              image={previewImg}
              x={previewImgDraw.x}
              y={previewImgDraw.y}
              width={previewImgDraw.w}
              height={previewImgDraw.h}
              cornerRadius={previewRadius}
            />
          )}
        </Group>
      )}

      {!compact && !previewImg && hasPreview && previewH > 0 && (
        <Group>
          <Rect
            x={padX}
            y={previewY}
            width={previewW}
            height={previewH}
            fillLinearGradientStartPoint={{ x: 0, y: 0 }}
            fillLinearGradientEndPoint={{ x: 0, y: previewH }}
            fillLinearGradientColorStops={[
              0,
              theme.previewFrom,
              1,
              theme.previewTo,
            ]}
            stroke={theme.previewBorderDashed}
            strokeWidth={1}
            cornerRadius={previewRadius}
            dash={[6, 5]}
          />
          {node.status === "error" && node.error && (
            <>
              <Rect
                x={16}
                y={previewY + 10}
                width={previewW - 8}
                height={26}
                fill={theme.errorBg}
                cornerRadius={previewRadius}
                stroke={theme.errorBorder}
                strokeWidth={1}
                listening={false}
              />
              <Text
                text={node.error.slice(0, 72)}
                x={22}
                y={previewY + 17}
                width={previewW - 20}
                fontSize={11}
                fill={theme.errorText}
                listening={false}
              />
            </>
          )}
          <Text
            text={
              node.status === "error" && node.error
                ? ""
                : "运行后显示结果图"
            }
            x={padX}
            y={previewY + previewH / 2 - 8}
            width={previewW}
            align="center"
            fontSize={12}
            fill={theme.muted}
            listening={false}
          />
        </Group>
      )}

      {compact && node.status === "error" && node.error && (
        <Text
          text={node.error.slice(0, 56) + (node.error.length > 56 ? "…" : "")}
          x={10}
          y={AI_NODE_HEADER_H + 6}
          width={nw - 20}
          fontSize={10}
          fill={theme.danger}
          listening={false}
        />
      )}

      {!compact && def.type === "output-view" && previewUrl && resultLinkY > 22 && (
        <Group>
          <Text
            text="下载"
            x={12}
            y={resultLinkY - 20}
            fontSize={12}
            fill={theme.linkAlt}
            fontStyle="bold"
            onMouseDown={(e) => {
              e.cancelBubble = true;
              void downloadImageFromUrl(previewUrl);
            }}
          />
          <Text
            text="新窗口"
            x={54}
            y={resultLinkY - 20}
            fontSize={12}
            fill={theme.link}
            onMouseDown={(e) => {
              e.cancelBubble = true;
              window.open(previewUrl, "_blank", "noopener,noreferrer");
            }}
          />
        </Group>
      )}

      {!compact && node.outputs.result?.type === "image" && resultLinkY > 0 && (
        <Text
          text="发送到画布"
          x={12}
          y={resultLinkY}
          fontSize={13}
          fill={theme.link}
          onMouseDown={(e) => {
            e.cancelBubble = true;
            sendCanvas(node.id, "result");
          }}
        />
      )}

      {showRunBar && (
        <Group y={actionsY}>
          <Rect
            x={padX}
            width={btnW}
            height={AI_NODE_ACTIONS_H}
            cornerRadius={14}
            fill={theme.ghostBg}
            stroke={theme.ghostBorder}
            strokeWidth={1}
            onMouseDown={(e) => {
              e.cancelBubble = true;
              setSel([node.id]);
            }}
          />
          {!compact && (
            <Text
              text="配置"
              x={padX}
              y={0}
              width={btnW}
              height={AI_NODE_ACTIONS_H}
              align="center"
              verticalAlign="middle"
              fontSize={14}
              fontStyle="bold"
              fill={theme.ghostText}
              listening={false}
            />
          )}

          <Rect
            x={padX + btnW + AI_NODE_ACTIONS_GAP}
            width={btnW}
            height={AI_NODE_ACTIONS_H}
            cornerRadius={14}
            fillLinearGradientStartPoint={{ x: 0, y: 0 }}
            fillLinearGradientEndPoint={{ x: btnW, y: AI_NODE_ACTIONS_H }}
            fillLinearGradientColorStops={
              node.status === "running"
                ? [0, theme.runDisabledFrom, 1, theme.runDisabledTo]
                : [0, theme.runFrom, 1, theme.runTo]
            }
            shadowBlur={8}
            shadowOpacity={0.22}
            shadowOffsetY={3}
            shadowColor={theme.runShadow}
            onMouseDown={(e) => {
              e.cancelBubble = true;
              void runNode(node.id);
            }}
          />
          {compact ? (
            <Text
              text="▶"
              x={padX + btnW + AI_NODE_ACTIONS_GAP}
              y={0}
              width={btnW}
              height={AI_NODE_ACTIONS_H}
              align="center"
              verticalAlign="middle"
              fontSize={16}
              fill={theme.runLabel}
              listening={false}
            />
          ) : (
            <Text
              text={runPrimaryLabel}
              x={padX + btnW + AI_NODE_ACTIONS_GAP}
              y={0}
              width={btnW}
              height={AI_NODE_ACTIONS_H}
              align="center"
              verticalAlign="middle"
              fontSize={14}
              fontStyle="bold"
              fill={theme.runLabel}
              listening={false}
            />
          )}
        </Group>
      )}
      </Group>
    </Group>
  );
});
