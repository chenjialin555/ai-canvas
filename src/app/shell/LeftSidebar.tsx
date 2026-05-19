import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { executeElementCommand, useEditorStore } from "@/features/editor";
import { EMPTY_ELEMENTS } from "@/features/editor/store/shallowEqual";

function icon(type: string) {
  if (type === "image") return "🖼";
  if (type === "rect") return "□";
  if (type === "text") return "T";
  if (type === "arrow") return "↗";
  if (type === "group") return "▦";
  return "·";
}

export function LeftSidebar() {
  const pageElements = useEditorStore((s) => {
    const page = s.pages.find((p) => p.id === s.activePageId);
    return page?.elements ?? EMPTY_ELEMENTS;
  });
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const setSelectedIds = useEditorStore((s) => s.setSelectedIds);
  const reorderRootsByStackOrder = useEditorStore(
    (s) => s.reorderRootsByStackOrder,
  );
  const centerViewOnElement = useEditorStore((s) => s.centerViewOnElement);

  const [outlineQuery, setOutlineQuery] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const layerRowRefs = useRef(new Map<string, HTMLDivElement>());

  const elements = useMemo(
    () => [...pageElements].filter((el) => !el.parentId).reverse(),
    [pageElements],
  );

  const filteredElements = useMemo(() => {
    const q = outlineQuery.trim().toLowerCase();
    if (!q) return elements;
    return elements.filter((el) => el.name.toLowerCase().includes(q));
  }, [elements, outlineQuery]);

  const canReorderLayers = outlineQuery.trim() === "";

  useEffect(() => {
    if (selectedIds.length !== 1) return;
    const id = selectedIds[0];
    const row = layerRowRefs.current.get(id);
    row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedIds]);

  const commitRename = useCallback(() => {
    if (!renamingId) return;
    const name = renameDraft.trim() || "未命名";
    executeElementCommand({ type: "renameElement", id: renamingId, name });
    setRenamingId(null);
  }, [renamingId, renameDraft]);

  const onLayerDragEnd = useCallback(() => {
    if (
      !canReorderLayers ||
      !draggingId ||
      !dragOverId ||
      draggingId === dragOverId
    ) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }
    const displayIds = filteredElements.map((e) => e.id);
    const i = displayIds.indexOf(draggingId);
    const j = displayIds.indexOf(dragOverId);
    if (i < 0 || j < 0) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }
    const next = [...displayIds];
    const [item] = next.splice(i, 1);
    next.splice(j, 0, item);
    const stackBottomToTop = [...next].reverse();
    reorderRootsByStackOrder(stackBottomToTop);
    setDraggingId(null);
    setDragOverId(null);
  }, [
    canReorderLayers,
    dragOverId,
    draggingId,
    filteredElements,
    reorderRootsByStackOrder,
  ]);

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
              ref={(node) => {
                if (node) layerRowRefs.current.set(el.id, node);
                else layerRowRefs.current.delete(el.id);
              }}
              draggable={canReorderLayers}
              onDragStart={(e) => {
                if (!canReorderLayers) return;
                setDraggingId(el.id);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", el.id);
              }}
              onDragEnter={() => {
                if (draggingId && draggingId !== el.id) setDragOverId(el.id);
              }}
              onDragEnd={onLayerDragEnd}
              className={`layer-row${
                selectedIds.includes(el.id) ? " selected" : ""
              }${!el.visible ? " layer-row--hidden" : ""}${
                el.locked ? " layer-row--locked" : ""
              }${dragOverId === el.id ? " layer-row--drag-over" : ""}`}
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
              {renamingId === el.id ? (
                <input
                  className="layer-rename-input"
                  value={renameDraft}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitRename();
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setRenamingId(null);
                    }
                  }}
                />
              ) : (
                <span
                  className="layer-name"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setRenamingId(el.id);
                    setRenameDraft(el.name);
                  }}
                >
                  {el.name}
                </span>
              )}

              <button
                type="button"
                className="layer-btn"
                title="在画布中定位"
                aria-label="在画布中定位"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIds([el.id]);
                  centerViewOnElement(el.id);
                }}
              >
                ⊕
              </button>

              <button
                type="button"
                className="layer-btn"
                title={el.locked ? "解锁图层" : "锁定图层"}
                aria-label={el.locked ? "解锁图层" : "锁定图层"}
                aria-pressed={el.locked}
                onClick={(e) => {
                  e.stopPropagation();
                  executeElementCommand({ type: "toggleLock", id: el.id });
                }}
              >
                {el.locked ? "🔒" : "🔓"}
              </button>

              <button
                type="button"
                className="layer-btn"
                title={el.visible ? "隐藏图层" : "显示图层"}
                aria-label={el.visible ? "隐藏图层" : "显示图层"}
                aria-pressed={!el.visible}
                onClick={(e) => {
                  e.stopPropagation();
                  executeElementCommand({ type: "toggleVisible", id: el.id });
                }}
              >
                {el.visible ? "👁" : "🚫"}
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
