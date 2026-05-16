import { memo, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Circle, Group, Image as KonvaImage, Line, Rect, Text } from "react-konva";
import type Konva from "konva";
import { useEditorStore } from "../../editor/store";
import {
  gestureHistoryDragEnd,
  gestureHistoryDragStart,
} from "../../editor/commands/interactionGestureHistory";
import { getWorkflowNodeDefinition } from "../../workflow/nodeRegistry";
import {
  AI_NODE_HEADER_H,
  AI_NODE_MAX_HEIGHT,
  AI_NODE_MIN_HEIGHT,
  AI_NODE_MIN_WIDTH,
  AI_NODE_PORT_GAP,
  AI_NODE_PORT_ROW_START,
  AI_NODE_PREVIEW_MAX_H,
  aiInputPortCenterLocal,
  aiOutputPortCenterLocal,
} from "../../workflow/nodeLayout";
import { useWorkflowNodeTheme } from "../../hooks/useWorkflowNodeTheme";
import { extFromImageUrl, randomImageFilename } from "../../lib/randomFilename";
import { PORT_COLORS } from "../../workflow/portColors";
import type { WorkflowNode, WorkflowNodeDefinition } from "../../workflow/types";

type Props = {
  nodeId: string;
};

const PORT_RADIUS = 6;
const PORT_GLOW = 4;
const CARD_STROKE = 1;

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

