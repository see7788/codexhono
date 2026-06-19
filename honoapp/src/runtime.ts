import { serve } from "@hono/node-server";
import { existsSync } from "node:fs";
import type { Hono } from "hono";
import type { NetworkInterfaceInfo } from "node:os";
import { networkInterfaces } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pkg from "../package.json"
class Runtime {
  WORKSPACE_PATH: string;
  CODEX_PATH: string;
  ZUSTAND_PATH: string;
  HOSTNAME = "";
  PORT = 3000;
  ORIGIN = "";
  HONO_PATH: string;
  TSX_CLI_PATH: string;
  HOOK_USER_COMMAND = "";
  HOOK_ASSISTANT_COMMAND = "";
  constructor() {
    this.WORKSPACE_PATH = this.workspacePathGet();
    this.HONO_PATH = this.pathNormalize(fileURLToPath(new URL("..", import.meta.url)));
    this.CODEX_PATH = join(this.WORKSPACE_PATH, ".codex");
    this.ZUSTAND_PATH = join(this.WORKSPACE_PATH, ".zustand");
    this.TSX_CLI_PATH = join(this.HONO_PATH, "node_modules", "tsx", "dist", "cli.mjs");
  }

  async init(routers: Hono) {
    this.HOSTNAME = this.privateHostnameGet();
    this.portSync();
    return new Promise<ReturnType<typeof serve>>((resolve, reject) => {
      const listen = () => {
        const candidate = serve(
          {
            fetch: routers.fetch,
            hostname: "0.0.0.0",
            port: this.PORT,
          },
          () => {
            candidate.off("error", handleError);
            resolve(candidate);
          },
        );
        const handleError = (error: Error & { code?: unknown }) => {
          candidate.off("error", handleError);
          if (error.code === "EADDRINUSE") {
            this.PORT += 1;
            this.portSync();
            listen();
            return;
          }
          reject(error);
        };
        candidate.on("error", handleError);
      };
      listen();
    }).then((server) => {
      server.on("error", (error) => {
        console.error(pkg.name+" server failed:", error);
        process.exit(1);
      });
      console.error(`${pkg.name} listening on ${this.ORIGIN}`);
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
      return server;
    });
  }
  private portSync() {
    const hookCommand = [
      "node",
      JSON.stringify(this.toCommandPath(this.TSX_CLI_PATH)),
      JSON.stringify(this.toCommandPath(join(this.HONO_PATH, "src", "sse", "hookReceive.ts"))),
      "hook",
      JSON.stringify(this.toCommandPath(this.CODEX_PATH)),
      JSON.stringify(this.toCommandPath(this.HONO_PATH)),
      JSON.stringify(this.HOSTNAME),
      this.PORT,
    ].join(" ");
    this.ORIGIN = `http://${this.HOSTNAME}:${this.PORT}`;
    this.HOOK_USER_COMMAND = `${hookCommand} user`;
    this.HOOK_ASSISTANT_COMMAND = `${hookCommand} assistant`;
  }

  private privateHostnameGet() {
    const addresses = Object.values(networkInterfaces())
      .flat()
      .filter((address): address is NetworkInterfaceInfo => (
        address !== undefined && address.family === "IPv4" && !address.internal
      ))
      .map((address) => address.address);
    const hostname = addresses.find((address) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address));
    if (!hostname) {
      throw new Error(`Cannot find a private LAN IPv4 address. Available external IPv4 addresses: ${addresses.join(", ")}`);
    }
    return hostname;
  }

  private workspacePathGet() {
    let currentPath = this.pathNormalize(process.cwd());
    let workspacePath = currentPath;
    while (true) {
      if (existsSync(join(currentPath, "package.json"))) {
        workspacePath = currentPath;
      }
      const parentPath = this.pathNormalize(resolve(currentPath, ".."));
      if (parentPath === currentPath) break;
      currentPath = parentPath;
    }
    return workspacePath;
  }

  private toCommandPath(value: string) {
    return value.replaceAll("\\", "/");
  }

  private pathNormalize(value: string) {
    return resolve(value).replace(/^([a-z]):/, (_, drive: string) => `${drive.toUpperCase()}:`);
  }
}

export default new Runtime();
