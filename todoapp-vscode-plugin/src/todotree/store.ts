import immerStateCreator from "extends-zustand/immerStateCreator";

type TodoTreeNode = {
  id: string;
  id_parent: string | null;
  title: string;
  status: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  agent: 1 | 2 | 3 | 4;
};

type TodoTreeNodeCreateInput = Pick<TodoTreeNode, "title"> &
  Partial<Pick<TodoTreeNode, "id" | "id_parent" | "agent">>;

type TodoTreeStore = {
  todotree: {
    nodesById: Record<string, TodoTreeNode>;
  };
  todotreeActions: {
    nodeStatusLabelByStatus: Record<TodoTreeNode["status"], string>;
    nodeAgentLabelByAgent: Record<TodoTreeNode["agent"], string>;
    nodeAdd: (input: TodoTreeNodeCreateInput) => string | null;
    nodeTitleSet: (input: Pick<TodoTreeNode, "id" | "title">) => void;
    nodeStatusSet: (input: Pick<TodoTreeNode, "id" | "status">) => void;
    nodeAgentSet: (input: Pick<TodoTreeNode, "id" | "agent">) => void;
  };
};

const nodeFieldSet = <Field extends keyof Pick<TodoTreeNode, "title" | "status" | "agent">>({
  nodesById,
  id,
  field,
  fieldValue,
}: {
  nodesById: Record<string, TodoTreeNode>;
  id: TodoTreeNode["id"];
  field: Field;
  fieldValue: TodoTreeNode[Field];
}) => {
  const node = nodesById[id];

  if (node) {
    node[field] = fieldValue;
  }
};

const createTodoTreeStore = immerStateCreator<TodoTreeStore>((set) => ({
  todotree: {
    nodesById: {},
  },
  todotreeActions: {
    nodeStatusLabelByStatus: {
      1: "待确认",
      2: "待办",
      3: "未派工",
      4: "运行中",
      5: "已反馈",
      6: "已中断",
      7: "已完成",
      8: "阻塞",
      9: "已取消",
    },
    nodeAgentLabelByAgent: {
      1: "parent",
      2: "worker",
      3: "indexer",
      4: "tokener",
    },
    nodeAdd: ({ title, id_parent = null, id = crypto.randomUUID(), agent = 1 }) => {
      const titleNext = title.trim();

      if (!id || !titleNext) {
        return null;
      }

      let nodeAdded = false;

      set((state) => {
        const { nodesById } = state.todotree;

        if (nodesById[id]) {
          return;
        }

        if (id_parent) {
          if (!nodesById[id_parent]) {
            return;
          }
        }

        nodesById[id] = {
          id,
          id_parent,
          title: titleNext,
          status: 2,
          agent,
        };
        nodeAdded = true;
      });

      return nodeAdded ? id : null;
    },
    nodeTitleSet: ({ id, title }) => {
      const titleNext = title.trim();

      if (!titleNext) {
        return;
      }

      set((state) => {
        nodeFieldSet({
          nodesById: state.todotree.nodesById,
          id,
          field: "title",
          fieldValue: titleNext,
        });
      });
    },
    nodeStatusSet: ({ id, status }) => {
      set((state) => {
        nodeFieldSet({
          nodesById: state.todotree.nodesById,
          id,
          field: "status",
          fieldValue: status,
        });
      });
    },
    nodeAgentSet: ({ id, agent }) => {
      set((state) => {
        nodeFieldSet({
          nodesById: state.todotree.nodesById,
          id,
          field: "agent",
          fieldValue: agent,
        });
      });
    },
  },
}));

export default createTodoTreeStore;
