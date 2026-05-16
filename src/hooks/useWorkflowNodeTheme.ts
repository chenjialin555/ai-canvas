import { useEffect, useState } from "react";
import { UI_THEME_CHANGE_EVENT } from "../lib/uiTheme";
import {
  readWorkflowNodeTheme,
  type WorkflowNodeTheme,
} from "../lib/workflowNodeTheme";

export function useWorkflowNodeTheme(): WorkflowNodeTheme {
  const [theme, setTheme] = useState(() => readWorkflowNodeTheme());

  useEffect(() => {
    const refresh = () => setTheme(readWorkflowNodeTheme());
    window.addEventListener(UI_THEME_CHANGE_EVENT, refresh);
    return () => window.removeEventListener(UI_THEME_CHANGE_EVENT, refresh);
  }, []);

  return theme;
}
