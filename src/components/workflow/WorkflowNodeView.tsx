import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Circle, Group, Image as KonvaImage, Line, Rect, Text } from "react-konva";
import { useEditorStore } from "../../editor/store";
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
import { PORT_COLORS } from "../../workflow/portColors";
import type { WorkflowNode, WorkflowNodeDefinition } from "../../workflow/types";

type Props = {
  node: WorkflowNode;
  zoom: number;
};

const PORT_RADIUS = 6;
const CARD_RADIUS = 14;
const CARD_STROKE = 1.5;

const NODE_STYLE = {
  bg: "#ffffff",
  bgSoft: "#f8fbfb",
  border: "#dbe9e9",
  borderSelected: "#35c7c9",
  title: "#0f172a",
  muted: "#64748b",
  accent: "#35c7c9",
  accentSoft: "#e6fbfb",
  danger: "#ef4444",
};

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

function statusDotColor(status: WorkflowNode["status"]): string {
  switch (status) {
    case "running":
      return "#f59e0b";
    case "success":
      return "#22c55e";
    case "error":
      return NODE_STYLE.danger;
    default:
      return "#94a3b8";
  }
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
async function downloadImageFromUrl(url: string, filename: string): Promise<void> {
  const safe =
    filename.replace(/[^\w.\-]+/g, "_").slice(0, 96) || "image";
  const name =
    /\.(png|jpe?g|webp|gif)$/i.test(safe) ? safe : `${safe}.png`;
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

export function WorkflowNodeView(props: Props) {
  const { node, zoom } = props;
  const def = useMemo(() => getWorkflowNodeDefinition(node.type), [node.type]);
  const selected = useEditorStore((s) =>
    s.selectedWorkflowNodeIds.includes(node.id),
  );
  const updateNode = useEditorStore((s) => s.updateWorkflowNode);
  const setSel = useEditorStore((s) => s.setSelectedWorkflowNodeIds);
  const startConn = useEditorStore((s) => s.startWorkflowConnecting);
  const completeConn = useEditorStore((s) => s.completeWorkflowConnectingToInput);
  const connecting = useEditorStore((s) => s.workflowConnecting);
  const runNode = useEditorStore((s) => s.runWorkflowNode);
  const sendCanvas = useEditorStore((s) => s.sendWorkflowResultToCanvas);

  const nw = Math.max(AI_NODE_MIN_WIDTH, safeDim(node.width, AI_NODE_MIN_WIDTH));
  const nh = Math.min(
    AI_NODE_MAX_HEIGHT,
    Math.max(AI_NODE_MIN_HEIGHT, safeDim(node.height, AI_NODE_MIN_HEIGHT)),
  );

  useLayoutEffect(() => {
    const rw = Math.round(node.width);
    const rh = Math.round(node.height);
    if (rw !== Math.round(nw) || rh !== Math.round(nh)) {
      updateNode(node.id, { width: nw, height: nh }, { history: false });
    }
  }, [node.id, node.width, node.height, nw, nh, updateNode]);

  const previewKey = def.preview?.outputKey ?? "result";
  const previewOut = node.outputs[previewKey];
  const previewUrl =
    previewOut?.type === "image" || previewOut?.type === "mask"
      ? previewOut.url
      : undefined;
  const previewImg = useHtmlImage(previewUrl);

  const paramLines = useMemo(
    () => formatParamSnippets(def, node.params),
    [def, node.params],
  );

  const stroke = selected ? NODE_STYLE.borderSelected : NODE_STYLE.border;
  const compact = zoom < 0.45;
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

  const topStripFill =
    node.status === "running"
      ? "#fcd34d"
      : selected
        ? NODE_STYLE.borderSelected
        : NODE_STYLE.border;

  const showRunBar = def.executor !== "none" || Boolean(def.showRunBar);

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
      x={node.x}
      y={node.y}
      draggable
      onDragStart={() => {
        useEditorStore.getState().commitHistory();
        useEditorStore.getState().setFloatingToolbarSuppressed(true);
      }}
      onDragEnd={(e) => {
        useEditorStore.getState().setFloatingToolbarSuppressed(false);
        updateNode(
          node.id,
          {
            x: e.target.x(),
            y: e.target.y(),
          },
          { history: false },
        );
      }}
      onMouseDown={() => setSel([node.id])}
    >
      <Rect
        width={nw}
        height={nh}
        fill={NODE_STYLE.bg}
        cornerRadius={CARD_RADIUS}
        stroke={stroke}
        strokeWidth={CARD_STROKE}
        shadowBlur={selected ? 20 : 12}
        shadowOpacity={selected ? 0.22 : 0.12}
        shadowOffsetX={0}
        shadowOffsetY={6}
        shadowColor="rgba(15,23,42,0.2)"
      />

      <Rect
        x={0}
        y={0}
        width={nw}
        height={5}
        fill={topStripFill}
        cornerRadius={[CARD_RADIUS, CARD_RADIUS, 0, 0]}
      />

      {node.status === "running" && (
        <Rect
          x={12}
          y={AI_NODE_HEADER_H - 3}
          width={(nw - 24) * 0.42}
          height={3}
          fill="#f59e0b"
          cornerRadius={2}
          listening={false}
        />
      )}

      <Rect
        x={0}
        y={5}
        width={nw}
        height={AI_NODE_HEADER_H - 5}
        fill="#f9fcfc"
      />

      <Line
        points={[0, AI_NODE_HEADER_H, nw, AI_NODE_HEADER_H]}
        stroke="#e2efef"
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
        fill={NODE_STYLE.title}
        fontStyle="bold"
        ellipsis
        wrap="none"
      />

      <Group x={nw - 76} y={AI_NODE_HEADER_H / 2 - 2}>
        <Circle
          x={0}
          y={0}
          radius={4}
          fill={statusDotColor(node.status)}
          stroke="#fff"
          strokeWidth={1}
          listening={false}
        />
        <Text
          text={statusText(node.status)}
          x={10}
          y={-7}
          width={56}
          fontSize={10}
          fill={NODE_STYLE.muted}
          listening={false}
        />
      </Group>

      {def.inputs.map((inp, idx) => {
        const { x: cx, y: cy } = aiInputPortCenterLocal(idx);
        const col = PORT_COLORS[inp.dataType];
        return (
          <Group key={inp.id}>
            <Circle
              x={cx}
              y={cy}
              radius={PORT_RADIUS}
              fill={col}
              stroke="#fff"
              strokeWidth={1.5}
              onMouseDown={(e) => {
                e.cancelBubble = true;
                if (
                  connecting.active &&
                  connecting.dataType === inp.dataType
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
                  connecting.active &&
                  connecting.dataType === inp.dataType
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
                x={cx + PORT_RADIUS + 8}
                y={cy - labelFont * 0.45}
                fontSize={labelFont}
                fill="#475569"
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
                fill="#475569"
              />
            )}
            <Circle
              x={cx}
              y={cy}
              radius={PORT_RADIUS}
              fill={col}
              stroke="#fff"
              strokeWidth={1.5}
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
            fill="#334155"
            ellipsis
            listening={false}
          />
        ))}

      {!compact && def.preview?.enabled && (
        <Text
          text={previewUrl ? "结果预览" : "等待运行结果"}
          x={12}
          y={previewCaptionY}
          fontSize={11}
          fill={NODE_STYLE.muted}
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
            fill={NODE_STYLE.bgSoft}
            stroke="#e2efef"
            strokeWidth={1}
            cornerRadius={10}
          />
          {previewImgDraw && (
            <KonvaImage
              image={previewImg}
              x={previewImgDraw.x}
              y={previewImgDraw.y}
              width={previewImgDraw.w}
              height={previewImgDraw.h}
              cornerRadius={6}
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
            fill={NODE_STYLE.bgSoft}
            stroke="#e2efef"
            strokeWidth={1}
            cornerRadius={10}
            dash={[4, 4]}
          />
          <Text
            text="运行后显示结果图"
            x={12}
            y={previewY + previewH / 2 - 8}
            width={previewW}
            align="center"
            fontSize={12}
            fill="#94a3b8"
            listening={false}
          />
        </Group>
      )}

      {!compact && node.status === "error" && node.error && (
        <Text
          text={node.error.slice(0, 100)}
          x={12}
          y={Math.min(previewY - 4, nh - footerH - 40)}
          width={nw - 24}
          fontSize={12}
          fill={NODE_STYLE.danger}
        />
      )}

      {!compact && def.type === "output-view" && previewUrl && resultLinkY > 22 && (
        <Group>
          <Text
            text="下载"
            x={12}
            y={resultLinkY - 20}
            fontSize={12}
            fill="#0f766e"
            fontStyle="bold"
            onMouseDown={(e) => {
              e.cancelBubble = true;
              void downloadImageFromUrl(previewUrl, `workflow-${node.id}`);
            }}
          />
          <Text
            text="新窗口"
            x={54}
            y={resultLinkY - 20}
            fontSize={12}
            fill="#2563eb"
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
          fill="#2563eb"
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
        fill={NODE_STYLE.accentSoft}
        cornerRadius={[0, 0, CARD_RADIUS, CARD_RADIUS]}
        listening={false}
      />
      <Line
        points={[0, nh - footerH, nw, nh - footerH]}
        stroke="#dceaea"
        strokeWidth={1}
        listening={false}
      />

      {showRunBar && (
        <Group y={runBarY}>
          <Rect
            x={14}
            width={nw - 28}
            height={runBarH}
            fill={node.status === "running" ? "#94a3b8" : NODE_STYLE.accent}
            cornerRadius={10}
            shadowBlur={selected ? 10 : 0}
            shadowOpacity={0.14}
            shadowColor="rgba(15,23,42,0.25)"
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
}
