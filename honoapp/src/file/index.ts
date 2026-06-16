import fs from "node:fs/promises";
import { exec } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

const ignoredNames = new Set([".codegraph", ".codex", ".git", ".log", ".zustand", "build", "coverage", "dist", "node_modules"]);
const execAsync = promisify(exec);
const projectRoot = fileURLToPath(new URL("../../..", import.meta.url));

type FileTreeNode = {
  title: string;
  key: string;
  kind: "call" | "directory" | "file" | "info" | "symbol";
  isCrossFile?: boolean;
  nodeKind?: string;
  relation?: "cycle" | "in" | "out";
  isLeaf: boolean;
};

function projectRootNode(): FileTreeNode {
  return {
    title: path.basename(projectRoot) || projectRoot,
    key: projectRoot,
    kind: "directory",
    isLeaf: false,
  };
}

function pathRelative(fullpath: string) {
  return path.relative(projectRoot, fullpath).replaceAll(path.sep, "/");
}

async function codegraph(args: string[]) {
  const command = ["npx", "@colbymchenry/codegraph", ...args]
    .map(arg => JSON.stringify(arg))
    .join(" ");
  const result = await execAsync(command, {
    cwd: projectRoot,
    maxBuffer: 1024 * 1024 * 8,
    timeout: 30000,
    windowsHide: true,
  });
  return result.stdout.trim();
}

