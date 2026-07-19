import { hc, type InferResponseType } from "hono/client";
import immerStateCreator from "extends-zustand/immerStateCreator";
import type { Key } from "react";
import type FileRouter from "honoapp/src/file";

const client = hc<typeof FileRouter>(location.origin);

type FileTree = InferResponseType<typeof client.file.$get, 200>;
type FileTreeNode = FileTree[number] & {
  children?: FileTree;
};

type FileState = {
  loadedKeys: Key[];
  opened: boolean;
  tree: FileTreeNode[];
};

type FileActions = {
  loadedKeysChange: (keys: Key[]) => void;
  nodeLoad: (node: FileTreeNode) => Promise<void>;
  treeOpen: () => Promise<void>;
};

function treeUpdate(nodes: FileTreeNode[], key: string, children: FileTree): FileTreeNode[] {
  return nodes.map(node => {
    if (node.key === key) {
      return { ...node, children };
    }

    if (node.children) {
      return { ...node, children: treeUpdate(node.children, key, children) };
    }

    return node;
  });
}

const entriesLoad = async (path?: string) => {
  const response = await client.file.$get({ query: path ? { path } : {} });
  return response.ok ? response.json() : [];
};

const createStore = immerStateCreator<{ file: FileState; fileActions: FileActions }>((set) => {
  const file: FileState = {
    loadedKeys: [],
    opened: false,
    tree: [],
  };
  const fileActions: FileActions = {
    loadedKeysChange: (keys) => set((state) => {
      state.file.loadedKeys = keys;
    }),
    nodeLoad: async (node) => {
      if (node.isLeaf) return;
      const children = await entriesLoad(node.key);
      set((state) => {
        state.file.tree = treeUpdate(state.file.tree, node.key, children);
        if (!state.file.loadedKeys.includes(node.key)) state.file.loadedKeys.push(node.key);
      });
    },
    treeOpen: async () => {
      const tree = await entriesLoad();
      set((state) => {
        state.file.tree = tree;
        state.file.loadedKeys = [];
        state.file.opened = true;
      });
    },
  };
  return { file, fileActions };
});

export default createStore;
