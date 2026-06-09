import cwdPersist from "extendszustand-lib/src/cwdPersist";
import { createStore } from "zustand";
import { immer } from "zustand/middleware/immer";
import createChatStore, { type Store as ChatStore } from "./chat/store";
import createTplStore, { type Store as TplStore } from "./tpl/store";

type AppStore = ChatStore & TplStore;

const states = createStore<AppStore>()(
  cwdPersist(
    immer((set, get, api) => ({
      ...createChatStore(set, get, api),
      ...createTplStore(set, get, api),
    }))
  ),
);

export default states;
