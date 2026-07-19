import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { Project } from "ts-morph";
import type { StateCreator } from "zustand";
import type { Store } from "../store";
import CodexOutput from "./output";
import { sourceSchema, type ProjectSource } from "./output/schema";
import projectSource from "./source";

export type TplStore = {
  tpl: {
    source: string;
  };
  tplActions: {
    outputMaterialize: (input: { hostname: string; port: number; workspacePath: string }) => void;
    sourceRead: (input: { hostname: string; port: number; workspacePath: string }) => {
      dirtyTargets: string[];
      existingTargets: string[];
      nodes: Record<string, string | number>;
      source: string;
      type: string;
    };
    sourceUpdate: (input: { hostname: string; port: number; source: string; workspacePath: string }) => void;
  };
};

const sourceInitializerGet = (input: { declaration: string; source: string }) => new Project({ skipAddingFilesFromTsConfig: true })
  .createSourceFile("codextpl.ts", input.source)
  .getVariableDeclarationOrThrow(input.declaration)
  .getInitializerOrThrow()
  .getText();

export default ((set, get) => {
  const defaultSourceGet = () => {
    return {
      source: JSON.stringify(projectSource, undefined, 2),
      type: "ProjectSource",
    };
  };
  const nodesGet = ({ hostname, port }: { hostname: string; port: number }) => ({
    ...projectSource.nodes,
    HOOK_ASSISTANT_COMMAND: ["node", JSON.stringify(join(fileURLToPath(new URL("../", import.meta.url)), "node_modules", "tsx", "dist", "cli.mjs")), JSON.stringify(fileURLToPath(new URL("../index.ts", import.meta.url))), "hook", JSON.stringify(hostname), port, "assistant"].join(" "),
    HOOK_USER_COMMAND: ["node", JSON.stringify(join(fileURLToPath(new URL("../", import.meta.url)), "node_modules", "tsx", "dist", "cli.mjs")), JSON.stringify(fileURLToPath(new URL("../index.ts", import.meta.url))), "hook", JSON.stringify(hostname), port, "user"].join(" "),
  });
  const sourceParse = (input: { nodes: Record<string, string | number>; source: string }) => {
    const parsed = sourceSchema.parse(new Function("nodes", `"use strict"; return (${input.source});`)(input.nodes));
    if (parsed.scope !== "project") throw new Error("Project template source must use scope: project");
    return parsed as ProjectSource;
  };
  const outputGet = (input: { hostname: string; port: number; workspacePath: string }) => new CodexOutput({
    path: `${input.workspacePath}/.codex`,
    source: sourceParse({ nodes: nodesGet(input), source: get().tpl.source }),
  });
  return {
    tpl: { source: defaultSourceGet().source },
    tplActions: {
      outputMaterialize: (input) => outputGet(input).materialize(),
      sourceRead: (input) => {
        const source = get().tpl.source;
        const output = outputGet(input);
        const status = output.filesStatus();
        sourceParse({ nodes: nodesGet(input), source });
        return {
          ...defaultSourceGet(),
          source,
          nodes: nodesGet(input),
          existingTargets: status.existing,
          dirtyTargets: status.dirty,
        };
      },
      sourceUpdate: ({ hostname, port, source }) => {
        const normalized = source.includes("const tpl")
          ? sourceInitializerGet({ declaration: "tpl", source })
          : source;
        sourceParse({ nodes: nodesGet({ hostname, port }), source: normalized });
        set((state) => {
          state.tpl.source = normalized;
        });
      },
    },
  };
}) satisfies StateCreator<Store, [["zustand/immer", never]], [], TplStore>;
