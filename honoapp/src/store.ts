import cwdPersist from "extends-zustand/src/cwdPersist";
import { createStore } from "zustand";
import { immer } from "zustand/middleware/immer";
import createChatStore from "./chat/store";
import createTplStore from "./tpl/store";
export default  createStore<ReturnType<typeof createTplStore>&ReturnType<typeof createChatStore>>()(
  cwdPersist(
    immer((set, get, api) =>{
      return {
      ...createChatStore(set, get, api),
      ...createTplStore(set, get, api),
    }
    })
  ),
);

