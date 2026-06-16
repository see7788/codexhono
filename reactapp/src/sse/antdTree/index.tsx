import { Button, Space, Tree } from "antd";
import appStore from "../../store";
import useHook from "./useHook";

export default function TreeView() {
    const push = appStore(state => state.sse);
    const pushActions = appStore(state => state.sseActions);
    const hook = useHook();

    return (
        <Tree
            expandedKeys={hook.expandedKeys}
            selectedKeys={[push.targetId]}
            titleRender={(node) => {
                const nodeId = String(node.key);
                return (
                    <Space size={6}>
                        <span>{`node ${nodeId} ${push.nodesObj[nodeId]?.string ?? ""}`}</span>
                        {nodeId === push.targetId ? (
                            <>
                                <Button
                                    size="small"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        pushActions.node.childAdd(push.targetId, "");
                                    }}
                                >
                                    nodeAdd
                                </Button>
                                <Button
                                    size="small"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        pushActions.drawer(push.targetId);
                                    }}
                                >
                                    nodeSet
                                </Button>
                                <Button
                                    size="small"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        void pushActions.chat(push.targetId);
                                    }}
                                >
                                    nodeChat
                                </Button>
                                <Button
                                    size="small"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        pushActions.node.delete(push.targetId);
                                    }}
                                >
                                    nodeDel
                                </Button>
                                <Button
                                    size="small"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        pushActions.node.branchDelete(push.targetId);
                                    }}
                                >
                                    branchDel
                                </Button>
                            </>
                        ) : null}
                    </Space>
                );
            }}
            treeData={hook.treeData}
            onDoubleClick={(_, node) => {
                pushActions.drawer(String(node.key));
            }}
            onSelect={(keys) => {
                const key = keys[0];
                if (key === undefined) return;
                pushActions.node.targetIdSet(String(key));
            }}
        />
    );
}
