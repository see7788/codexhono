import dagre from "@dagrejs/dagre";
import { hc } from "hono/client";
import immerStateCreator from "extendszustand-lib/src/immerStateCreator";
import {
  Position,
  type Edge,
  type IsValidConnection,
  type OnConnect,
  type OnConnectStart,
  type OnEdgesChange,
  type OnEdgesDelete,
  type OnReconnect,
} from "@xyflow/react";
import type chatRouter from "honoapp/src/chat";

type Direction = "horizontal" | "vertical";
type NodeState = {
  parentId?: string;
  data: string;
};
type NodesState = Record<string, NodeState>;
type Point = { x: number; y: number };
type ConnectionStart = { handleId: string | null; nodeId: string | null };
type Start = Parameters<OnConnectStart>[1];
type Conn = Parameters<OnConnect>[0];
type EdgeChanges = Parameters<OnEdgesChange<Edge>>[0];
type EdgeDels = Parameters<OnEdgesDelete<Edge>>[0];
type DrawerChatTarget = "llm.openai" | "agent.draw" | "agent.codexcli";
type GraphOperation =
  | { id: string; text: string; type: "node.text" }
  | { id: string; text: string; type: "node.replace" }
  | { parentId?: string; text: string; type: "node.add" }
  | { id: string; parentId?: string; type: "node.move" }
  | { id: string; type: "node.delete" };
type DrawEvent =
  | { text: string; type: "message" }
  | { operation: GraphOperation; type: "operation" }
  | { message: string; type: "error" }
  | { type: "done" };

type Store = {
  connectionStart?: ConnectionStart;
  drawerChatTarget: DrawerChatTarget;
  drawerNodeId?: string;
  drawerSize?: number;
  drawerText: string;
  hookPushReceive: boolean;
  layoutDirection: Direction;
  mainColor: [string, string];
  maxId: string;
  nodesState: NodesState;
  positions: Record<string, Point>;
  selectedEdgeIds: Record<string, true>;
  streamingNodeIds: Record<string, true>;
  targetId: string;
  connectionEnd: () => void;
  connectionStartBegin: (p: Start) => void;
  connectionValid: IsValidConnection;
  drawerClose: () => void;
  drawerChatTargetChange: (target: DrawerChatTarget) => void;
  drawerNodeOpen: (id: string) => void;
  drawerNodeToggle: (id: string) => void;
  drawerSizeChange: (size: number) => void;
  drawerTextChange: (text: string) => void;
  edgeReconnect: OnReconnect<Edge>;
  edgeSelectionChange: (changes: EdgeChanges) => void;
  edgesDelete: (edges: EdgeDels) => void;
  hookMessageReceive: (message: { text: string; stop?: boolean }) => void;
  hookPushReceiveToggle: () => void;
  layoutDirectionChange: (direction: Direction) => void;
  nodeAdd: (text?: string) => void;
  nodeBranchDelete: (id?: string) => void;
  nodeAgentDraw: (text?: string) => Promise<void>;
  nodeChat: (prompt: string) => Promise<void>;
  nodeLlmOpenai: (text?: string) => Promise<void>;
  nodeAgentCodexcli: (text?: string) => Promise<void>;
  nodeConnect: (c: Conn) => void;
  nodeDelete: (id?: string) => void;
  nodeSelect: (node: { id: string } | string) => void;
  nodeTextChange: (text: string, id?: string) => void;
  viewReset: () => void;
};

const emptyText = "Empty node";
const llmOpenaiPendingText = "llm.openai 正在思考...";
const agentCodexcliPendingText = "agent.codexcli 正在思考...";
const streamPendingTexts = [llmOpenaiPendingText, agentCodexcliPendingText];
const childHandle = "child";
const parentHandle = "parent";
const nodeTextRows = 2;
const nodeTextLineHeight = 20;
const nodeHeight = nodeTextLineHeight * nodeTextRows;
const nodeWidth = 178;
const layoutPadding = {
  x: 24,
  y: 56,
};
const layoutOptions: Record<Direction, {
  childHandlePosition: Position;
  nodesep: number;
  parentHandlePosition: Position;
  rankdir: "LR" | "TB";
  ranksep: number;
}> = {
  horizontal: {
    childHandlePosition: Position.Left,
    nodesep: 30,
    parentHandlePosition: Position.Right,
    rankdir: "LR",
    ranksep: 80,
  },
  vertical: {
    childHandlePosition: Position.Top,
    nodesep: 30,
    parentHandlePosition: Position.Bottom,
    rankdir: "TB",
    ranksep: 100,
  },
};

