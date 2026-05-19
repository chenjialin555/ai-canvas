import { useCallback, useRef, useState } from "react";
import { readJSONFile, useEditorStore } from "@/features/editor";
import type { ProjectJSON } from "@/features/editor/types";
import { isComfyWorkflowJSON } from "@/features/workflow";

export function useProjectImportExport() {
  const jsonInputRef = useRef<HTMLInputElement | null>(null);
  const [jsonWorkflowBusy, setJsonWorkflowBusy] = useState(false);
  const loadProjectJSON = useEditorStore((s) => s.loadProjectJSON);

  const importJSON = useCallback(
    async (file: File) => {
      setJsonWorkflowBusy(true);
      try {
        const data = await readJSONFile(file);
        if (isComfyWorkflowJSON(data)) {
          alert(
            "这是 ComfyUI 原生工作流（nodes/links）。请使用本应用导出的「json 工作流」文件（含 pages 字段）。",
          );
          return;
        }
        if (!isProjectJSON(data)) {
          alert("JSON 文件格式错误：需要包含 pages 数组");
          return;
        }
        await loadProjectJSON(data);
      } catch (e) {
        alert(
          e instanceof Error
            ? `导入 json 工作流失败：${e.message}`
            : "导入 json 工作流失败",
        );
      } finally {
        setJsonWorkflowBusy(false);
      }
    },
    [loadProjectJSON],
  );

  return { jsonInputRef, importJSON, jsonWorkflowBusy };
}

function isProjectJSON(data: unknown): data is ProjectJSON {
  return (
    !!data &&
    typeof data === "object" &&
    Array.isArray((data as ProjectJSON).pages) &&
    (data as ProjectJSON).pages.length > 0
  );
}
