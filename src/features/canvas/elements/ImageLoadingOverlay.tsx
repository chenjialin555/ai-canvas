import { useEffect, useRef } from "react";
import Konva from "konva";
import { Arc, Circle, Group, Rect, Text } from "react-konva";

type ImageLoadingOverlayProps = {
  width: number;
  height: number;
  cornerRadius?: number;
};

/** 远程图片加载中的 Konva 占位动画 */
export function ImageLoadingOverlay(props: ImageLoadingOverlayProps) {
  const { width, height, cornerRadius = 0 } = props;
  const spinnerRef = useRef<Konva.Arc>(null);

  useEffect(() => {
    const node = spinnerRef.current;
    if (!node) return;

    const anim = new Konva.Animation((frame) => {
      node.rotation(((frame?.time ?? 0) / 12) % 360);
    }, node.getLayer() ?? undefined);

    anim.start();
    return () => {
      anim.stop();
    };
  }, []);

  const size = Math.min(width, height);
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.max(10, Math.min(size * 0.1, 26));
  const labelW = 72;

  return (
    <Group listening={false}>
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="rgba(243, 244, 246, 0.92)"
        cornerRadius={cornerRadius}
        listening={false}
      />
      <Circle
        x={cx}
        y={cy}
        radius={r}
        stroke="#e5e7eb"
        strokeWidth={3}
        listening={false}
      />
      <Arc
        ref={spinnerRef}
        x={cx}
        y={cy}
        innerRadius={r - 3}
        outerRadius={r}
        angle={270}
        rotation={0}
        fill="#42c4c4"
        listening={false}
      />
      <Text
        x={cx - labelW / 2}
        y={cy + r + 10}
        width={labelW}
        align="center"
        text="加载中…"
        fontSize={12}
        fill="#6b7280"
        listening={false}
      />
    </Group>
  );
}
