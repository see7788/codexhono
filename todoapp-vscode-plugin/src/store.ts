import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import createTodoTreeStore from "./todotree/store";

export const useTodoAppStore = create<ReturnType<typeof createTodoTreeStore>>()(
  immer((...store) => ({
    ...createTodoTreeStore(...store),
  })),
);
