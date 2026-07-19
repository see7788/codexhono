#!/usr/bin/env tsx

import { serve } from "@hono/node-server";
import type { NetworkInterfaceInfo } from "node:os";
import { networkInterfaces } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { z } from "zod";
import routersCreate from "./routers";
import store from "./store";
import hookReceive from "./sse/hookReceive";

export async function serviceStart(input: { workspacePath: string }) {
  resolve(input.workspacePath).replace(/^([a-z]):/, (_, drive: string) => `${drive.toUpperCase()}:`);
  privateHostnameGet();
  let port = 3000;
  try {
    store.getState().globalTplActions.outputMaterialize();
  } catch (error) {
    console.warn(`Global Codex materialization deferred: ${error instanceof Error ? error.message : error}`);
  }
  const routers = await routersCreate();
  return new Promise<{ origin: string; stop: () => Promise<void> }>((resolveService, rejectService) => {
    const listen = () => {
      const server = serve({ fetch: routers.fetch, hostname: "0.0.0.0", port }, () => {
        server.off("error", errorHandle);
        store.getState().tplActions.outputMaterialize({ hostname: store.getState().runtimeAction.hostnameGet(), port: store.getState().runtimeAction.portGet(), workspacePath: store.getState().runtimeAction.workspacePathGet() });
        resolveService({
          origin: `http://${store.getState().runtimeAction.hostnameGet()}:${port}`,
          stop: () => new Promise<void>((resolveStop, rejectStop) => {
            server.close((error) => error ? rejectStop(error) : resolveStop());
            (server as typeof server & { closeAllConnections?: () => void }).closeAllConnections?.();
          }),
        });
      });
      const errorHandle = (error: Error & { code?: unknown }) => {
        server.off("error", errorHandle);
        if (error.code === "EADDRINUSE") {
          port += 1;
          listen();
          return;
        }
        rejectService(error);
      };
      server.on("error", errorHandle);
    };
    listen();
  });
}

const privateHostnameGet = () => {
  const addresses = Object.values(networkInterfaces())
    .flat()
    .filter((address): address is NetworkInterfaceInfo => (
      address !== undefined && address.family === "IPv4" && !address.internal
    ))
    .map((address) => address.address);
  const hostname = addresses.find((address) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address));
  if (!hostname) throw new Error(`Cannot find a private LAN IPv4 address. Available external IPv4 addresses: ${addresses.join(", ")}`);
  return hostname;
};

const hookArgsSchema = z.object({
  command: z.literal("hook"),
  hostname: z.string().min(1),
  port: z.coerce.number().int().positive(),
  role: z.enum(["user", "assistant"]),
});

const stdinRead = async () => {
  let stdin = "";
  for await (const chunk of process.stdin) stdin += chunk;
  return stdin;
};

const entryPath = process.argv[1];
if (entryPath && pathToFileURL(entryPath).href === import.meta.url) {
  const hookArgs = hookArgsSchema.safeParse({
    command: process.argv[2],
    hostname: process.argv[3],
    port: process.argv[4],
    role: process.argv[5],
  });
  const entry = hookArgs.success
    ? hookReceive({ ...hookArgs.data, stdin: await stdinRead() })
    : serviceStart({ workspacePath: process.cwd() }).then((service) => {
      process.once("SIGINT", () => service.stop());
      process.once("SIGTERM", () => service.stop());
    });
  entry
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
