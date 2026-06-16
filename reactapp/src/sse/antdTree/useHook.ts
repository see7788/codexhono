import { useMemo, type Key } from "react";
import type { TreeDataNode } from "antd";
import appStore from "../../store";

export default () => {
    const push = appStore(state => state.sse);
    const treeData = useMemo(() => {
        const childrenByParentId: Record<string, string[]> = {};
        const roots: string[] = [];
        for (const [id, node] of Object.entries(push.nodesObj)) {
            if (node.parentId && push.nodesObj[node.parentId]) {
                childrenByParentId[node.parentId] ??= [];
                childrenByParentId[node.parentId].push(id);
            } else {
                roots.push(id);
            }
        }
        const nodeTreeGet = (id: string): TreeDataNode => {
            const node = push.nodesObj[id];
            return {
                children: childrenByParentId[id]?.sort((left, right) => Number(left) - Number(right)).map(nodeTreeGet),
                key: id,
                title: `node ${id} ${node?.string ?? ""}`,
            };
        };
        return roots.sort((left, right) => Number(left) - Number(right)).map(nodeTreeGet);
    }, [push.nodesObj]);
    const expandedKeys = useMemo(() => {
        const keys: Key[] = [];
        const nodes = [...treeData];
        for (let index = 0; index < nodes.length; index++) {
            const node = nodes[index];
            if (!node.children?.length) continue;
            keys.push(node.key);
            nodes.push(...node.children);
        }
        return keys;
    }, [treeData]);

    return {
        expandedKeys,
        treeData,
    };
};
