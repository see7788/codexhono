import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { StateCreator, StoreMutatorIdentifier } from "zustand";
import { createJSONStorage, persist, type PersistOptions, type StateStorage } from "zustand/middleware";

/**
 * 封装 cwd 范围内的 zustand persist。
 * 持久化文件固定写入当前进程工作目录下的 `.zustand/store.json`。
 */
export default function cwdPersist<
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  initializer: StateCreator<T, [...Mps, ["zustand/persist", unknown]], Mcs>,
): StateCreator<T, Mps, [["zustand/persist", T], ...Mcs]> {
  const toStorageFile = (name: string) =>
    join(process.cwd(), ".zustand", `${encodeURIComponent(name)}.json`);

  const storage: StateStorage = {
    getItem: (name) => {
      const file = toStorageFile(name);
      if (!existsSync(file)) return null;
      const text = readFileSync(file, "utf8");
      const data = JSON.parse(text) as { state?: unknown };
      if (data.state && typeof data.state === "object" && !Array.isArray(data.state)) {
        for (const key of Object.keys(data.state)) {
          if (key.endsWith("Actions")) delete (data.state as Record<string, unknown>)[key];
        }
      }
      return JSON.stringify(data);
    },
    setItem: (name, value) => {
      const file = toStorageFile(name);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, value, "utf8");
    },
    removeItem: (name) => {
      const file = toStorageFile(name);
      if (existsSync(file)) {
        rmSync(file);
      }
    },
  };
  const toJsonState = (value: unknown, seen = new WeakSet<object>()): unknown => {
    if (typeof value === "function" || typeof value === "symbol" || typeof value === "undefined") return undefined;
    if (value === null || typeof value !== "object") return value;
    if (seen.has(value)) return undefined;
    seen.add(value);
    if (Array.isArray(value)) return value.map(item => toJsonState(item, seen));
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return undefined;
    const entries = Object.entries(value);
    const jsonEntries = entries
      .filter(([key]) => !key.endsWith("Actions"))
      .map(([key, item]) => [key, toJsonState(item, seen)] as const)
      .filter(([, item]) => typeof item !== "undefined");
    if (entries.length > 0 && jsonEntries.length === 0) return undefined;
    return Object.fromEntries(jsonEntries);
  };

  return persist<T, Mps, Mcs>(initializer, {
    name: "store",storage: createJSONStorage<T>(() => storage),
    partialize: state => toJsonState(state) as T,
  });
}
