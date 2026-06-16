import cwdPersist from "extends-zustand/src/cwdPersist";
import { createStore } from "zustand";
import { immer } from "zustand/middleware/immer";
import createChatStore from "./chat/store";
import createTplStore from "./tpl/store";
const states = createStore<ReturnType<typeof createTplStore>&ReturnType<typeof createChatStore>>()(
  cwdPersist(
    immer((set, get, api) => ({
      ...createChatStore(set, get, api),
      ...createTplStore(set, get, api),
    }))
  ),
);

export default states;
