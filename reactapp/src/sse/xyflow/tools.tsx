import { ApartmentOutlined, BranchesOutlined, PartitionOutlined } from "@ant-design/icons";
import {
  ControlButton,
  Controls,
  MiniMap,
  useReactFlow,
} from "@xyflow/react";
import type { CSSProperties } from "react";
import appStore from "../../store";

const toolBottom = 12;
const toolLeft = 0;
const toolSize = 162;
const toolButtonWidth = 36;
const toolButtonCount = 3;
const toolButtonsLeft = toolLeft + toolSize;

export default function Tools() {
  const sse = appStore(state => state.sse);
  const sseActions = appStore(state => state.sseActions);
  const flow = useReactFlow();
  const controlButtonStyle: CSSProperties = {
    alignItems: "center",
    boxSizing: "border-box",
    display: "flex",
    height: toolSize / toolButtonCount,
    justifyContent: "center",
    padding: 0,
    width: toolButtonWidth,
  };

  function pathFocus() {
    const pathNodeIds = Object.keys(pathGet(sse).pathNodeIds);
    if (!pathNodeIds.length) return;
    void flow.fitView({
      duration: 180,
      maxZoom: 1,
      minZoom: 0.05,
      nodes: pathNodeIds.map(id => ({ id })),
      padding: 0.3,
    });
  }

  return (
    <>
      <Controls
        orientation="vertical"
        position="bottom-left"
        showFitView={false}
        showInteractive={false}
        showZoom={false}
        style={{
          boxSizing: "border-box",
          bottom: toolBottom,
          height: toolSize,
          left: toolButtonsLeft,
          width: toolButtonWidth,
        }}
      >
        <ControlButton
          onClick={pathFocus}
          style={controlButtonStyle}
          title="递归流向"
        >
          <BranchesOutlined />
        </ControlButton>
        <ControlButton
          className={sse.layoutDirection === "horizontal" ? "context-control-button-active" : undefined}
          onClick={() => sseActions.layoutDirectionChange("horizontal")}
          style={controlButtonStyle}
          title="从左到右"
        >
          <PartitionOutlined />
        </ControlButton>
        <ControlButton
          className={sse.layoutDirection === "vertical" ? "context-control-button-active" : undefined}
          onClick={() => sseActions.layoutDirectionChange("vertical")}
          style={controlButtonStyle}
          title="从上到下"
        >
          <ApartmentOutlined />
        </ControlButton>
      </Controls>
      <MiniMap
        maskColor="rgba(245, 248, 244, .72)"
        nodeBorderRadius={4}
        nodeColor={node => (
          typeof node.className === "string" && node.className.includes("context-node-flow")
            ? sse.mainColor[1]
            : sse.mainColor[0]
        )}
        nodeStrokeColor="#fff"
        pannable
        position="bottom-left"
        style={{
          background: "rgba(255, 255, 255, .96)",
          border: "1px solid rgba(82, 196, 26, .22)",
          borderRadius: 6,
          bottom: toolBottom,
          boxSizing: "border-box",
          boxShadow: "0 8px 22px rgba(32, 48, 32, .12)",
          height: toolSize,
          left: toolLeft,
          overflow: "hidden",
          width: toolSize,
        }}
        zoomable
      />
    </>
  );
}

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