function firstNodeIdGet(nodes: NodesState) {
  return Object.keys(nodes).sort((a, b) => Number(a) - Number(b))[0];
}

function connectionGet(c: {
  source?: string | null;
  sourceHandle?: string | null;
  target?: string | null;
  targetHandle?: string | null;
}) {
  if (!c.source || !c.target || c.source === c.target) return undefined;
  if (c.sourceHandle === parentHandle && c.targetHandle === childHandle) {
    return { childId: c.target, parentId: c.source };
  }
  if (c.sourceHandle === childHandle && c.targetHandle === parentHandle) {
    return { childId: c.source, parentId: c.target };
  }
  return undefined;
}

function connectionCan(parentId: string, childId: string, nodes: NodesState) {
  if (childId === parentId) return false;
  if (!nodes[parentId]) return false;
  const child = nodes[childId];
  if (!child || child.parentId) return false;
  for (let id: string | undefined = parentId; id !== undefined;) {
    if (id === childId) return false;
    id = nodes[id]?.parentId;
  }
  return true;
}

function nodeMoveCan(parentId: string, nodeId: string, nodes: NodesState) {
  if (parentId === nodeId) return false;
  if (!nodes[parentId]) return false;
  for (let id: string | undefined = parentId; id !== undefined;) {
    if (id === nodeId) return false;
    id = nodes[id]?.parentId;
  }
  return true;
}

function positionsGet(dir: Direction, nodes: NodesState) {
  const graph = new dagre.graphlib.Graph();
  const layout = layoutOptions[dir];
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    nodesep: layout.nodesep,
    rankdir: layout.rankdir,
    ranksep: layout.ranksep,
  });
  for (const id of Object.keys(nodes)) {
    graph.setNode(id, {
      height: nodeHeight,
      width: nodeWidth,
    });
  }
  for (const [id, node] of Object.entries(nodes)) {
    if (node.parentId && nodes[node.parentId]) graph.setEdge(node.parentId, id);
  }
  dagre.layout(graph);
  const positions = Object.fromEntries(Object.keys(nodes).map(id => {
    const node = graph.node(id);
    return [id, {
      x: node.x - nodeWidth / 2,
      y: node.y - nodeHeight / 2,
    }];
  }));
  const values = Object.values(positions);
  const minX = Math.min(...values.map(pos => pos.x));
  const minY = Math.min(...values.map(pos => pos.y));
  return Object.fromEntries(Object.entries(positions).map(([id, pos]) => [id, {
    x: pos.x - minX + layoutPadding.x,
    y: pos.y - minY + layoutPadding.y,
  }]));
}

function positionsNextGet(
  dir: Direction,
  nodes: NodesState,
  positions: Record<string, Point>,
) {
  const nextPositions = Object.fromEntries(
    Object.entries(positions).filter(([id]) => nodes[id]),
  );
  const missing = Object.keys(nodes).filter(id => !(id in nextPositions));
  if (!missing.length) return nextPositions;
  const layoutPositions = positionsGet(dir, nodes);
  for (const id of missing) {
    nextPositions[id] = layoutPositions[id] ?? { x: layoutPadding.x, y: layoutPadding.y };
  }
  return nextPositions;
}

