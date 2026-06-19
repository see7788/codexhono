import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import createFile from "./file/store";
import createSse from "./sse/store";
import createTpl from "./tpl/store";
export default create<ReturnType<typeof createFile>
  & ReturnType<typeof createSse>
  & ReturnType<typeof createTpl>>()(persist(immer((set, get, api) => {
    return {
      ...createFile(set, get, api),
      ...createSse(set, get, api),
      ...createTpl(set, get, api),
    }
  }), {
    name: "codexhono",
    storage: createJSONStorage(() => localStorage),
    partialize: store => {
      return Object.fromEntries(
        Object.entries(store).filter(([storeKey]) => !storeKey.endsWith("Actions")),
      )
    },
    onRehydrateStorage: () => (state) => { },
  }));