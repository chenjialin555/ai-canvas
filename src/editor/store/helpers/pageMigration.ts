import { nanoid } from "nanoid";
import type { Page } from "../../types";
import {
  clampAiNodeDimensions,
  migrateLegacyWorkflowGraph,
} from "../../../workflow/utils/unifiedGraph";

export function migratePage(p: Page): Page {
  const elements = p.elements;
  let aiNodes = p.aiNodes ?? [];
  let edges = p.edges ?? [];

  if (p.workflow?.nodes?.length) {
    const m = migrateLegacyWorkflowGraph(p.workflow, elements);
    aiNodes = m.aiNodes;
    edges = m.edges;
  }

  const { workflow: _wf, aiNodes: _a0, edges: _e0, ...rest } = p;
  return {
    ...rest,
    elements,
    aiNodes: aiNodes.map((n) => clampAiNodeDimensions(n)),
    edges,
  };
}

export function makeDefaultPage(): Page {
  return {
    id: nanoid(),
    name: "页面 1",
    elements: [],
    aiNodes: [],
    edges: [],
  };
}
