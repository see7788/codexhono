import { hc } from "hono/client";
import { create, type StoreApi } from "zustand";
import { immer } from "zustand/middleware/immer";
import type globalTplRouter from "honoapp/src/tpl/global";

const client = hc<typeof globalTplRouter>(location.origin);

type SourceSaveStatus = "idle" | "pending" | "saving" | "saved" | "failed";

type SourceRead = {
  dirtyTargets: string[];
  existingTargets: string[];
  nodes: Record<string, string | number>;
  source: string;
  type: string;
};

type GlobalTplState = {
  dirtyTargets: string[];
  existingTargets: string[];
  loading: boolean;
  source: string;
  sourceSaveStatus: SourceSaveStatus;
};

type GlobalTplActions = {
  outputMaterialize: () => Promise<void>;
  sourceChange: (source: string) => void;
  sourceLoad: () => Promise<void>;
  sourceSave: (source: string) => Promise<void>;
  sourceSaveStatusChange: (status: SourceSaveStatus) => void;
  statusLoad: () => Promise<void>;
};
type GlobalTplStore = GlobalTplState & GlobalTplActions;

const sourceTextGet = (data: SourceRead) => [
  `const nodes = ${JSON.stringify(data.nodes, null, 2)} as const;`,
  "",
  `type GlobalSource = ${data.type};`,
  "",
  `const source: GlobalSource = ${data.source};`,
].join("\n");

const sourceStateSet = (set: StoreApi<GlobalTplStore>["setState"], data: SourceRead) => {
  set({
    dirtyTargets: data.dirtyTargets,
    existingTargets: data.existingTargets,
    source: sourceTextGet(data),
    sourceSaveStatus: "saved",
  });
};

const globalTplStore = create<GlobalTplStore>()(immer((set) => ({
  dirtyTargets: [],
  existingTargets: [],
  loading: false,
  source: "",
  sourceSaveStatus: "idle",
  outputMaterialize: async () => {
    set((state) => {
      state.loading = true;
    });
    try {
      const response = await client.tpl.global.materialize.$post();
      if (!response.ok) throw new Error(await response.text());
      const statusResponse = await client.tpl.global.status.$get();
      if (!statusResponse.ok) throw new Error(await statusResponse.text());
      sourceStateSet(set, await statusResponse.json());
    } finally {
      set((state) => {
        state.loading = false;
      });
    }
  },
  sourceChange: (source) => set((state) => {
    state.source = source;
  }),
  sourceLoad: async () => {
    const response = await client.tpl.global.source.$get();
    if (!response.ok) throw new Error(await response.text());
    sourceStateSet(set, await response.json());
  },
  sourceSave: async (source) => {
    const response = await client.tpl.global.source.$put({ json: { source } });
    if (!response.ok) throw new Error(await response.text());
    set((state) => {
      state.sourceSaveStatus = "saved";
    });
  },
  sourceSaveStatusChange: (status) => set((state) => {
    state.sourceSaveStatus = status;
  }),
  statusLoad: async () => {
    const response = await client.tpl.global.status.$get();
    if (!response.ok) throw new Error(await response.text());
    sourceStateSet(set, await response.json());
  },
})));

export default globalTplStore;
