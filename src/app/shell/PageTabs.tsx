import { useEditorStore } from "@/features/editor";

export function PageTabs() {
  const {
    pages,
    activePageId,
    setActivePageId,
    addPage,
    duplicatePage,
    removePage,
    renamePage,
  } = useEditorStore();

  return (
    <div className="tabs">
      {pages.map((p) => (
        <button
          key={p.id}
          type="button"
          className={p.id === activePageId ? "active" : ""}
          onClick={() => setActivePageId(p.id)}
          onDoubleClick={() => {
            const name = prompt("页面名称", p.name);
            if (name) renamePage(p.id, name);
          }}
        >
          {p.name}
        </button>
      ))}

      <button type="button" onClick={() => addPage()}>
        +
      </button>

      {pages.length > 1 && (
        <button type="button" onClick={() => removePage(activePageId)}>
          删页
        </button>
      )}

      <button type="button" onClick={() => duplicatePage(activePageId)}>
        复制页
      </button>
    </div>
  );
}
