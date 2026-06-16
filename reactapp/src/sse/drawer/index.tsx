import { ApartmentOutlined, DeleteOutlined } from "@ant-design/icons";
import { Button, Input, Popover, Select, Space, Splitter } from "antd";
import { Drawer } from "extends-antd/src/Drawer";
import { useState } from "react";
import appStore from "../../store";
import useHook from "./useHook";

export default function PushDrawer() {
    const push = appStore(state => state.sse);
    const pushActions = appStore(state => state.sseActions);
    const hook = useHook();
    const [targetTip, targetTipSet] = useState<"nodeDel">();
    return (
        <Drawer
            autoFocus={false}
            destroyOnHidden
            getContainer={false}
            mask={false}
            onClose={() => pushActions.drawer(hook.nodeId)}
            open={!!push.drawer.isOpen && !!push.nodesObj[hook.nodeId]}
            placement="right"
            push={false}
            size="min(520px, calc(100vw - 72px))"
            styles={{
                body: {
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    padding: 16,
                },
                footer: {
                    padding: "10px 12px",
                },
            }}
            title={(
                <Space size={8}>
                    <span>{hook.nodeId ? `node ${hook.nodeId}` : ""}</span>
                    <Select
                        options={push.chat.items.map((chat, index) => ({ label: chat.label, value: index }))}
                        size="small"
                        style={{ width: 150 }}
                        value={push.chat.index}
                        onChange={(index) => appStore.setState((state) => {
                            if (!state.sse.chat.items[index]) return;
                            state.sse.chat.index = index;
                        })}
                    />
                </Space>
            )}
            footer={(
                <Space size={8} wrap>
                    <Button
                        size="small"
                        onClick={() => pushActions.node.childAdd(hook.nodeId, "")}
                    >
                        nodeAdd
                    </Button>
                    <Button
                        size="small"
                        onClick={() => pushActions.node.stringSet(hook.nodeId, push.nodesObj[hook.nodeId]?.string ?? "")}
                    >
                        nodeSet
                    </Button>
                    <Button loading={hook.isChatSubmitting} size="small" onClick={hook.chatSubmit}>nodeChat</Button>
                    <Popover
                        content={(
                            <Space size={6}>
                                <Button
                                    icon={<DeleteOutlined />}
                                    size="small"
                                    title="current node"
                                    onClick={() => {
                                        pushActions.node.delete(hook.nodeId);
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
                                        pushActions.node.branchDelete(hook.nodeId);
                                        targetTipSet(undefined);
                                    }}
                                >
                                    branch
                                </Button>
                            </Space>
                        )}
                        destroyOnHidden
                        fresh
                        onOpenChange={open => targetTipSet(open ? "nodeDel" : undefined)}
                        open={targetTip === "nodeDel"}
                        placement="topLeft"
                        trigger="click"
                    >
                        <Button
                            type={targetTip === "nodeDel" ? "primary" : "default"}
                            size="small"
                        >
                            nodeDel
                        </Button>
                    </Popover>
                </Space>
            )}
        >
            <Splitter layout="vertical" style={{ flex: 1, minHeight: 0 }}>
                <Splitter.Panel defaultSize="34%" min="15%" max="70%">
                    <div
                        style={{
                            border: "1px solid #d9d9d9",
                            borderRadius: 6,
                            boxSizing: "border-box",
                            height: "100%",
                            overflow: "auto",
                            padding: 8,
                            whiteSpace: "pre-wrap",
                        }}
                    >
                        {hook.contextText}
                    </div>
                </Splitter.Panel>
                <Splitter.Panel defaultSize="33%" min="15%">
                    <Input.TextArea
                        style={{ height: "100%", resize: "none" }}
                        value={push.nodesObj[hook.nodeId]?.string ?? ""}
                        onChange={event => pushActions.node.stringSet(hook.nodeId, event.target.value)}
                    />
                </Splitter.Panel>
                {push.chat.temp.trim() ? (
                    <Splitter.Panel min="15%">
                        <div
                            style={{
                                border: "1px solid #d9d9d9",
                                borderRadius: 6,
                                boxSizing: "border-box",
                                height: "100%",
                                overflow: "auto",
                                padding: 8,
                                whiteSpace: "pre-wrap",
                            }}
                        >
                            {push.chat.temp}
                        </div>
                    </Splitter.Panel>
                ) : null}
            </Splitter>
        </Drawer>
    );
}
