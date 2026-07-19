import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { Project } from "ts-morph";
import type { StateCreator } from "zustand";
import type { Store } from "../../store";
import CodexOutput from "../output";
import { sourceSchema, type GlobalSource } from "../output/schema";
import globalSource from "./source";

export type GlobalTplStore = {
  globalTpl: {
    source: string;
  };
  globalTplActions: {
    outputMaterialize: () => void;
    sourceRead: () => {
      dirtyTargets: string[];
      existingTargets: string[];
      nodes: Record<string, string | number>;
      source: string;
      type: string;
    };
    sourceUpdate: (input: { source: string }) => void;
  };
};

const sourceInitializerGet = (input: { declaration: string; source: string }) => new Project({ skipAddingFilesFromTsConfig: true })
  .createSourceFile("globaltpl.ts", input.source)
  .getVariableDeclarationOrThrow(input.declaration)
  .getInitializerOrThrow()
  .getText();

const sourceDefaultGet = () => {
  return {
    source: JSON.stringify(globalSource, undefined, 2),
    type: "GlobalSource",
  };
};

const sourcePath = join(homedir(), ".codex", ".extends-codex-source.json");
const sourceRead = () => {
  if (!existsSync(sourcePath)) return sourceDefaultGet().source;
  const persisted = JSON.parse(readFileSync(sourcePath, "utf8")) as { source?: unknown };
  if (typeof persisted.source !== "string") throw new Error(`Invalid global template source: ${sourcePath}`);
  return persisted.source;
};
const sourceWrite = (source: string) => {
  mkdirSync(dirname(sourcePath), { recursive: true });
  writeFileSync(sourcePath, JSON.stringify({ source }, undefined, 2) + "\n", "utf8");
};

if (!existsSync(sourcePath)) sourceWrite(sourceDefaultGet().source);

export default ((set, get) => {
  const nodesGet = () => globalSource.nodes;
  const sourceParse = (input: { source: string }) => {
    const parsed = sourceSchema.parse(new Function("nodes", `"use strict"; return (${input.source});`)(nodesGet()));
    if (parsed.scope !== "global") throw new Error("Global template source must use scope: global");
    return parsed as GlobalSource;
  };
  const outputGet = () => new CodexOutput({
    path: join(homedir(), ".codex"),
    source: sourceParse({ source: get().globalTpl.source }),
  });
  return {
    globalTpl: { source: sourceRead() },
    globalTplActions: {
      outputMaterialize: () => outputGet().materialize(),
      sourceRead: () => {
        const source = get().globalTpl.source;
        const status = outputGet().filesStatus();
        return {
          dirtyTargets: status.dirty,
          existingTargets: status.existing,
          nodes: nodesGet(),
          source,
          type: sourceDefaultGet().type,
        };
      },
      sourceUpdate: ({ source }) => {
        const normalized = source.includes("const source")
          ? sourceInitializerGet({ declaration: "source", source })
          : source;
        sourceParse({ source: normalized });
        sourceWrite(normalized);
        set({ globalTpl: { source: normalized } });
      },
    },
  };
}) satisfies StateCreator<Store, [["zustand/immer", never]], [], GlobalTplStore>;
