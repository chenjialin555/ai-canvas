import { useMemo } from "react";
import { useEditorStore } from "../editor/store";

const STAGE_W_PAD = 260 + 294;
const STAGE_H_PAD = 48 + 34;

function stageSize() {
  return {
    w: Math.max(400, window.innerWidth - STAGE_W_PAD),
    h: Math.max(300, window.innerHeight - STAGE_H_PAD),
  };
}

export function MiniMap() {
  const { getActivePage, pan, zoom, setPan } = useEditorStore();
  const page = getActivePage();

  const bounds = useMemo(() => {
    const visible = page.elements.filter((el) => el.visible);

    if (!visible.length) {
      return {
        minX: 0,
        minY: 0,
        maxX: 1000,
        maxY: 800,
        width: 1000,
        height: 800,
      };
    }

    const minX = Math.min(...visible.map((el) => el.x));
    const minY = Math.min(...visible.map((el) => el.y));
    const maxX = Math.max(...visible.map((el) => el.x + el.width));
    const maxY = Math.max(...visible.map((el) => el.y + el.height));

    return {
      minX: minX - 200,
      minY: minY - 200,
      maxX: maxX + 200,
      maxY: maxY + 200,
      width: maxX - minX + 400,
      height: maxY - minY + 400,
    };
  }, [page.elements]);

  const miniW = 180;
  const miniH = 120;
  const scale = Math.min(miniW / bounds.width, miniH / bounds.height);
  const { w: stageW, h: stageH } = stageSize();

  return (
    <div className="minimap">
      <div className="minimap-title">小地图</div>

      <div
        className="minimap-stage"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = (e.clientX - rect.left) / scale + bounds.minX;
          const y = (e.clientY - rect.top) / scale + bounds.minY;

          setPan({
            x: stageW / 2 - x * zoom,
            y: stageH / 2 - y * zoom,
          });
        }}
      >
        {page.elements
          .filter((el) => el.visible)
          .map((el) => (
            <div
              key={el.id}
              className={`minimap-item ${el.type}`}
              style={{
                left: (el.x - bounds.minX) * scale,
                top: (el.y - bounds.minY) * scale,
                width: Math.max(2, el.width * scale),
                height: Math.max(2, el.height * scale),
              }}
            />
          ))}

        <div
          className="minimap-viewport"
          style={{
            left: (-pan.x / zoom - bounds.minX) * scale,
            top: (-pan.y / zoom - bounds.minY) * scale,
            width: (stageW / zoom) * scale,
            height: (stageH / zoom) * scale,
          }}
        />
      </div>
    </div>
  );
}
