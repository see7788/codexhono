import { ApartmentOutlined, PartitionOutlined } from "@ant-design/icons";
import {
    Background,
    ConnectionMode,
    ControlButton,
    Controls,
    MiniMap,
    ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { type CSSProperties } from "react";
import appStore from "../../store";
import context from "./node";
import useHook from "./useHook";

const mainColor: [string, string] = ["#7f8580", "#52c41a"];
const flowStyleVars = {
    "--context-edge": mainColor[0],
    "--context-flow": mainColor[1],
    "--context-flow-dash": "8px",
    "--context-flow-line-width": "2px",
    "--context-flow-speed": "900ms",
    "--context-flow-step": "16px",
} as CSSProperties;

export default function FlowView() {
    const hook = useHook();
    const pushActions = appStore(state => state.sseActions);

    return (
        <div
            className="context-flow"
            style={flowStyleVars}
        >
            <style>{`
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
          line-height: 20px;
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
        .react-flow__node:hover:not(.context-node-has-parent) .context-node .react-flow__handle.target::after {
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
      `}</style>
            <ReactFlow
                connectionMode={ConnectionMode.Loose}
                connectOnClick={false}
                connectionLineStyle={{
                    stroke: "var(--context-flow)",
                    strokeWidth: "var(--context-flow-line-width)",
                }}
                deleteKeyCode={["Backspace", "Delete"]}
                edges={hook.edges}
                edgesReconnectable
                isValidConnection={hook.connectionValid}
                minZoom={0.05}
                nodes={hook.nodes}
                nodesConnectable
                nodesDraggable={false}
                nodeTypes={{ context }}
                onConnect={hook.nodeConnect}
                onEdgesChange={hook.edgeSelectionChange}
                onEdgesDelete={hook.edgesDelete}
                onNodeClick={(_, node) => hook.targetIdSet(node.id)}
                onNodeDoubleClick={(_, node) => {
                    pushActions.drawer(node.id);
                }}
                onReconnect={hook.edgeReconnect}
                proOptions={{ hideAttribution: true }}
                reconnectRadius={18}
                zoomOnDoubleClick={false}
            >
                <Background color="#dbe8d7" gap={18} />
                <Controls
                    orientation="vertical"
                    position="bottom-left"
                    showFitView={false}
                    showInteractive={false}
                    showZoom={false}
                    style={{
                        boxSizing: "border-box",
                        bottom: 12,
                        height: 162,
                        left: 162,
                        width: 36,
                    }}
                >
                    <ControlButton
                        className={hook.layoutDirectionIndex === 0 ? "context-control-button-active" : undefined}
                        onClick={() => hook.layoutDirectionSet(0)}
                        style={{
                            alignItems: "center",
                            boxSizing: "border-box",
                            display: "flex",
                            height: 54,
                            justifyContent: "center",
                            padding: 0,
                            width: 36,
                        }}
                    >
                        <PartitionOutlined />
                    </ControlButton>
                    <ControlButton
                        className={hook.layoutDirectionIndex === 1 ? "context-control-button-active" : undefined}
                        onClick={() => hook.layoutDirectionSet(1)}
                        style={{
                            alignItems: "center",
                            boxSizing: "border-box",
                            display: "flex",
                            height: 54,
                            justifyContent: "center",
                            padding: 0,
                            width: 36,
                        }}
                    >
                        <ApartmentOutlined />
                    </ControlButton>
                </Controls>
                <MiniMap
                    maskColor="rgba(245, 248, 244, .72)"
                    nodeBorderRadius={4}
                    nodeColor={node => (
                        typeof node.className === "string" && node.className.includes("context-node-flow")
                            ? mainColor[1]
                            : mainColor[0]
                    )}
                    nodeStrokeColor="#fff"
                    pannable
                    position="bottom-left"
                    style={{
                        background: "rgba(255, 255, 255, .96)",
                        border: "1px solid rgba(82, 196, 26, .22)",
                        borderRadius: 6,
                        bottom: 12,
                        boxSizing: "border-box",
                        boxShadow: "0 8px 22px rgba(32, 48, 32, .12)",
                        height: 162,
                        left: 0,
                        overflow: "hidden",
                        width: 162,
                    }}
                    zoomable
                />
            </ReactFlow>
        </div>
    );
}
