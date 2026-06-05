#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { EnvMakeOptions } from "../src/runtime.js";
import { honoStartOptions } from "./public.js";

type ProcessInfo = {
  ProcessId: number | string;
  ParentProcessId: number | string;
  CommandLine?: string | null;
};

const dir = dirname(fileURLToPath(import.meta.url));
const honoPath = resolve(dir, "..");
const binName = basename(process.argv[1] ?? "");
const commandArg = process.argv[2];
const command = commandArg === "stop" || commandArg === "restart" || commandArg === "dev"
  ? commandArg
  : binName.endsWith("-stop")
    ? "stop"
    : binName.endsWith("-restart")
      ? "restart"
      : "dev";

const stopDev = () => {
  let processInfos: ProcessInfo[];
  if (process.platform === "win32") {
    const result = spawnSync("powershell.exe", [
      "-NoProfile",
      "-Command",
      "Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,CommandLine | ConvertTo-Json -Compress",
    ], {
      encoding: "utf8",
      windowsHide: true,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`Failed to query Windows processes: ${result.stderr || result.stdout}`);
    }

    const parsed = JSON.parse(result.stdout || "[]") as ProcessInfo | ProcessInfo[];
    processInfos = Array.isArray(parsed) ? parsed : [parsed];
  } else {
    const result = spawnSync("ps", ["-eo", "pid=,ppid=,command="], {
      encoding: "utf8",
      windowsHide: true,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`Failed to query processes: ${result.stderr || result.stdout}`);
    }

    processInfos = (result.stdout ?? "")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const match = line.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/);
        if (!match) throw new Error(`Cannot parse ps output line: ${line}`);
        return {
          ProcessId: Number(match[1]),
          ParentProcessId: Number(match[2]),
          CommandLine: match[3],
        };
      });
  }

  const appPath = honoPath.toLowerCase().replaceAll("\\", "/");
  const processMap = new Map(processInfos.map((processInfo) => [
    Number(processInfo.ProcessId),
    Number(processInfo.ParentProcessId),
  ]));
  const currentProcessIds = new Set([process.pid]);
  for (let processId = process.pid; processMap.has(processId);) {
    const parentProcessId = processMap.get(processId);
    if (parentProcessId === undefined || !Number.isInteger(parentProcessId) || currentProcessIds.has(parentProcessId)) break;
    currentProcessIds.add(parentProcessId);
    processId = parentProcessId;
  }

  const matchedProcesses = processInfos
    .map((processInfo) => ({
      processId: Number(processInfo.ProcessId),
      parentProcessId: Number(processInfo.ParentProcessId),
      commandLine: String(processInfo.CommandLine ?? "").toLowerCase().replaceAll("\\", "/"),
    }))
    .filter(({ processId, commandLine }) => (
      Number.isInteger(processId)
      && !currentProcessIds.has(processId)
      && (
        commandLine.includes(`${appPath}/scrpits/index.js`)
        || commandLine.includes(`${appPath}/src/index.ts`)
        || commandLine.includes("honoapp/scrpits/index.js")
        || commandLine.includes("honoapp/src/index.ts")
        || commandLine.includes("/node_modules/honoapp/scrpits/index.js")
        || commandLine.includes("/node_modules/honoapp/src/index.ts")
      )
    ));
  const matchedProcessIds = new Set(matchedProcesses.map(({ processId }) => processId));
  const processIds = matchedProcesses
    .filter(({ parentProcessId }) => !matchedProcessIds.has(parentProcessId))
    .map(({ processId }) => processId);
  if (processIds.length === 0) {
    console.log("honocodex is not running");
    return;
  }

  const uniqueProcessIds = [...new Set(processIds)];
  const result = process.platform === "win32"
    ? spawnSync("taskkill", [...uniqueProcessIds.flatMap((processId) => ["/PID", String(processId)]), "/T", "/F"], { stdio: "inherit", windowsHide: true })
    : spawnSync("kill", ["-TERM", ...uniqueProcessIds.map(String)], { stdio: "inherit", windowsHide: true });
  if (result.error) throw result.error;
  if (typeof result.status === "number" && result.status !== 0) {
    throw new Error(`Failed to stop process ids: ${uniqueProcessIds.join(", ")}`);
  }
  console.log(`honocodex stopped ${processIds.length} process${processIds.length === 1 ? "" : "es"}`);
};

if (command === "stop") {
  stopDev();
  process.exit(0);
}
if (command === "restart") stopDev();

const runtimeEnv: EnvMakeOptions = {
  CWD_PATH: process.cwd(),
  HONO_PATH: honoPath,
};
const startOptions = honoStartOptions(runtimeEnv);
const result = spawnSync(startOptions.command, startOptions.args, startOptions.options);

if (result.error) throw result.error;
process.exit(result.status ?? 1);
