import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import createFile from "./file/store";
import createSse from "./sse/store";
import createSseDrawer from "./sse/drawer/stroe"
import createTpl from "./tpl/store";

export type AppStore = ReturnType<typeof createFile>
  & ReturnType<typeof createSse>
  & ReturnType<typeof createSseDrawer>
  & ReturnType<typeof createTpl>;

const store = create<AppStore>()(persist(immer((set, get, api) => {
  return {
    ...createFile(set, get, api),
    ...createSse(set, get, api),
    ...createSseDrawer(set, get, api),
    ...createTpl(set, get, api),
  }
}), {
  name: "codexhono",
  storage: createJSONStorage(() => localStorage),
  partialize: ({ sse }) => ({
    sse: {
      layoutDirection: sse.layoutDirection,
      mainColor: sse.mainColor,
      chatTargetIndex: sse.chatTargetIndex,
      drawerSize: sse.drawerSize,
      hookPushReceive: sse.hookPushReceive,
      maxId: sse.maxId,
      nodesState: sse.nodesState,
      targetId: sse.targetId,
    },
  }),
  merge: (persisted, current) => {
    const data = persisted as Partial<AppStore> & {
      sse?: Partial<AppStore["sse"]> & { drawerChatTarget?: string };
      xyflow2?: Partial<AppStore["sse"]> & { drawerChatTarget?: string };
    };
    const sse = {
      ...current.sse,
      ...data.xyflow2,
      ...data.sse,
    };
    const legacyChatTarget = data.sse?.drawerChatTarget ?? data.xyflow2?.drawerChatTarget;
    if (typeof sse.chatTargetIndex !== "number") {
      sse.chatTargetIndex = legacyChatTarget === "agent.draw"
        ? 1
        : legacyChatTarget === "agent.codexcli"
          ? 2
          : 0;
    }
    delete (sse as { drawerChatTarget?: string }).drawerChatTarget;
    return {
      ...current,
      sse,
    };
  },
  onRehydrateStorage: () => (state) => {
    state?.sseActions.viewReset();
  },
}));

export default store;
