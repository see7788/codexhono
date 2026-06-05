#!/usr/bin/env tsx

import { serve } from "@hono/node-server";
import { spawnSync } from "node:child_process";
import runtime from "./runtime";
import store from "./store";
import routers from "./routers";
const listenHostname = "0.0.0.0";

const main = async () => {
  runtime.devInit();
  setInterval(() => {
    const runGit = (args: string[]) => spawnSync("git", args, {
      cwd: runtime.CWD_PATH,
      encoding: "utf8",
      windowsHide: true,
    });
    const branch = runGit(["branch", "--show-current"]);
    if (branch.error || branch.status !== 0) {
      console.error("honocodex git branch check failed:", branch.error ?? branch.stderr);
      return;
    }
    if (!["main", "master"].includes(branch.stdout.trim())) return;

    const status = runGit(["status", "--short"]);
    if (status.error) {
      console.error("honocodex git auto commit failed:", status.error);
      return;
    }
    if (status.status !== 0) {
      console.error("honocodex git status failed:", status.stderr || status.stdout);
      return;
    }
    const files = status.stdout.trim();
    if (!files) return;

    const add = runGit(["add", "-A"]);
    if (add.error || add.status !== 0) {
      console.error("honocodex git add failed:", add.error ?? add.stderr);
      return;
    }

    const commit = runGit([
      "commit",
      "-m",
      "chore: auto checkpoint",
      "-m",
      `Changed files:\n${files}`,
    ]);
    if (commit.status === 0) {
      console.log("honocodex git auto committed");
      return;
    }
    console.error("honocodex git commit failed:", commit.stderr || commit.stdout);
  }, 30 * 60 * 1000);
  const server = await new Promise<ReturnType<typeof serve>>((resolve, reject) => {
    const listen = () => {
      const candidate = serve(
        {
          fetch: routers.fetch,
          hostname: listenHostname,
          port: runtime.PORT,
        },
        () => {
          candidate.off("error", handleError);
          resolve(candidate);
        },
      );
      const handleError = (error: Error & { code?: unknown }) => {
        candidate.off("error", handleError);
        if (error.code === "EADDRINUSE") {
          runtime.portNext();
          listen();
          return;
        }
        reject(error);
      };
      candidate.on("error", handleError);
    };
    listen();
  });
  server.on("error", (error) => {
    console.error("honocodex server failed:", error);
    process.exit(1);
  });
  console.error(`honocodex_mcpserver listening on ${runtime.ORIGIN}`);
  try {
    store.getState().tplActions.codexTplMaterialize();
    console.log("honocodex initialized .codex");
  } catch (error) {
    console.error("honocodex failed to initialize .codex:", error);
  }
  const closeServer = () => {
    const nodeServer = server as typeof server & {
      closeAllConnections?: () => void;
    };
    server.close(() => {
      process.exit(0);
    });
    nodeServer.closeAllConnections?.();
  };
  process.once("SIGINT", closeServer);
  process.once("SIGTERM", closeServer);
};
void main();
//web


//web+codex//+electron|vscode插件