function symbolNodes(output: string, filePath: string): FileTreeNode[] {
  const nodes = output
    .split(/\r?\n/)
    .map((line, index): FileTreeNode | undefined => {
      const match = line.match(/^- `([^`]+)` \(([^)]+)\)(.*):(\d+)$/);
      if (!match) return undefined;
      const [, name, symbolKind, signature, lineNumber] = match;
      const symbolSignature = signature.replace(/—\s*$/, "").trim();
      return {
        title: `${name} (${symbolKind}) :${lineNumber}${symbolSignature ? ` ${symbolSignature}` : ""}`,
        key: `symbol:${Buffer.from(JSON.stringify({ filePath, index, lineNumber, name }), "utf8").toString("base64url")}:${name}`,
        kind: "symbol",
        nodeKind: symbolKind,
        isLeaf: false,
      };
    })
    .filter((node): node is FileTreeNode => !!node);

  if (nodes.length) return nodes;
  return [{
    title: "No codegraph symbols",
    key: `info:${keyHash(filePath)}:empty`,
    kind: "info",
    isLeaf: true,
  }];
}

function symbolNameGet(key: string) {
  return key.split(":").at(-1) ?? key;
}

function keyHash(key: string) {
  return createHash("sha1").update(key).digest("base64url").slice(0, 12);
}

function encodedJson<T>(value: T) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodedJson<T>(encoded: string): T | undefined {
  try {
    return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as T;
  } catch {
    return undefined;
  }
}

function callKeyState(key: string) {
  const prefix = "call:";
  if (!key.startsWith(prefix)) return;
  const [, , encodedSymbol, , , encodedVisited] = key.split(":");
  const symbol = encodedSymbol ? decodedJson<string>(encodedSymbol) : undefined;
  const visited = encodedVisited ? decodedJson<string[]>(encodedVisited) ?? [] : [];
  if (!symbol) return;
  return { symbol, visited };
}

function callEntryNode(entry: unknown) {
  if (!entry || typeof entry !== "object") return {};
  const record = entry as Record<string, unknown>;
  return record.node && typeof record.node === "object" ? record.node as Record<string, unknown> : record;
}

function callTitle(entry: unknown) {
  const node = callEntryNode(entry);
  const name = typeof node.name === "string" ? node.name : "unknown";
  const kind = typeof node.kind === "string" ? node.kind : "symbol";
  const startLine = typeof node.startLine === "number" ? ` :${node.startLine}` : "";
  return `${name} (${kind})${startLine}`;
}

function callSymbolName(entry: unknown) {
  const node = callEntryNode(entry);
  return typeof node.qualifiedName === "string"
    ? node.qualifiedName
    : typeof node.name === "string" ? node.name : "unknown";
}

function callNodeKind(entry: unknown) {
  const node = callEntryNode(entry);
  return typeof node.kind === "string" ? node.kind : "symbol";
}

function callFilePath(entry: unknown) {
  const node = callEntryNode(entry);
  return typeof node.filePath === "string" ? node.filePath : "";
}

async function callNodes(symbolKey: string): Promise<FileTreeNode[]> {
  const callState = callKeyState(symbolKey);
  const symbol = callState?.symbol ?? symbolNameGet(symbolKey);
  const visited = callState?.visited ?? [];
  const currentVisited = [...visited, symbol];
  try {
    const [callersOutput, calleesOutput] = await Promise.all([
      codegraph(["callers", "-p", ".", symbol, "--json"]),
      codegraph(["callees", "-p", ".", symbol, "--json"]),
    ]);
    const callersBody = JSON.parse(callersOutput) as { callers?: unknown[] };
    const calleesBody = JSON.parse(calleesOutput) as { callees?: unknown[] };
    const callers = callersBody.callers ?? [];
    const callees = calleesBody.callees ?? [];
    const entries = [
      ...callers.map(entry => ({ entry, relation: "caller" as const })),
      ...callees.map(entry => ({ entry, relation: "callee" as const })),
    ].filter(({ entry }) => callNodeKind(entry) !== "file");
    if (!entries.length) {
      return [{
        title: "No callers or callees",
        key: `info:${keyHash(symbolKey)}:empty`,
        kind: "info",
        isLeaf: true,
      }];
    }
    return entries.map(({ entry, relation }, index) => {
      const callSymbol = callSymbolName(entry);
      if (currentVisited.includes(callSymbol)) {
        return {
          title: callTitle(entry),
          key: `info:${keyHash(`${symbolKey}:${relation}:${callSymbol}:${index}`)}:cycle`,
          kind: "call" as const,
          isCrossFile: callFilePath(entry) !== "" && callFilePath(entry) !== symbolFilePath(symbolKey),
          nodeKind: callNodeKind(entry),
          relation: "cycle" as const,
          isLeaf: true,
        };
      }
      const encodedSymbol = encodedJson(callSymbol);
      const encodedVisited = encodedJson(currentVisited);
      return {
        title: callTitle(entry),
        key: `call:${relation}:${encodedSymbol}:${keyHash(symbolKey)}:${index}:${encodedVisited}`,
        kind: "call" as const,
        isCrossFile: callFilePath(entry) !== "" && callFilePath(entry) !== symbolFilePath(symbolKey),
        nodeKind: callNodeKind(entry),
        relation: relation === "caller" ? "in" as const : "out" as const,
        isLeaf: false,
      };
    });
  } catch (error) {
    return [{
      title: error instanceof Error ? error.message : String(error),
      key: `info:${keyHash(symbolKey)}:error`,
      kind: "info",
      isLeaf: true,
    }];
  }
}

async function fileSymbols(fullpath: string): Promise<FileTreeNode[]> {
  const relativePath = pathRelative(fullpath);
  try {
    const output = await codegraph(["node", "-p", ".", "--file", relativePath, relativePath, "--symbols-only"]);
    return symbolNodes(output, fullpath);
  } catch (error) {
    return [{
      title: error instanceof Error ? error.message : String(error),
      key: `info:${keyHash(fullpath)}:error`,
      kind: "info",
      isLeaf: true,
    }];
  }
}

function symbolFilePath(symbolKey: string) {
  if (symbolKey.startsWith("call:")) return "";
  if (!symbolKey.startsWith("symbol:")) return "";
  const encoded = symbolKey.split(":")[1];
  const body = encoded ? decodedJson<{ filePath?: string }>(encoded) : undefined;
  return typeof body?.filePath === "string" ? body.filePath : "";
}

async function fileChildren(fullpath?: string): Promise<FileTreeNode[]> {
  if (!fullpath) {
    return [projectRootNode()];
  }

  if (fullpath.startsWith("symbol:") || fullpath.startsWith("call:")) return callNodes(fullpath);

  const current = path.resolve(fullpath);
  const stat = await fs.stat(current);
  if (stat.isFile()) return fileSymbols(current);

  const entries = await fs.readdir(current, { withFileTypes: true });

  return entries
    .filter(entry => !ignoredNames.has(entry.name))
    .filter(entry => entry.isDirectory() || [".ts", ".tsx"].includes(path.extname(entry.name).toLowerCase()))
    .map(entry => ({
      title: entry.name,
      key: path.join(current, entry.name),
      kind: entry.isDirectory() ? "directory" as const : "file" as const,
      isLeaf: false,
    }))
    .sort((first, second) => first.kind === second.kind
      ? first.title.localeCompare(second.title)
      : first.kind === "directory" ? -1 : 1);
}

export default new Hono().basePath("/file")
  .get(
    "/",
    zValidator("query", z.object({
      path: z.string().optional(),
    })),
    async c => c.json(await fileChildren(c.req.valid("query").path)),
  );