function outputTextClean(value: string) {
  const text = value
    .split(/\r?\n/)
    .filter(line => !/\bPID \d+\b/.test(line))
    .join("\n");
  if (!/[\\u00c0-\\u00ff\\u0152\\u0153\\u0160\\u0161\\u0178\\u017d\\u017e\\u0192\\u02c6\\u02dc\\u2013\\u2014\\u2018\\u2019\\u201a\\u201c\\u201d\\u201e\\u2020\\u2021\\u2022\\u2026\\u2030\\u2039\\u203a\\u20ac\\u2122]/.test(text)) {
    return text;
  }
  const win1252: Record<number, number> = {
    0x0152: 0x8c,
    0x0153: 0x9c,
    0x0160: 0x8a,
    0x0161: 0x9a,
    0x0178: 0x9f,
    0x017d: 0x8e,
    0x017e: 0x9e,
    0x0192: 0x83,
    0x02c6: 0x88,
    0x02dc: 0x98,
    0x2013: 0x96,
    0x2014: 0x97,
    0x2018: 0x91,
    0x2019: 0x92,
    0x201a: 0x82,
    0x201c: 0x93,
    0x201d: 0x94,
    0x201e: 0x84,
    0x2020: 0x86,
    0x2021: 0x87,
    0x2022: 0x95,
    0x2026: 0x85,
    0x2030: 0x89,
    0x2039: 0x8b,
    0x203a: 0x9b,
    0x20ac: 0x80,
    0x2122: 0x99,
  };
  const bytes = Array.from(text, (char) => {
    const code = char.charCodeAt(0);
    return code <= 0xff ? code : win1252[code];
  });
  if (bytes.some(byte => byte === undefined)) return text;
  const repaired = new TextDecoder().decode(new Uint8Array(bytes as number[]));
  return repaired.includes("\uFFFD") ? text : repaired;
}

