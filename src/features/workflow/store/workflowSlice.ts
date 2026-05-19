import { produce } from "immer";
import { nanoid } from "nanoid";
import type { Store } from "../../../features/editor/store/types";
import type { StoreGet, StoreSet } from "../../../features/editor/store/sliceTypes";
import { endpointKey } from "../utils/workflowEndpoint";
import { getWorkflowNodeDefinition } from "../model/nodeRegistry";
import { createWorkflowNode } from "../utils/createNode";
import { serializeWorkflowInputsForApi } from "../utils/runPayload";
import type { NodeEdge, NodeEndpoint, WorkflowNode } from "../model/types";
import { executeWorkflowNodeRemoteRun } from "../services/workflowRunner";
import { sendWorkflowImageResultToCanvas } from "../services/workflowResultToCanvas";
import {
  clampAiNodeDimensions,
  findFirstCompatibleInputPort,
  getOutgoingDataType,
  resolveAiNodeInputs,
} from "../utils/unifiedGraph";

export function createWorkflowSlice(set: StoreSet, get: StoreGet) {
  return {
    addWorkflowNode: (node: WorkflowNode) => {
      get().commitHistory();
      set(
        produce<Store>((state) => {
          const page = state.pages.find((p) => p.id === state.activePageId);
          if (!page) return;
          page.aiNodes.push(clampAiNodeDimensions(node));
        }),
      );
    },

    updateWorkflowNode: (
      nodeId: string,
      patch: Partial<WorkflowNode>,
      options?: { history?: boolean },
    ) => {
      if (options?.history !== false) get().commitHistory();
      set(
        produce<Store>((state) => {
          const page = state.pages.find((p) => p.id === state.activePageId);
          const node = page?.aiNodes.find((n) => n.id === nodeId);
          if (!node) return;
          Object.assign(node, patch, { updatedAt: Date.now() });
          const c = clampAiNodeDimensions(node);
          node.width = c.width;
          node.height = c.height;
        }),
      );
    },

    removeWorkflowNode: (nodeId: string) => {
      get().commitHistory();
      set(
        produce<Store>((state) => {
          const page = state.pages.find((p) => p.id === state.activePageId);
          if (!page) return;
          page.aiNodes = page.aiNodes.filter((n) => n.id !== nodeId);
          page.edges = page.edges.filter((e) => {
            if (e.from.kind === "ai-node" && e.from.nodeId === nodeId) {
              return false;
            }
            if (e.to.kind === "ai-node" && e.to.nodeId === nodeId) {
              return false;
            }
            return true;
          });
          state.selectedWorkflowNodeIds = state.selectedWorkflowNodeIds.filter(
            (id) => id !== nodeId,
          );
        }),
      );
    },

    addWorkflowEdge: (edge: NodeEdge) => {
      get().commitHistory();
      set(
        produce<Store>((state) => {
          const page = state.pages.find((p) => p.id === state.activePageId);
          if (!page) return;
          if (
            page.edges.some(
              (e) =>
                endpointKey(e.from) === endpointKey(edge.from) &&
                endpointKey(e.to) === endpointKey(edge.to),
            )
          ) {
            return;
          }
          page.edges.push(edge);
        }),
      );
    },

    removeWorkflowEdge: (edgeId: string) => {
      get().commitHistory();
      set(
        produce<Store>((state) => {
          const page = state.pages.find((p) => p.id === state.activePageId);
          if (!page) return;
          page.edges = page.edges.filter((e) => e.id !== edgeId);
        }),
      );
    },

    startWorkflowConnecting: (
      from: NodeEndpoint,
      pointerX: number,
      pointerY: number,
    ) => {
      const page = get().getActivePage();
      const dt = getOutgoingDataType(from, page);
      if (!dt) return;
      set({
        workflowConnecting: {
          active: true,
          from,
          dataType: dt,
          pointerX,
          pointerY,
        },
      });
    },

    updateWorkflowConnectingPointer: (pointerX: number, pointerY: number) => {
      const c = get().workflowConnecting;
      if (!c.active) return;
      set({
        workflowConnecting: {
          ...c,
          pointerX,
          pointerY,
        },
      });
    },

    cancelWorkflowConnecting: () =>
      set({
        workflowConnecting: {
          active: false,
          from: null,
          dataType: null,
          pointerX: 0,
          pointerY: 0,
        },
      }),

    completeWorkflowConnectingToInput: (to: NodeEndpoint) => {
      const c = get().workflowConnecting;
      if (!c.active || !c.from || !c.dataType) return;
      if (to.kind !== "ai-node") return;

      const page = get().getActivePage();
      const node = page.aiNodes.find((n) => n.id === to.nodeId);
      if (!node) return;
      const def = getWorkflowNodeDefinition(node.type);
      const inp = def.inputs.find((i) => i.id === to.portId);
      if (!inp || inp.dataType !== c.dataType) return;

      const fromEp = c.from;

      const dup = page.edges.some(
        (ex) =>
          endpointKey(ex.from) === endpointKey(fromEp) &&
          endpointKey(ex.to) === endpointKey(to),
      );
      if (dup) {
        get().cancelWorkflowConnecting();
        return;
      }

      get().commitHistory();
      set(
        produce<Store>((state) => {
          const pg = state.pages.find((p) => p.id === state.activePageId);
          if (!pg) return;
          if (!inp.multiple) {
            pg.edges = pg.edges.filter(
              (e) =>
                !(
                  e.to.kind === "ai-node" &&
                  e.to.nodeId === to.nodeId &&
                  e.to.portId === to.portId
                ),
            );
          }
          pg.edges.push({
            id: nanoid(),
            from: fromEp,
            to,
            dataType: c.dataType!,
            createdAt: Date.now(),
          });
        }),
      );
      get().cancelWorkflowConnecting();
    },

    openWorkflowNodePicker: (x: number, y: number) => {
      const c = get().workflowConnecting;
      set({
        workflowNodePicker: {
          open: true,
          x,
          y,
          from: c.from ?? undefined,
          dataType: c.dataType ?? undefined,
        },
        workflowConnecting: {
          active: false,
          from: null,
          dataType: null,
          pointerX: 0,
          pointerY: 0,
        },
      });
    },

    openWorkflowNodePickerAtWorld: (x: number, y: number) => {
      set({
        workflowConnecting: {
          active: false,
          from: null,
          dataType: null,
          pointerX: 0,
          pointerY: 0,
        },
        workflowNodePicker: {
          open: true,
          x,
          y,
        },
      });
    },

    closeWorkflowNodePicker: () =>
      set({
        workflowNodePicker: {
          open: false,
          x: 0,
          y: 0,
        },
      }),

    createWorkflowNodeFromPicker: (type: string) => {
      const pick = get().workflowNodePicker;
      const conn = get().workflowConnecting;
      const pageBefore = get().getActivePage();
      const edgesBefore = pageBefore.edges;

      get().commitHistory();
      const newNode = createWorkflowNode(type, pick.x - 40, pick.y - 20);
      const edgeToAdd: NodeEdge | null = (() => {
        const from = pick.from ?? conn.from;
        if (!from) return null;
        const dt = pick.dataType ?? conn.dataType;
        if (!dt) return null;
        const def = getWorkflowNodeDefinition(type);
        const slot = findFirstCompatibleInputPort(
          def,
          dt,
          edgesBefore,
          newNode.id,
        );
        if (!slot) return null;
        return {
          id: nanoid(),
          from,
          to: {
            kind: "ai-node" as const,
            nodeId: newNode.id,
            portId: slot.portId,
          },
          dataType: dt,
          createdAt: Date.now(),
        };
      })();

      set(
        produce<Store>((state) => {
          const page = state.pages.find((p) => p.id === state.activePageId);
          if (!page) return;
          page.aiNodes.push(clampAiNodeDimensions(newNode));
          if (edgeToAdd) page.edges.push(edgeToAdd);
          state.selectedWorkflowNodeIds = [newNode.id];
        }),
      );

      get().cancelWorkflowConnecting();
      get().closeWorkflowNodePicker();
    },

    runWorkflowNode: async (nodeId: string) => {
      const page = get().getActivePage();
      const node = page.aiNodes.find((n) => n.id === nodeId);
      if (!node) return;
      const def = getWorkflowNodeDefinition(node.type);

      /** 客户端同步：把上游连线上的图像写入本节点 outputs，不请求后端 */
      if (node.type === "output-view") {
        try {
          const inputs = resolveAiNodeInputs(nodeId, page);
          const src = inputs.source;
          if (
            !src ||
            typeof src !== "object" ||
            (src as { type?: string }).type !== "image"
          ) {
            throw new Error("请先连接上游「图像」输出端口");
          }
          const img = src as {
            type: "image";
            url: string;
            width?: number;
            height?: number;
          };
          if (!img.url) throw new Error("上游图像缺少 url");
          get().updateWorkflowNode(
            nodeId,
            {
              status: "success",
              outputs: {
                result: {
                  type: "image",
                  url: img.url,
                  width: img.width,
                  height: img.height,
                },
              },
              error: undefined,
              updatedAt: Date.now(),
            },
            { history: false },
          );
          get().commitHistory();
        } catch (e) {
          get().updateWorkflowNode(
            nodeId,
            {
              status: "error",
              error: e instanceof Error ? e.message : String(e),
            },
            { history: false },
          );
        }
        return;
      }

      if (def.executor === "none") return;

      let inputsSerialized: Record<string, unknown>;
      try {
        inputsSerialized = await serializeWorkflowInputsForApi(nodeId, page);
      } catch (e) {
        get().updateWorkflowNode(
          nodeId,
          {
            status: "error",
            error: e instanceof Error ? e.message : String(e),
          },
          { history: false },
        );
        return;
      }

      get().updateWorkflowNode(
        nodeId,
        { status: "running", error: undefined },
        { history: false },
      );

      const result = await executeWorkflowNodeRemoteRun(node, inputsSerialized);
      if (!result.ok) {
        get().updateWorkflowNode(
          nodeId,
          {
            status: "error",
            error: result.message,
          },
          { history: false },
        );
        return;
      }

      get().updateWorkflowNode(
        nodeId,
        {
          status: "success",
          outputs: result.outputs as WorkflowNode["outputs"],
          updatedAt: Date.now(),
        },
        { history: false },
      );
      get().commitHistory();
    },

    sendWorkflowResultToCanvas: (nodeId: string, outputKey = "result") => {
      const page = get().getActivePage();
      const node = page.aiNodes.find((n) => n.id === nodeId);
      void sendWorkflowImageResultToCanvas({
        node,
        outputKey,
        addElement: get().addElement,
      });
    },
  };
}
