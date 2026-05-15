import { useCallback, useRef } from "react";
import { readJSONFile } from "../../editor/export";
import { useEditorStore } from "../../editor/store";

export function useProjectImportExport() {
  const jsonInputRef = useRef<HTMLInputElement | null>(null);
  const loadProjectJSON = useEditorStore((s) => s.loadProjectJSON);

  const importJSON = useCallback(
    async (file: File) => {
      try {
        const data = await readJSONFile(file);
        loadProjectJSON(data);
      } catch {
        alert("JSON 文件格式错误");
      }
    },
    [loadProjectJSON],
  );

  return { jsonInputRef, importJSON };
}
