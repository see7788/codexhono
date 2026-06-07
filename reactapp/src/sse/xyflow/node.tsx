import { ApartmentOutlined, DeleteOutlined } from "@ant-design/icons";
import { Button, Popover, Space } from "antd";
import { useEffect, useState } from "react";
import {
  Handle,
  NodeToolbar,
  Position,
  useUpdateNodeInternals,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import appStore from "../../store";

type FlowNode = Node<{
  childHandle: string;
  childHandlePosition: Position;
  hasParent: boolean;
  parentHandle: string;
  parentHandlePosition: Position;
  text: string;
}, "context">;

export default function ContextNode({ data, id }: NodeProps<FlowNode>) {
  const sse = appStore(state => state.sse);
  const sseActions = appStore(state => state.sseActions);
  const target = sse.targetId === id;
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    updateNodeInternals(id);
  }, [data.childHandlePosition, data.parentHandlePosition, id, updateNodeInternals]);

  return (
    <div
      className="context-node"
      onDoubleClickCapture={(event) => {
        event.stopPropagation();
        sseActions.drawerNodeToggle(id);
      }}
    >
      {target ? <TargetNodeToolbar /> : null}
      <Handle
        className="context-node-handle-child"
        id={data.childHandle}
        isConnectable={!data.hasParent}
        position={data.childHandlePosition}
        type="target"
      />
      <Handle
        className="context-node-handle-parent"
        id={data.parentHandle}
        isConnectable
        position={data.parentHandlePosition}
        type="source"
      />
      <div className="context-node-text">
        {data.text}
      </div>
    </div>
  );
}

function TargetNodeToolbar() {
  const sse = appStore(state => state.sse);
  const sseActions = appStore(state => state.sseActions);
  const [targetTip, setTargetTip] = useState<"del">();

  return (
    <NodeToolbar align="start" isVisible position={Position.Top}>
      <Space className="nodrag nopan" size={6}>
        <Button
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            void sseActions.nodeLlmOpenai();
          }}
          onPointerDown={event => event.stopPropagation()}
        >
          llm.openai
        </Button>
        <Button
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            void sseActions.nodeAgentDraw();
          }}
          onPointerDown={event => event.stopPropagation()}
        >
          agent.draw
        </Button>
        <Button
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            void sseActions.nodeAgentCodexcli();
          }}
          onPointerDown={event => event.stopPropagation()}
        >
          agent.codexcli
        </Button>
        <Button
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            sseActions.nodeAdd();
          }}
          onPointerDown={event => event.stopPropagation()}
        >
          addNode
        </Button>
        <Button
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            sseActions.drawerNodeToggle(sse.targetId);
          }}
          onPointerDown={event => event.stopPropagation()}
        >
          setNode
        </Button>
        <Popover
          content={(
            <Space className="nodrag nopan" size={6}>
              <Button
                icon={<DeleteOutlined />}
                size="small"
                title="current node"
                onClick={() => {
                  sseActions.nodeDelete();
                  setTargetTip(undefined);
                }}
              >
                current
              </Button>
              <Button
                icon={<ApartmentOutlined />}
                size="small"
                title="current node and child nodes"
                onClick={() => {
                  sseActions.nodeBranchDelete();
                  setTargetTip(undefined);
                }}
              >
                branch
              </Button>
            </Space>
          )}
          destroyOnHidden
          fresh
          getPopupContainer={triggerNode => triggerNode.parentElement ?? triggerNode}
          onOpenChange={open => setTargetTip(open ? "del" : undefined)}
          open={targetTip === "del"}
          placement="bottomLeft"
          trigger="click"
        >
          <Button
            type={targetTip === "del" ? "primary" : "default"}
            size="small"
            onClick={event => event.stopPropagation()}
            onPointerDown={event => event.stopPropagation()}
          >
            del
          </Button>
        </Popover>
      </Space>
    </NodeToolbar>
  );
}
