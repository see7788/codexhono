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
    const push = appStore(state => state.sse);
    const pushActions = appStore(state => state.sseActions);
    const updateNodeInternals = useUpdateNodeInternals();
    const [targetTip, targetTipSet] = useState<"nodeDel">();

    useEffect(() => {
        updateNodeInternals(id);
    }, [data.childHandlePosition, data.parentHandlePosition, id, updateNodeInternals]);

    return (
        <div
            className="context-node"
            onDoubleClickCapture={(event) => {
                event.stopPropagation();
                pushActions.drawer(id);
            }}
        >
            {push.targetId === id ? (
                <NodeToolbar align="start" isVisible position={Position.Top}>
                    <Space className="nodrag nopan" size={6}>
                        <Button
                            size="small"
                            onClick={(event) => {
                                event.stopPropagation();
                                pushActions.node.childAdd(push.targetId, "");
                            }}
                            onPointerDown={event => event.stopPropagation()}
                        >
                            nodeAdd
                        </Button>
                        <Button
                            size="small"
                            onClick={(event) => {
                                event.stopPropagation();
                                pushActions.drawer(push.targetId);
                            }}
                            onPointerDown={event => event.stopPropagation()}
                        >
                            nodeSet
                        </Button>
                        <Button
                            size="small"
                            onClick={(event) => {
                                event.stopPropagation();
                                void pushActions.chat(push.targetId);
                            }}
                            onPointerDown={event => event.stopPropagation()}
                        >
                            nodeChat
                        </Button>
                        <Popover
                            content={(
                                <Space className="nodrag nopan" size={6}>
                                    <Button
                                        icon={<DeleteOutlined />}
                                        size="small"
                                        title="current node"
                                        onClick={() => {
                                            pushActions.node.delete(push.targetId);
                                            targetTipSet(undefined);
                                        }}
                                    >
                                        current
                                    </Button>
                                    <Button
                                        icon={<ApartmentOutlined />}
                                        size="small"
                                        title="current node and child nodes"
                                        onClick={() => {
                                            pushActions.node.branchDelete(push.targetId);
                                            targetTipSet(undefined);
                                        }}
                                    >
                                        branch
                                    </Button>
                                </Space>
                            )}
                            destroyOnHidden
                            fresh
                            getPopupContainer={triggerNode => triggerNode.parentElement ?? triggerNode}
                            onOpenChange={open => targetTipSet(open ? "nodeDel" : undefined)}
                            open={targetTip === "nodeDel"}
                            placement="bottomLeft"
                            trigger="click"
                        >
                            <Button
                                type={targetTip === "nodeDel" ? "primary" : "default"}
                                size="small"
                                onClick={event => event.stopPropagation()}
                                onPointerDown={event => event.stopPropagation()}
                            >
                                nodeDel
                            </Button>
                        </Popover>
                    </Space>
                </NodeToolbar>
            ) : null}
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
