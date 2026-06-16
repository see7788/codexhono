import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import createFile from "./file/store";
import createSse from "./sse/store";
import createTpl from "./tpl/store";

type AppStore = ReturnType<typeof createFile>
  & ReturnType<typeof createSse>
  & ReturnType<typeof createTpl>

function storePartialize(store: AppStore) {
  return Object.fromEntries(
    Object.entries(store).filter(([storeKey]) => !storeKey.endsWith("Actions")),
  );
}

const store = create<AppStore>()(persist(immer((set, get, api) => {
  return {
    ...createFile(set, get, api),
    ...createSse(set, get, api),
    ...createTpl(set, get, api),
  }
}), {
  name: "codexhono",
  storage: createJSONStorage(() => localStorage),
  partialize: storePartialize,
  onRehydrateStorage: () => (state) => {
  },
}));

export default store;
