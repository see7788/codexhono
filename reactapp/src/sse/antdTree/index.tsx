import { Tree, type TreeDataNode } from "antd";
import type { Key } from "react";
import appStore from "../../store";

export default function TreeView() {
  const sse = appStore(state => state.sse);
  const sseActions = appStore(state => state.sseActions);
  const treeData = treeDataGet(sse);
  const expandedKeys = treeExpandedKeysGet(treeData);

  return (
    <Tree
      expandedKeys={expandedKeys}
      selectedKeys={[sse.targetId]}
      treeData={treeData}
      onDoubleClick={(_, node) => sseActions.drawerNodeToggle(String(node.key))}
      onSelect={(keys) => {
        const key = keys[0];
        if (key !== undefined) sseActions.nodeSelect(String(key));
      }}
    />
  );
}

function treeDataGet(flow: ReturnType<typeof appStore.getState>["sse"]) {
  const childrenByParentId: Record<string, string[]> = {};
  const roots: string[] = [];
  for (const [id, node] of Object.entries(flow.nodesState)) {
    if (node.parentId && flow.nodesState[node.parentId]) {
      childrenByParentId[node.parentId] ??= [];
      childrenByParentId[node.parentId].push(id);
    } else {
      roots.push(id);
    }
  }
  const nodeIdsSort = (ids: string[]) => ids.sort((left, right) => Number(left) - Number(right));
  const nodeTreeGet = (id: string): TreeDataNode => {
    const node = flow.nodesState[id];
    return {
      children: nodeIdsSort(childrenByParentId[id] ?? []).map(nodeTreeGet),
      key: id,
      title: `node ${id} ${node?.data ?? ""}`,
    };
  };
  return nodeIdsSort(roots).map(nodeTreeGet);
}

function treeExpandedKeysGet(treeData: TreeDataNode[]) {
  const keys: Key[] = [];
  const walk = (nodes: TreeDataNode[]) => {
    for (const node of nodes) {
      if (!node.children?.length) continue;
      keys.push(node.key);
      walk(node.children);
    }
  };
  walk(treeData);
  return keys;
}