function formatParamSnippets(
  def: WorkflowNodeDefinition,
  params: Record<string, unknown>,
): string[] {
  const lines: string[] = [];
  for (const p of def.params.slice(0, 2)) {
    const raw = params[p.id];
    let val = "—";
    if (raw !== undefined && raw !== null) {
      if (p.type === "boolean") val = raw ? "是" : "否";
      else if (typeof raw === "string")
        val = raw.length > 30 ? `${raw.slice(0, 28)}…` : raw;
      else if (typeof raw === "number") val = String(raw);
      else {
        try {
          const s = JSON.stringify(raw);
          val = s.length > 32 ? `${s.slice(0, 30)}…` : s;
        } catch {
          val = "…";
        }
      }
    }
    lines.push(`${p.label}: ${val}`);
  }
  return lines;
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

  const def = useMemo(
    () => (node ? getWorkflowNodeDefinition(node.type) : null),
    [node?.type],
  );
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

  const nw = node
    ? Math.max(AI_NODE_MIN_WIDTH, safeDim(node.width, AI_NODE_MIN_WIDTH))
    : AI_NODE_MIN_WIDTH;
  const nh = node
    ? Math.min(
        AI_NODE_MAX_HEIGHT,
        Math.max(AI_NODE_MIN_HEIGHT, safeDim(node.height, AI_NODE_MIN_HEIGHT)),
      )
    : AI_NODE_MIN_HEIGHT;

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

  const paramLines = useMemo(
    () => (def && node ? formatParamSnippets(def, node.params) : []),
    [def, node?.params],
  );

  if (!node || !def) return null;

  const compact = zoom < COMPACT_BODY_ZOOM_THRESHOLD;
  const zLay = Math.max(0.45, Math.min(zoom, 4));
  const fs = (screenPx: number) =>
    Math.max(10, Math.min(24, screenPx / zLay));

  const portRows = Math.max(def.inputs.length, def.outputs.length);
  const portBlockBottom = AI_NODE_PORT_ROW_START + portRows * AI_NODE_PORT_GAP;

  const summaryBlockH =
    !compact && def.params.length > 0 ? 36 : !compact ? 10 : 0;
  const summaryTop = portBlockBottom + 4;
  const previewCaptionY = summaryTop + summaryBlockH;

  const footerH = compact ? 44 : 52;
  const runBarH = compact ? 30 : 34;
  const runBarY = nh - footerH + (footerH - runBarH) / 2;

  const previewW = Math.max(40, nw - 24);
  const previewH =
    compact || !def.preview?.enabled
      ? 0
      : Math.min(
          AI_NODE_PREVIEW_MAX_H,
          Math.max(
            64,
            nh - previewCaptionY - 18 - footerH - (node.outputs.result ? 22 : 0),
          ),
        );

  let previewY = previewCaptionY + 16;
  if (!compact && def.preview?.enabled && previewH > 0) {
    if (previewY + previewH > nh - footerH - 8) {
      previewY = Math.max(previewCaptionY + 8, nh - footerH - previewH - 8);
    }
  }

  const previewBox = useMemo(() => {
    const bx = 12;
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

  const titleFont = compact ? 14 : 16;
  const labelFont = compact ? 11 : 12;
  const resultLinkY =
    !compact && node.outputs.result?.type === "image"
      ? runBarY - fs(13) - 8
      : 0;

  const statusPill = theme.statusPill(node.status);
  const statusLabel = statusText(node.status);
  const statusPillW = Math.min(72, 28 + statusLabel.length * 11);
  const cardRadius = theme.cardRadius;
  const previewRadius = theme.previewRadius;
  const topBarStops =
    node.status === "running"
      ? ([0, theme.barRunning[0], 1, theme.barRunning[1]] as const)
      : selected
        ? ([0, theme.barSelected[0], 1, theme.barSelected[1]] as const)
        : ([0, theme.barIdle[0], 1, theme.barIdle[1]] as const);

  const showRunBar = def.executor !== "none" || Boolean(def.showRunBar);
  const runBtnW = nw - 28;

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

      <Rect
        width={nw}
        height={nh}
        fill={theme.bg}
        cornerRadius={cardRadius}
        stroke={selected ? theme.borderSelected : theme.border}
        strokeWidth={selected ? 1.5 : CARD_STROKE}
        opacity={selected ? 1 : 0.98}
      />

      {/* 顶栏渐变条 */}
      <Rect
        x={0}
        y={0}
        width={nw}
        height={3}
        cornerRadius={[cardRadius, cardRadius, 0, 0]}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: nw, y: 0 }}
        fillLinearGradientColorStops={[...topBarStops]}
        listening={false}
      />

      <Rect
        x={0}
        y={3}
        width={nw}
        height={AI_NODE_HEADER_H - 3}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: AI_NODE_HEADER_H }}
        fillLinearGradientColorStops={[0, theme.headerFrom, 1, theme.headerTo]}
        listening={false}
      />

      {node.status === "running" && (
        <Rect
          x={12}
          y={AI_NODE_HEADER_H - 4}
          width={(nw - 24) * 0.42}
          height={3}
          fill={theme.barRunning[1]}
          cornerRadius={2}
          listening={false}
          opacity={0.85}
        />
      )}

      <Line
        points={[0, AI_NODE_HEADER_H, nw, AI_NODE_HEADER_H]}
        stroke={theme.divider}
        strokeWidth={1}
        listening={false}
      />

      <Text
        text={node.title}
        x={12}
        y={10}
        width={nw - 96}
        height={AI_NODE_HEADER_H - 12}
        verticalAlign="middle"
        fontSize={titleFont}
        fill={theme.title}
        fontStyle="bold"
        ellipsis
        wrap="none"
      />

      <Group x={nw - statusPillW - 10} y={AI_NODE_HEADER_H / 2 - 10}>
        <Rect
          width={statusPillW}
          height={20}
          fill={statusPill.bg}
          cornerRadius={10}
          stroke={statusPill.stroke}
          strokeWidth={1}
          listening={false}
        />
        <Circle
          x={10}
          y={10}
          radius={3.5}
          fill={statusPill.dot}
          listening={false}
        />
        <Text
          text={statusLabel}
          x={18}
          y={5}
          width={statusPillW - 22}
          fontSize={10}
          fontStyle="bold"
          fill={statusPill.fg}
          listening={false}
        />
      </Group>

      {def.inputs.map((inp, idx) => {
        const { x: cx, y: cy } = aiInputPortCenterLocal(idx);
        const col = PORT_COLORS[inp.dataType];
        return (
          <Group key={inp.id}>
            <PortCircle
              x={cx}
              y={cy}
              color={col}
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
                x={cx + PORT_RADIUS + 10}
                y={cy - labelFont * 0.45}
                fontSize={labelFont}
                fill={theme.muted}
              />
            )}
          </Group>
        );
      })}

      {def.outputs.map((out, idx) => {
        const { x: cx, y: cy } = aiOutputPortCenterLocal(idx, nw);
        const col = PORT_COLORS[out.dataType];
        return (
          <Group key={out.id}>
            {!compact && (
              <Text
                text={out.label}
                x={cx - 76}
                y={cy - labelFont * 0.45}
                width={68}
                align="right"
                fontSize={labelFont}
                fill={theme.muted}
              />
            )}
            <PortCircle
              x={cx}
              y={cy}
              color={col}
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
          </Group>
        );
      })}

      {!compact &&
        paramLines.map((line, i) => (
          <Text
            key={i}
            text={line}
            x={14}
            y={summaryTop + i * 15}
            width={nw - 28}
            fontSize={11}
            fill={theme.muted}
            ellipsis
            listening={false}
          />
        ))}

      {!compact && def.preview?.enabled && (
        <Text
          text={
            previewUrl
              ? "结果预览"
              : node.status === "error"
                ? ""
                : "等待运行结果"
          }
          x={12}
          y={previewCaptionY}
          fontSize={11}
          fill={theme.muted}
          listening={false}
        />
      )}

      {!compact && previewImg && def.preview?.enabled && previewH > 0 && (
        <Group>
          <Rect
            x={previewBox.bx}
            y={previewBox.by}
            width={previewBox.bw}
            height={previewBox.bh}
            fillLinearGradientStartPoint={{ x: 0, y: 0 }}
            fillLinearGradientEndPoint={{ x: previewBox.bw, y: previewBox.bh }}
            fillLinearGradientColorStops={[
              0,
              theme.previewFrom,
              1,
              theme.previewTo,
            ]}
            stroke={theme.previewBorder}
            strokeWidth={1}
            cornerRadius={previewRadius + 4}
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

      {!compact && !previewImg && def.preview?.enabled && previewH > 0 && (
        <Group>
          <Rect
            x={12}
            y={previewY}
            width={previewW}
            height={previewH}
            fillLinearGradientStartPoint={{ x: 0, y: 0 }}
            fillLinearGradientEndPoint={{ x: previewW, y: previewH }}
            fillLinearGradientColorStops={[
              0,
              theme.previewFrom,
              1,
              theme.previewTo,
            ]}
            stroke={theme.previewBorderDashed}
            strokeWidth={1}
            cornerRadius={previewRadius + 4}
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
            x={12}
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

      <Rect
        x={0}
        y={nh - footerH}
        width={nw}
        height={footerH}
        fill={theme.footerBg}
        cornerRadius={[0, 0, cardRadius, cardRadius]}
        listening={false}
      />
      <Line
        points={[0, nh - footerH, nw, nh - footerH]}
        stroke={theme.divider}
        strokeWidth={1}
        listening={false}
      />

      {showRunBar && (
        <Group y={runBarY}>
          <Rect
            x={14}
            width={runBtnW}
            height={runBarH}
            cornerRadius={runBarH / 2}
            fillLinearGradientStartPoint={{ x: 0, y: 0 }}
            fillLinearGradientEndPoint={{ x: runBtnW, y: runBarH }}
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
              x={14}
              y={0}
              width={nw - 28}
              height={runBarH}
              align="center"
              verticalAlign="middle"
              fontSize={16}
              fill="#fff"
              listening={false}
            />
          ) : (
            <Text
              text={runPrimaryLabel}
              x={14}
              y={0}
              width={nw - 28}
              height={runBarH}
              align="center"
              verticalAlign="middle"
              fontSize={14}
              fontStyle="bold"
              fill="#fff"
              listening={false}
            />
          )}
        </Group>
      )}
    </Group>
  );
});
