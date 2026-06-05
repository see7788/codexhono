import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

const ignoredNames = new Set([".git", "build", "coverage", "dist", "node_modules"]);

type FileTreeNode = {
  title: string;
  key: string;
  kind: "directory" | "file";
  isLeaf: boolean;
};

function filesystemRoots(): FileTreeNode[] {
  if (process.platform !== "win32") {
    return [{
      title: "/",
      key: "/",
      kind: "directory",
      isLeaf: false,
    }];
  }

  return "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    .split("")
    .map(letter => `${letter}:\\`)
    .filter(existsSync)
    .map(root => ({
      title: root,
      key: root,
      kind: "directory" as const,
      isLeaf: false,
    }));
}

async function fileChildren(fullpath?: string): Promise<FileTreeNode[]> {
  if (!fullpath) {
    return filesystemRoots();
  }

  const current = path.resolve(fullpath);
  const entries = await fs.readdir(current, { withFileTypes: true });

  return entries
    .filter(entry => !ignoredNames.has(entry.name))
    .filter(entry => entry.isDirectory() || [".ts", ".tsx"].includes(path.extname(entry.name).toLowerCase()))
    .map(entry => ({
      title: entry.name,
      key: path.join(current, entry.name),
      kind: entry.isDirectory() ? "directory" as const : "file" as const,
      isLeaf: !entry.isDirectory(),
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
