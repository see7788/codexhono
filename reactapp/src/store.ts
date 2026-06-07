import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import createFile from "./file/store";
import createSse from "./sse/store";
import createTpl from "./tpl/store";

export type AppStore = ReturnType<typeof createFile> & ReturnType<typeof createSse> & ReturnType<typeof createTpl>;

const store = create<AppStore>()(persist(immer((set, get, api) => {
  return {
    ...createFile(set, get, api),
    ...createSse(set, get, api),
    ...createTpl(set, get, api),
  }
}), {
  name: "codexhono",
  storage: createJSONStorage(() => localStorage),
  partialize: ({ sse }) => ({
    sse: {
      layoutDirection: sse.layoutDirection,
      mainColor: sse.mainColor,
      drawerChatTarget: sse.drawerChatTarget,
      drawerSize: sse.drawerSize,
      hookPushReceive: sse.hookPushReceive,
      maxId: sse.maxId,
      nodesState: sse.nodesState,
      targetId: sse.targetId,
    },
  }),
  merge: (persisted, current) => {
    const data = persisted as Partial<AppStore> & { xyflow2?: Partial<AppStore["sse"]> };
    return {
      ...current,
      sse: {
        ...current.sse,
        ...data.xyflow2,
        ...data.sse,
      },
    };
  },
  onRehydrateStorage: () => (state) => {
    state?.sseActions.viewReset();
  },
}));

export default store;
