import { hc } from "hono/client";
import immerStateCreator from "extendszustand-lib/src/immerStateCreator";
import type codextplRouter from "honoapp/src/tpl";

const client = hc<typeof codextplRouter>(location.origin);

type SourceLoadResult = {
  nodes: Record<string, string | number>;
  source: string;
  type: string;
};
type SourceSaveStatus = "idle" | "pending" | "saving" | "saved" | "failed";

type Store = {
  existingTargets: string[];
  loading: boolean;
  source: string;
  sourceSaveStatus: SourceSaveStatus;
  sourceSaveTick: number;
  sourceChange: (source: string) => void;
  sourceLoad: () => Promise<void>;
  sourceSave: (source: string) => Promise<void>;
  sourceSaveStatusChange: (status: SourceSaveStatus) => void;
  sourceSaveTickNext: () => void;
  targetDelete: (target: string) => Promise<void>;
  targetPut: (target: string, preview: string) => Promise<void>;
};

const sourceTextGet = (data: SourceLoadResult) => [
  `const nodes = ${JSON.stringify(data.nodes, null, 2)} as const;`,
  "",
  `type Tpl = ${data.type};`,
  "",
  `const tpl: Tpl = ${data.source};`,
].join("\n");

const createStore = immerStateCreator<{ tpl: Store }>((set) => {
  const existingTargetDelete = (target: string) => set((state) => {
    state.tpl.existingTargets = state.tpl.existingTargets.filter(item => item !== target);
  });
  const existingTargetPut = (target: string) => set((state) => {
    if (!state.tpl.existingTargets.includes(target)) state.tpl.existingTargets.push(target);
  });
  const store: Store = {
    existingTargets: [],
    loading: false,
    source: "",
    sourceSaveStatus: "idle",
    sourceSaveTick: 0,
    sourceChange: (source) => set((state) => {
      state.tpl.source = source;
    }),
    sourceLoad: async () => {
      const response = await client.tpl.source.$get();
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      set((state) => {
        state.tpl.existingTargets = data.existingTargets;
        state.tpl.source = sourceTextGet(data);
        state.tpl.sourceSaveStatus = "saved";
      });
    },
    sourceSave: async (source) => {
      const response = await client.tpl.source.$post({ json: source });
      if (!response.ok) throw new Error(await response.text());
      set((state) => {
        state.tpl.sourceSaveStatus = "saved";
      });
    },
    sourceSaveStatusChange: (status) => set((state) => {
      state.tpl.sourceSaveStatus = status;
    }),
    sourceSaveTickNext: () => set((state) => {
      state.tpl.sourceSaveTick += 1;
    }),
    targetDelete: async (target) => {
      set((state) => {
        state.tpl.loading = true;
      });
      try {
        const response = target === "agentsMd"
          ? await client.tpl.agentsMd.$delete()
          : target === "configToml"
            ? await client.tpl.configToml.$delete()
            : await client.tpl.skills[":dir"].$delete({
              param: { dir: target.slice("skill:".length) },
            });
        if (!response.ok) throw new Error(await response.text());
        existingTargetDelete(target);
      } finally {
        set((state) => {
          state.tpl.loading = false;
        });
      }
    },
    targetPut: async (target, preview) => {
      set((state) => {
        state.tpl.loading = true;
      });
      try {
        const response = target === "agentsMd"
          ? await client.tpl.agentsMd.$put({ json: preview })
          : target === "configToml"
            ? await client.tpl.configToml.$put({ json: preview })
            : await client.tpl.skills[":dir"].$put({
              param: { dir: target.slice("skill:".length) },
              json: preview,
            });
        if (!response.ok) throw new Error(await response.text());
        existingTargetPut(target);
      } finally {
        set((state) => {
          state.tpl.loading = false;
        });
      }
    },
  };
  return { tpl: store };
});

export default createStore;
