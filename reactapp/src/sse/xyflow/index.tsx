import {
  Background,
  ConnectionMode,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { CSSProperties } from "react";
import appStore from "../../store";
import ContextNode from "./node";
import Tools from "./tools";

type NodeData = {
  childHandle: string;
  childHandlePosition: Position;
  hasParent: boolean;
  parentHandle: string;
  parentHandlePosition: Position;
  text: string;
};
type FlowNode = Node<NodeData, "context">;

const childHandle = "child";
const parentHandle = "parent";
const flowDash = 8;
const flowLineWidth = 2;
const flowSpeedMs = 900;
const flowStep = flowDash * 2;
const nodeTextLineHeight = 20;
const nodeHeight = nodeTextLineHeight * 2;
const nodeWidth = 178;
const layoutOptions = {
  horizontal: {
    childHandlePosition: Position.Left,
    parentHandlePosition: Position.Right,
  },
  vertical: {
    childHandlePosition: Position.Top,
    parentHandlePosition: Position.Bottom,
  },
};

const nodeTypes = {
  context: ContextNode,
} satisfies NodeTypes;

export default function FlowView() {
  const sse = appStore(state => state.sse);
  const sseActions = appStore(state => state.sseActions);
  const [baseColor, highlightColor] = sse.mainColor;
  const path = pathGet(sse);
  const nodes = nodesGet(sse, path.pathNodeIds);
  const edges = edgesGet(sse, path.pathEdgeIds);

  return (
    <div
      className={[
        "context-flow",
        sse.connectionStart ? "context-flow-connecting" : "",
      ].filter(Boolean).join(" ")}
      style={{
        "--context-edge": baseColor,
        "--context-flow": highlightColor,
        "--context-flow-dash": `${flowDash}px`,
        "--context-flow-line-width": `${flowLineWidth}px`,
        "--context-flow-speed": `${flowSpeedMs}ms`,
        "--context-flow-step": `${flowStep}px`,
      } as CSSProperties}
    >
      <style>{style}</style>
      <ReactFlow
        connectionMode={ConnectionMode.Loose}
        connectOnClick={false}
        connectionLineStyle={{
          stroke: "var(--context-flow)",
          strokeWidth: "var(--context-flow-line-width)",
        }}
        deleteKeyCode={["Backspace", "Delete"]}
        edges={edges}
        edgesReconnectable
        isValidConnection={sseActions.connectionValid}
        minZoom={0.05}
        nodes={nodes}
        nodesConnectable
        nodesDraggable={false}
        nodeTypes={nodeTypes}
        onConnect={sseActions.nodeConnect}
        onConnectEnd={sseActions.connectionEnd}
        onConnectStart={(_, params) => sseActions.connectionStartBegin(params)}
        onEdgesChange={sseActions.edgeSelectionChange}
        onEdgesDelete={sseActions.edgesDelete}
        onNodeClick={(_, node) => sseActions.nodeSelect(node)}
        onNodeDoubleClick={(_, node) => {
          sseActions.drawerNodeToggle(node.id);
        }}
        onReconnect={sseActions.edgeReconnect}
        proOptions={{ hideAttribution: true }}
        reconnectRadius={18}
        zoomOnDoubleClick={false}
      >
        <Background color="#dbe8d7" gap={18} />
        <Tools />
      </ReactFlow>
    </div>
  );
}

const style = `
  .context-flow {
    --context-muted: #a8afa9;
    height: 100%;
    position: relative;
  }
  .context-flow .react-flow__controls {
    border: 1px solid rgba(82, 196, 26, .22);
    border-radius: 6px;
    box-shadow: 0 8px 22px rgba(32, 48, 32, .12);
    overflow: hidden;
  }
  .context-flow .react-flow__controls-button {
    border-bottom: 0;
    height: 38px;
    width: 48px;
  }
  .context-flow .context-control-button-active {
    color: var(--context-flow);
  }
  .context-node {
    height: 100%;
    position: relative;
    width: 100%;
  }
  .context-node-text {
    background: rgba(255, 255, 255, .96);
    border: 1px solid rgba(127, 133, 128, .24);
    border-radius: 4px;
    box-sizing: border-box;
    box-shadow: 0 4px 12px rgba(32, 48, 32, .08);
    height: 100%;
    line-height: ${nodeTextLineHeight}px;
    overflow: hidden;
    padding: 0 8px;
    width: 100%;
  }
  .context-node .react-flow__handle {
    background: transparent;
    border: 0;
    height: 32px;
    width: 20px;
  }
  .context-node .react-flow__handle-left {
    left: -10px;
  }
  .context-node .react-flow__handle-right {
    right: -10px;
  }
  .context-node .react-flow__handle-top {
    top: -10px;
  }
  .context-node .react-flow__handle-bottom {
    bottom: -10px;
  }
  .context-node .react-flow__handle::after {
    background: transparent;
    border-style: solid;
    content: "";
    height: 0;
    left: 50%;
    opacity: 0;
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 0;
  }
  .context-node .react-flow__handle-left::after,
  .context-node .react-flow__handle-right::after {
    border-color: transparent transparent transparent var(--context-flow);
    border-width: 5px 0 5px 8px;
  }
  .context-node .react-flow__handle-top::after,
  .context-node .react-flow__handle-bottom::after {
    border-color: var(--context-flow) transparent transparent transparent;
    border-width: 8px 5px 0 5px;
  }
  .react-flow__node:hover .context-node .react-flow__handle.source::after,
  .react-flow__node:hover:not(.context-node-has-parent) .context-node .react-flow__handle.target::after,
  .context-flow-connecting .context-node-connect-end-child .context-node .react-flow__handle.target::after,
  .context-flow-connecting .context-node-connect-end-parent .context-node .react-flow__handle.source::after {
    opacity: 1;
  }
  .context-node-has-parent:hover .context-node .react-flow__handle.target::after {
    opacity: .45;
  }
  .context-node-has-parent:hover .context-node .react-flow__handle-left.target::after,
  .context-node-has-parent:hover .context-node .react-flow__handle-right.target::after {
    border-color: transparent transparent transparent var(--context-muted);
  }
  .context-node-has-parent:hover .context-node .react-flow__handle-top.target::after,
  .context-node-has-parent:hover .context-node .react-flow__handle-bottom.target::after {
    border-color: var(--context-muted) transparent transparent transparent;
  }
  .context-flow-connecting .react-flow__node:hover .context-node .react-flow__handle.source::after,
  .context-flow-connecting .react-flow__node:hover .context-node .react-flow__handle.target::after,
  .context-flow-connecting .context-node .react-flow__handle::after {
    opacity: 0;
  }
  .context-flow-connecting .react-flow__node.context-node-connect-end-child:hover .context-node .react-flow__handle.target::after,
  .context-flow-connecting .react-flow__node.context-node-connect-end-parent:hover .context-node .react-flow__handle.source::after,
  .context-flow-connecting .context-node-connect-end-child .context-node .react-flow__handle.target::after,
  .context-flow-connecting .context-node-connect-end-parent .context-node .react-flow__handle.source::after {
    opacity: 1;
  }
  .context-flow-connecting .context-node-connectable-target .context-node-text {
    box-shadow: 0 0 0 1px rgba(82, 196, 26, .22);
  }
  .context-node-flow .context-node-text {
    position: relative;
  }
  .context-node-flow .context-node-text::before {
    animation: context-node-flow-border-horizontal var(--context-flow-speed) linear infinite;
    background:
      repeating-linear-gradient(90deg, var(--context-flow) 0 var(--context-flow-dash), transparent var(--context-flow-dash) var(--context-flow-step)) top / 200% var(--context-flow-line-width) no-repeat,
      repeating-linear-gradient(90deg, var(--context-flow) 0 var(--context-flow-dash), transparent var(--context-flow-dash) var(--context-flow-step)) bottom / 200% var(--context-flow-line-width) no-repeat,
      repeating-linear-gradient(180deg, var(--context-flow) 0 var(--context-flow-dash), transparent var(--context-flow-dash) var(--context-flow-step)) left / var(--context-flow-line-width) 200% no-repeat,
      repeating-linear-gradient(180deg, var(--context-flow) 0 var(--context-flow-dash), transparent var(--context-flow-dash) var(--context-flow-step)) right / var(--context-flow-line-width) 200% no-repeat;
    content: "";
    inset: 2px;
    pointer-events: none;
    position: absolute;
    z-index: 2;
  }
  .context-node-flow-horizontal .context-node-text::before {
    animation-name: context-node-flow-border-horizontal;
  }
  .context-node-flow-vertical .context-node-text::before {
    animation-name: context-node-flow-border-vertical;
  }
  .context-flow .react-flow__edge.animated .react-flow__edge-path {
    animation: context-edge-flow var(--context-flow-speed) linear infinite;
    stroke-dasharray: var(--context-flow-dash) var(--context-flow-dash);
  }
  .context-flow .react-flow__edgeupdater {
    cursor: pointer;
  }
  .react-flow__edge.selected .react-flow__edge-path {
    stroke: var(--context-flow) !important;
    stroke-width: var(--context-flow-line-width);
    stroke-dasharray: var(--context-flow-dash) var(--context-flow-dash);
  }
  .context-edge-default:hover .react-flow__edge-path {
    stroke: var(--context-flow) !important;
  }
  .context-edge-flow:hover .react-flow__edge-path {
    stroke: var(--context-edge) !important;
  }
  @keyframes context-edge-flow {
    from {
      stroke-dashoffset: var(--context-flow-step);
    }
    to {
      stroke-dashoffset: 0;
    }
  }
  @keyframes context-node-flow-border-horizontal {
    from {
      background-position: 0 0, 0 100%, 0 0, 100% 0;
    }
    to {
      background-position: var(--context-flow-step) 0, var(--context-flow-step) 100%, 0 0, 100% 0;
    }
  }
  @keyframes context-node-flow-border-vertical {
    from {
      background-position: 0 0, 0 100%, 0 0, 100% 0;
    }
    to {
      background-position: 0 0, 0 100%, 0 var(--context-flow-step), 100% var(--context-flow-step);
    }
  }
`;

function pathGet(flow: {
  nodesState: Record<string, { parentId?: string }>;
  targetId: string;
}) {
  const pathEdgeIds: Record<string, true> = {};
  const pathNodeIds: Record<string, true> = {};
  for (let id: string | undefined = flow.nodesState[flow.targetId] ? flow.targetId : undefined; id !== undefined;) {
    pathNodeIds[id] = true;
    const parentId = flow.nodesState[id]?.parentId;
    if (parentId) pathEdgeIds[`${parentId}-${id}`] = true;
    id = parentId;
  }
  return { pathEdgeIds, pathNodeIds };
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

function connectionCan(parentId: string, childId: string, nodesState: Record<string, { parentId?: string }>) {
  if (childId === parentId) return false;
  if (!nodesState[parentId]) return false;
  const child = nodesState[childId];
  if (!child || child.parentId) return false;
  for (let id: string | undefined = parentId; id !== undefined;) {
    if (id === childId) return false;
    id = nodesState[id]?.parentId;
  }
  return true;
}

function nodesGet(
  flow: ReturnType<typeof appStore.getState>["sse"],
  pathNodeIds: Record<string, true>,
): FlowNode[] {
  const isConnecting = !!flow.connectionStart;
  const hasSelectedEdge = Object.keys(flow.selectedEdgeIds).length > 0;
  const layout = layoutOptions[flow.layoutDirection];
  const endHandles: Record<string, string> = {};
  if (flow.connectionStart?.nodeId && flow.connectionStart.handleId) {
    for (const id of Object.keys(flow.nodesState)) {
      if (id === flow.connectionStart.nodeId) continue;
      const endHandle = flow.connectionStart.handleId === parentHandle
        ? childHandle
        : parentHandle;
      const conn = connectionGet({
        source: flow.connectionStart.nodeId,
        sourceHandle: flow.connectionStart.handleId,
        target: id,
        targetHandle: endHandle,
      });
      if (conn && connectionCan(conn.parentId, conn.childId, flow.nodesState)) {
        endHandles[id] = endHandle;
      }
    }
  }
  return Object.entries(flow.nodesState).map(([id, node]) => ({
    className: [
      !isConnecting && id === flow.targetId ? "context-node-target" : "",
      node.parentId ? "context-node-has-parent" : "",
      !isConnecting && pathNodeIds[id] ? `context-node-flow context-node-flow-${flow.layoutDirection}` : "",
      isConnecting && endHandles[id] ? "context-node-connectable-target" : "",
      isConnecting && endHandles[id] === childHandle ? "context-node-connect-end-child" : "",
      isConnecting && endHandles[id] === parentHandle ? "context-node-connect-end-parent" : "",
    ].filter(Boolean).join(" "),
    data: {
      childHandle,
      childHandlePosition: layout.childHandlePosition,
      hasParent: !!node.parentId,
      parentHandle,
      parentHandlePosition: layout.parentHandlePosition,
      text: node.data,
    },
    height: nodeHeight,
    id,
    position: flow.positions[id] ?? { x: 0, y: 0 },
    selected: !hasSelectedEdge && id === flow.targetId,
    style: {
      height: nodeHeight,
      width: nodeWidth,
    },
    type: "context",
    width: nodeWidth,
  }));
}

function edgesGet(
  flow: ReturnType<typeof appStore.getState>["sse"],
  pathEdgeIds: Record<string, true>,
): Edge[] {
  return Object.entries(flow.nodesState).flatMap(([id, node]) => {
    if (!node.parentId || !flow.nodesState[node.parentId]) return [];
    const edgeId = `${node.parentId}-${id}`;
    const flowing = !!pathEdgeIds[edgeId];
    return [{
      animated: flowing,
      className: flowing ? "context-edge-flow" : "context-edge-default",
      id: edgeId,
      markerEnd: {
        color: flowing ? "var(--context-flow)" : "var(--context-edge)",
        type: MarkerType.ArrowClosed,
      },
      reconnectable: "target",
      selected: !!flow.selectedEdgeIds[edgeId],
      source: node.parentId,
      sourceHandle: parentHandle,
      style: {
        stroke: flowing ? "var(--context-flow)" : "var(--context-edge)",
        strokeDasharray: `${flowDash} ${flowDash}`,
        strokeWidth: flowLineWidth,
      },
      target: id,
      targetHandle: childHandle,
      type: "smoothstep",
    }];
  });
}