const createStore = immerStateCreator<{ sse: Store }>((set, get) => {
  const client = hc<typeof chatRouter>(location.origin);
  const initialNodes: NodesState = {
    "1": {
      data: emptyText,
    },
  };
  const initialDirection: Direction = "horizontal";
  const initialStore = {
    connectionStart: undefined,
    drawerChatTarget: "llm.openai" as DrawerChatTarget,
    drawerNodeId: undefined,
    drawerSize: undefined,
    drawerText: "",
    hookPushReceive: true,
    layoutDirection: initialDirection,
    mainColor: ["#7f8580", "#52c41a"] as [string, string],
    maxId: "1",
    nodesState: initialNodes,
    positions: positionsGet(initialDirection, initialNodes),
    selectedEdgeIds: {},
    streamingNodeIds: {},
    targetId: "1",
  };
  const nodeResponseSubmit = async (
    prompt: string,
    pendingText: string,
    request: (prompt: string) => Promise<Response>,
    errorPrefix: string,
  ) => {
    if (!prompt.trim()) return;
    await Promise.resolve();
    let streamNodeId: string | undefined;
    set((draft) => {
      const parentId = draft.sse.nodesState[draft.sse.targetId]
        ? draft.sse.targetId
        : undefined;
      const nodeId = String(Number(draft.sse.maxId) + 1);
      streamNodeId = nodeId;
      draft.sse.nodesState[nodeId] = {
        parentId,
        data: pendingText,
      };
      draft.sse.maxId = nodeId;
      draft.sse.targetId = nodeId;
      draft.sse.drawerNodeId = nodeId;
      draft.sse.drawerText = pendingText;
      draft.sse.streamingNodeIds[nodeId] = true;
      const parentPosition = parentId ? draft.sse.positions[parentId] : undefined;
      if (parentPosition) {
        const layout = layoutOptions[draft.sse.layoutDirection];
        const siblingIndex = Object.entries(draft.sse.nodesState)
          .filter(([id, node]) => id !== nodeId && node.parentId === parentId)
          .length;
        draft.sse.positions[nodeId] = draft.sse.layoutDirection === "horizontal"
          ? {
            x: parentPosition.x + nodeWidth + layout.ranksep,
            y: parentPosition.y + siblingIndex * (nodeHeight + layout.nodesep),
          }
          : {
            x: parentPosition.x + siblingIndex * (nodeWidth + layout.nodesep),
            y: parentPosition.y + nodeHeight + layout.ranksep,
          };
      } else {
        draft.sse.positions = positionsNextGet(
          draft.sse.layoutDirection,
          draft.sse.nodesState,
          draft.sse.positions,
        );
      }
    });
    const nodeTextPush = (text: string, stop?: boolean) => {
      set((draft) => {
        if (!streamNodeId) return;
        const node = draft.sse.nodesState[streamNodeId];
        if (!node) {
          delete draft.sse.streamingNodeIds[streamNodeId];
          return;
        }
        node.data = streamPendingTexts.includes(node.data)
          ? text
          : node.data + text;
        if (stop) {
          for (const pending of streamPendingTexts) {
            node.data = node.data.replace(pending, "");
          }
          node.data = node.data.trim() || emptyText;
          delete draft.sse.streamingNodeIds[streamNodeId];
        }
        if (draft.sse.drawerNodeId === streamNodeId) draft.sse.drawerText = node.data;
      });
    };
    try {
      const response = await request(prompt);
      if (!response.ok) {
        const text = await response.text();
        nodeTextPush(text.trim() || `${errorPrefix} request failed: ${response.status}`, true);
        return;
      }
      const reader = response.body?.getReader();
      if (!reader) {
        const text = await response.text();
        nodeTextPush(text.trim() || `${errorPrefix} response has no body`, true);
        return;
      }
      const decoder = new TextDecoder();
      let output = "";
      for (; ;) {
        const result = await reader.read();
        if (result.done) break;
        const text = decoder.decode(result.value, { stream: true });
        output += text;
        nodeTextPush(text);
      }
      const rest = decoder.decode();
      if (rest) {
        output += rest;
        nodeTextPush(rest);
      }
      nodeTextPush(output.trim() ? "" : `${errorPrefix} response is empty`, true);
    } catch (error) {
      nodeTextPush(error instanceof Error ? error.message : String(error), true);
    }
  };
  const nodePromptSubmit = async (
    nodeData: string | undefined,
    pendingText: string,
    request: (prompt: string) => Promise<Response>,
    errorPrefix: string,
  ) => {
    if (nodeData !== undefined) get().sse.nodeTextChange(nodeData);
    const sse = get().sse;
    const input: string[] = [];
    for (let id: string | undefined = sse.nodesState[sse.targetId] ? sse.targetId : undefined; id !== undefined;) {
      const node = sse.nodesState[id];
      if (!node) break;
      input.unshift(outputTextClean(node.data));
      id = node.parentId;
    }
    await nodeResponseSubmit(
      input.filter(Boolean).join("\n\n"),
      pendingText,
      request,
      errorPrefix,
    );
  };
  const agentDrawSubmit = async (prompt: string) => {
    if (!prompt.trim()) return;
    const graphOperationApply = (
      draft: { sse: Store },
      operation: GraphOperation,
    ) => {
      if (operation.type === "node.text" || operation.type === "node.replace") {
        const node = draft.sse.nodesState[operation.id];
        if (!node) return;
        node.data = operation.text.trim() || emptyText;
        if (draft.sse.drawerNodeId === operation.id) draft.sse.drawerText = node.data;
        return;
      }
      if (operation.type === "node.add") {
        const parentId = operation.parentId && draft.sse.nodesState[operation.parentId]
          ? operation.parentId
          : undefined;
        const nodeId = String(Number(draft.sse.maxId) + 1);
        draft.sse.nodesState[nodeId] = {
          parentId,
          data: operation.text.trim() || emptyText,
        };
        draft.sse.maxId = nodeId;
        draft.sse.targetId = nodeId;
        return;
      }
      if (operation.type === "node.move") {
        const node = draft.sse.nodesState[operation.id];
        if (!node) return;
        if (!operation.parentId) {
          delete node.parentId;
          draft.sse.targetId = operation.id;
          return;
        }
        if (!nodeMoveCan(operation.parentId, operation.id, draft.sse.nodesState)) return;
        node.parentId = operation.parentId;
        draft.sse.targetId = operation.id;
        return;
      }
      const node = draft.sse.nodesState[operation.id];
      if (!node || Object.keys(draft.sse.nodesState).length <= 1) return;
      delete draft.sse.nodesState[operation.id];
      if (draft.sse.drawerNodeId === operation.id) {
        draft.sse.drawerNodeId = undefined;
        draft.sse.drawerText = "";
      }
      for (const child of Object.values(draft.sse.nodesState)) {
        if (child.parentId === operation.id) delete child.parentId;
      }
      if (draft.sse.targetId === operation.id) {
        draft.sse.targetId = node.parentId && draft.sse.nodesState[node.parentId]
          ? node.parentId
          : firstNodeIdGet(draft.sse.nodesState) ?? draft.sse.targetId;
      }
    };
    const drawEventLineReceive = (line: string) => {
      if (!line.trim()) return;
      const event = JSON.parse(line) as DrawEvent;
      if (event.type === "operation") {
        set((draft) => {
          graphOperationApply(draft, event.operation);
          draft.sse.positions = positionsNextGet(
            draft.sse.layoutDirection,
            draft.sse.nodesState,
            draft.sse.positions,
          );
        });
        return;
      }
      if (event.type === "error") throw new Error(event.message);
    };
    try {
      const response = await client.chat.agent.draw.$post({
        json: {
          prompt,
        },
      });
      if (!response.ok) throw new Error(await response.text());
      if (!response.body) throw new Error("agent.draw response body is empty");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const result = await reader.read();
        if (result.done) break;
        buffer += decoder.decode(result.value, { stream: true });
        for (let index = buffer.indexOf("\n"); index >= 0; index = buffer.indexOf("\n")) {
          const line = buffer.slice(0, index);
          buffer = buffer.slice(index + 1);
          drawEventLineReceive(line);
        }
      }
      buffer += decoder.decode();
      drawEventLineReceive(buffer);
    } catch (error) {
      get().sse.nodeAdd(error instanceof Error ? error.message : String(error));
    }
  };
  const store: Store = {
    ...initialStore,
    drawerClose: () => {
      set((draft) => {
        draft.sse.drawerNodeId = undefined;
        draft.sse.drawerText = "";
      });
    },
    drawerChatTargetChange: (target) => {
      set((draft) => {
        draft.sse.drawerChatTarget = target;
      });
    },
    drawerNodeOpen: (id) => {
      set((draft) => {
        const node = draft.sse.nodesState[id];
        if (!node) return;
        draft.sse.targetId = id;
        draft.sse.selectedEdgeIds = {};
        draft.sse.drawerNodeId = id;
        draft.sse.drawerText = node.data;
      });
    },
    drawerNodeToggle: (id) => {
      set((draft) => {
        const node = draft.sse.nodesState[id];
        if (!node) return;
        draft.sse.targetId = id;
        draft.sse.selectedEdgeIds = {};
        if (draft.sse.drawerNodeId === id) {
          draft.sse.drawerNodeId = undefined;
          draft.sse.drawerText = "";
          return;
        }
        draft.sse.drawerNodeId = id;
        draft.sse.drawerText = node.data;
      });
    },
    drawerSizeChange: (size) => {
      set((draft) => {
        draft.sse.drawerSize = size;
      });
    },
    drawerTextChange: (text) => {
      set((draft) => {
        draft.sse.drawerText = text;
      });
    },
    connectionEnd: () => {
      set((draft) => {
        draft.sse.connectionStart = undefined;
      });
    },
    connectionStartBegin: (p) => {
      set((draft) => {
        draft.sse.connectionStart = {
          handleId: p.handleId === parentHandle || p.handleId === childHandle
            ? p.handleId
            : null,
          nodeId: p.nodeId,
        };
      });
    },
    connectionValid: (c) => {
      const conn = connectionGet(c);
      return !!conn && connectionCan(
        conn.parentId,
        conn.childId,
        get().sse.nodesState,
      );
    },
    edgeReconnect: (oldEdge, c) => {
      const conn = connectionGet(c);
      if (!conn) return;
      set((draft) => {
        const oldNode = draft.sse.nodesState[oldEdge.target];
        if (oldNode) delete oldNode.parentId;
        const node = draft.sse.nodesState[conn.childId];
        if (node && connectionCan(conn.parentId, conn.childId, draft.sse.nodesState)) {
          node.parentId = conn.parentId;
          draft.sse.targetId = conn.childId;
        }
        delete draft.sse.selectedEdgeIds[oldEdge.id];
        draft.sse.connectionStart = undefined;
      });
    },
    edgeSelectionChange: (changes) => {
      const selects = changes.filter(change => change.type === "select");
      if (!selects.length) return;
      set((draft) => {
        for (const change of selects) {
          if (change.selected) draft.sse.selectedEdgeIds[change.id] = true;
          else delete draft.sse.selectedEdgeIds[change.id];
        }
      });
    },
    edgesDelete: (edges) => {
      set((draft) => {
        for (const edge of edges) {
          const node = draft.sse.nodesState[edge.target];
          if (node) delete node.parentId;
          delete draft.sse.selectedEdgeIds[edge.id];
        }
      });
    },
    hookMessageReceive: (message) => {
      set((draft) => {
        if (!draft.sse.hookPushReceive) return;
        const text = message.text.trim();
        if (!text || !message.stop) return;
        const parentId = draft.sse.nodesState[draft.sse.targetId]
          ? draft.sse.targetId
          : undefined;
        const nodeId = String(Number(draft.sse.maxId) + 1);
        draft.sse.nodesState[nodeId] = {
          parentId,
          data: text,
        };
        draft.sse.maxId = nodeId;
        draft.sse.targetId = nodeId;
        const parentPosition = parentId ? draft.sse.positions[parentId] : undefined;
        if (parentPosition) {
          const layout = layoutOptions[draft.sse.layoutDirection];
          const siblingIndex = Object.entries(draft.sse.nodesState)
            .filter(([id, node]) => id !== nodeId && node.parentId === parentId)
            .length;
          draft.sse.positions[nodeId] = draft.sse.layoutDirection === "horizontal"
            ? {
              x: parentPosition.x + nodeWidth + layout.ranksep,
              y: parentPosition.y + siblingIndex * (nodeHeight + layout.nodesep),
            }
            : {
              x: parentPosition.x + siblingIndex * (nodeWidth + layout.nodesep),
              y: parentPosition.y + nodeHeight + layout.ranksep,
            };
        } else {
          draft.sse.positions = positionsNextGet(
            draft.sse.layoutDirection,
            draft.sse.nodesState,
            draft.sse.positions,
          );
        }
      });
    },
    hookPushReceiveToggle: () => {
      set((draft) => {
        draft.sse.hookPushReceive = !draft.sse.hookPushReceive;
      });
    },
    layoutDirectionChange: (direction) => {
      set((draft) => {
        draft.sse.layoutDirection = direction;
        draft.sse.positions = positionsGet(direction, draft.sse.nodesState);
      });
    },
    nodeAdd: (text) => {
      set((draft) => {
        const parentId = draft.sse.nodesState[draft.sse.targetId]
          ? draft.sse.targetId
          : undefined;
        const nodeId = String(Number(draft.sse.maxId) + 1);
        draft.sse.nodesState[nodeId] = {
          parentId,
          data: text?.trim() || emptyText,
        };
        draft.sse.maxId = nodeId;
        draft.sse.targetId = nodeId;
        const parentPosition = parentId ? draft.sse.positions[parentId] : undefined;
        if (parentPosition) {
          const layout = layoutOptions[draft.sse.layoutDirection];
          const siblingIndex = Object.entries(draft.sse.nodesState)
            .filter(([id, node]) => id !== nodeId && node.parentId === parentId)
            .length;
          draft.sse.positions[nodeId] = draft.sse.layoutDirection === "horizontal"
            ? {
              x: parentPosition.x + nodeWidth + layout.ranksep,
              y: parentPosition.y + siblingIndex * (nodeHeight + layout.nodesep),
            }
            : {
              x: parentPosition.x + siblingIndex * (nodeWidth + layout.nodesep),
              y: parentPosition.y + nodeHeight + layout.ranksep,
            };
        } else {
          draft.sse.positions = positionsNextGet(
            draft.sse.layoutDirection,
            draft.sse.nodesState,
            draft.sse.positions,
          );
        }
      });
    },
    nodeBranchDelete: (id) => {
      set((draft) => {
        const nodeId = id ?? draft.sse.targetId;
        if (!draft.sse.nodesState[nodeId]) return;
        const deleteIds = new Set([nodeId]);
        for (let changed = true; changed;) {
          changed = false;
          for (const [current, node] of Object.entries(draft.sse.nodesState)) {
            if (node.parentId && deleteIds.has(node.parentId) && !deleteIds.has(current)) {
              deleteIds.add(current);
              changed = true;
            }
          }
        }
        for (const current of deleteIds) delete draft.sse.nodesState[current];
        if (draft.sse.drawerNodeId && deleteIds.has(draft.sse.drawerNodeId)) {
          draft.sse.drawerNodeId = undefined;
          draft.sse.drawerText = "";
        }
        for (const current of deleteIds) {
          delete draft.sse.streamingNodeIds[current];
        }
        if (!Object.keys(draft.sse.nodesState).length) {
          const nextId = String(Number(draft.sse.maxId) + 1);
          draft.sse.nodesState[nextId] = { data: emptyText };
          draft.sse.maxId = nextId;
          draft.sse.targetId = nextId;
        } else if (deleteIds.has(draft.sse.targetId)) {
          draft.sse.targetId = firstNodeIdGet(draft.sse.nodesState) ?? draft.sse.targetId;
        }
        draft.sse.positions = positionsNextGet(
          draft.sse.layoutDirection,
          draft.sse.nodesState,
          draft.sse.positions,
        );
      });
    },
    nodeAgentDraw: async (nodeData) => {
      if (nodeData !== undefined) get().sse.nodeTextChange(nodeData);
      const sse = get().sse;
      const targetNode = sse.nodesState[sse.targetId];
      const userPrompt = [
        "请整理当前节点森林，只做必要的节点文本、新增或删除操作。",
        targetNode ? outputTextClean(targetNode.data) : "",
      ].filter(Boolean).join("\n\n");
      if (!userPrompt.trim()) return;
      const prompt = [
        "You are an AI assistant that edits a project node forest.",
        "Return newline-delimited JSON only. Do not wrap it in Markdown.",
        "Each line must be one compact JSON event. Do not return a JSON array or wrapper object.",
        "Allowed event shapes:",
        "{\"type\":\"message\",\"text\":\"short progress text\"}",
        "{\"type\":\"operation\",\"operation\":{\"type\":\"node.text\",\"id\":\"existing node id\",\"text\":\"new full node text\"}}",
        "{\"type\":\"operation\",\"operation\":{\"type\":\"node.replace\",\"id\":\"existing node id\",\"text\":\"replacement node text\"}}",
        "{\"type\":\"operation\",\"operation\":{\"type\":\"node.add\",\"parentId\":\"existing parent id or omitted for root\",\"text\":\"new node text\"}}",
        "{\"type\":\"operation\",\"operation\":{\"type\":\"node.move\",\"id\":\"existing node id\",\"parentId\":\"existing parent id or omitted for root\"}}",
        "{\"type\":\"operation\",\"operation\":{\"type\":\"node.delete\",\"id\":\"existing node id\"}}",
        "{\"type\":\"done\"}",
        "Do not delete every node. Prefer small, concrete edits.",
        "Do not return markdown explanations outside NDJSON events.",
        "Use operations instead of returning the full graph.",
        "Target node id:",
        sse.targetId,
        "Existing nodes:",
        JSON.stringify(sse.nodesState),
        "User request:",
        userPrompt,
      ].join("\n\n");
      await agentDrawSubmit(prompt);
    },
    nodeChat: async (prompt) => {
      const target = get().sse.drawerChatTarget;
      if (target === "agent.draw") {
        await agentDrawSubmit(prompt);
        return;
      }
      if (target === "agent.codexcli") {
        await nodeResponseSubmit(
          prompt,
          agentCodexcliPendingText,
          prompt => client.chat.agent.codexcli.$post({ json: { prompt } }),
          "agent.codexcli",
        );
        return;
      }
      await nodeResponseSubmit(
        prompt,
        llmOpenaiPendingText,
        prompt => client.chat.llm.openai.$post({ json: { prompt } }),
        "llm.openai",
      );
    },
    nodeLlmOpenai: async (nodeData) => {
      await nodePromptSubmit(
        nodeData,
        llmOpenaiPendingText,
        prompt => client.chat.llm.openai.$post({ json: { prompt } }),
        "llm.openai",
      );
    },
    nodeAgentCodexcli: async (nodeData) => {
      await nodePromptSubmit(
        nodeData,
        agentCodexcliPendingText,
        prompt => client.chat.agent.codexcli.$post({ json: { prompt } }),
        "agent.codexcli",
      );
    },
    nodeConnect: (c) => {
      const conn = connectionGet(c);
      set((draft) => {
        if (!conn && c.target) {
          const node = draft.sse.nodesState[c.target];
          if (node) delete node.parentId;
          return;
        }
        if (!conn) return;
        const node = draft.sse.nodesState[conn.childId];
        if (node && connectionCan(conn.parentId, conn.childId, draft.sse.nodesState)) {
          node.parentId = conn.parentId;
          draft.sse.targetId = conn.childId;
        }
        draft.sse.connectionStart = undefined;
      });
    },
    nodeDelete: (id) => {
      set((draft) => {
        const nodeId = id ?? draft.sse.targetId;
        const node = draft.sse.nodesState[nodeId];
        if (!node) return;
        delete draft.sse.nodesState[nodeId];
        if (draft.sse.drawerNodeId === nodeId) {
          draft.sse.drawerNodeId = undefined;
          draft.sse.drawerText = "";
        }
        delete draft.sse.streamingNodeIds[nodeId];
        for (const child of Object.values(draft.sse.nodesState)) {
          if (child.parentId === nodeId) delete child.parentId;
        }
        if (!Object.keys(draft.sse.nodesState).length) {
          const nextId = String(Number(draft.sse.maxId) + 1);
          draft.sse.nodesState[nextId] = { data: emptyText };
          draft.sse.maxId = nextId;
          draft.sse.targetId = nextId;
        } else if (draft.sse.targetId === nodeId) {
          draft.sse.targetId = node.parentId && draft.sse.nodesState[node.parentId]
            ? node.parentId
            : firstNodeIdGet(draft.sse.nodesState) ?? draft.sse.targetId;
        }
        draft.sse.positions = positionsNextGet(
          draft.sse.layoutDirection,
          draft.sse.nodesState,
          draft.sse.positions,
        );
      });
    },
    nodeSelect: (node) => {
      set((draft) => {
        const id = typeof node === "string" ? node : node.id;
        const target = draft.sse.nodesState[id];
        if (!target) return;
        draft.sse.targetId = id;
        draft.sse.selectedEdgeIds = {};
        if (draft.sse.drawerNodeId) {
          draft.sse.drawerNodeId = id;
          draft.sse.drawerText = target.data;
        }
      });
    },
    nodeTextChange: (text, id) => {
      set((draft) => {
        const nodeId = id ?? draft.sse.targetId;
        const node = draft.sse.nodesState[nodeId];
        if (!node) return;
        node.data = text.trim() || emptyText;
        if (draft.sse.drawerNodeId === nodeId) draft.sse.drawerText = node.data;
      });
    },
    viewReset: () => {
      set((draft) => {
        draft.sse.positions = positionsGet(draft.sse.layoutDirection, draft.sse.nodesState);
      });
    },
  };
  return { sse: store };
});

export default createStore;
