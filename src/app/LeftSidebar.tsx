import { useMemo, useState } from "react";
import { useEditorStore } from "../editor/store";
import type { CanvasElement } from "../editor/types";

function icon(type: string) {
  if (type === "image") return "🖼";
  if (type === "rect") return "□";
  if (type === "text") return "T";
  if (type === "arrow") return "↗";
  if (type === "group") return "▦";
  return "·";
}

export function LeftSidebar() {
  const pageElements = useEditorStore(
    (s) => s.pages.find((p) => p.id === s.activePageId)?.elements ?? [],
  );
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const setSelectedIds = useEditorStore((s) => s.setSelectedIds);
  const updateElement = useEditorStore((s) => s.updateElement);

  const [outlineQuery, setOutlineQuery] = useState("");

  const elements = useMemo(
    () => [...pageElements].filter((el) => !el.parentId).reverse(),
    [pageElements],
  );

  const filteredElements = useMemo(() => {
    const q = outlineQuery.trim().toLowerCase();
    if (!q) return elements;
    return elements.filter((el) => el.name.toLowerCase().includes(q));
  }, [elements, outlineQuery]);

  return (
    <aside className="left-panel">
      <div className="project-head">
        <strong>项目管理</strong>
      </div>

      <div className="outline-head">
        <span>大纲</span>
      </div>

      <input
        className="search"
        placeholder="搜索元素..."
        value={outlineQuery}
        onChange={(e) => setOutlineQuery(e.target.value)}
        aria-label="按名称筛选图层"
      />

      <div className="layers">
        {filteredElements.length === 0 ? (
          <p className="outline-empty">
            {elements.length === 0 ? "暂无图层" : "无匹配图层"}
          </p>
        ) : (
          filteredElements.map((el) => (
            <div
              key={el.id}
              className={`layer-row ${
                selectedIds.includes(el.id) ? "selected" : ""
              }`}
              onClick={(e) => {
                if (e.shiftKey) {
                  if (selectedIds.includes(el.id)) {
                    setSelectedIds(selectedIds.filter((id) => id !== el.id));
                  } else {
                    setSelectedIds([...selectedIds, el.id]);
                  }
                } else {
                  setSelectedIds([el.id]);
                }
              }}
            >
              <span>{icon(el.type)}</span>
              <span className="layer-name">{el.name}</span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateElement(el.id, {
                    locked: !el.locked,
                  } as Partial<CanvasElement>);
                }}
              >
                {el.locked ? "锁" : "开"}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateElement(el.id, {
                    visible: !el.visible,
                  } as Partial<CanvasElement>);
                }}
              >
                {el.visible ? "显" : "隐"}
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
