#!/usr/bin/env node

// scrpits/bin.ts
import { spawnSync } from "child_process";
import { basename, dirname, resolve } from "path";
import { fileURLToPath } from "url";

// scrpits/public.ts
import { join } from "path";
var honoStartOptions = (runtimeOptions2) => {
  const honoPath2 = runtimeOptions2.HONO_PATH;
  return {
    command: process.execPath,
    args: [
      join(honoPath2, "node_modules/tsx/dist/cli.mjs"),
      "watch",
      "--clear-screen=false",
      "--include",
      join(honoPath2, "src"),
      "--include",
      join(honoPath2, "node_modules/extends-vite/src"),
      "--include",
      join(honoPath2, "node_modules/extends-zustand/src"),
      "--exclude",
      join(honoPath2, "../reactapp"),
      join(honoPath2, "src/index.ts"),
      "--cwd",
      runtimeOptions2.CWD_PATH,
      "--hono",
      runtimeOptions2.HONO_PATH
    ],
    options: {
      env: process.env,
      stdio: "inherit",
      windowsHide: true
    }
  };
};

// scrpits/bin.ts
var dir = dirname(fileURLToPath(import.meta.url));
var honoPath = resolve(dir, "..");
var binName = basename(process.argv[1] ?? "");
var commandArg = process.argv[2];
var command = commandArg === "stop" || commandArg === "restart" || commandArg === "dev" ? commandArg : binName.endsWith("-stop") ? "stop" : binName.endsWith("-restart") ? "restart" : "dev";
var stopDev = () => {
  let processInfos;
  if (process.platform === "win32") {
    const result3 = spawnSync("powershell.exe", [
      "-NoProfile",
      "-Command",
      "Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,CommandLine | ConvertTo-Json -Compress"
    ], {
      encoding: "utf8",
      windowsHide: true
    });
    if (result3.error) throw result3.error;
    if (result3.status !== 0) {
      throw new Error(`Failed to query Windows processes: ${result3.stderr || result3.stdout}`);
    }
    const parsed = JSON.parse(result3.stdout || "[]");
    processInfos = Array.isArray(parsed) ? parsed : [parsed];
  } else {
    const result3 = spawnSync("ps", ["-eo", "pid=,ppid=,command="], {
      encoding: "utf8",
      windowsHide: true
    });
    if (result3.error) throw result3.error;
    if (result3.status !== 0) {
      throw new Error(`Failed to query processes: ${result3.stderr || result3.stdout}`);
    }
    processInfos = (result3.stdout ?? "").split(/\r?\n/).filter(Boolean).map((line) => {
      const match = line.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/);
      if (!match) throw new Error(`Cannot parse ps output line: ${line}`);
      return {
        ProcessId: Number(match[1]),
        ParentProcessId: Number(match[2]),
        CommandLine: match[3]
      };
    });
  }
  const appPath = honoPath.toLowerCase().replaceAll("\\", "/");
  const processMap = new Map(processInfos.map((processInfo) => [
    Number(processInfo.ProcessId),
    Number(processInfo.ParentProcessId)
  ]));
  const currentProcessIds = /* @__PURE__ */ new Set([process.pid]);
  for (let processId = process.pid; processMap.has(processId); ) {
    const parentProcessId = processMap.get(processId);
    if (parentProcessId === void 0 || !Number.isInteger(parentProcessId) || currentProcessIds.has(parentProcessId)) break;
    currentProcessIds.add(parentProcessId);
    processId = parentProcessId;
  }
  const matchedProcesses = processInfos.map((processInfo) => ({
    processId: Number(processInfo.ProcessId),
    parentProcessId: Number(processInfo.ParentProcessId),
    commandLine: String(processInfo.CommandLine ?? "").toLowerCase().replaceAll("\\", "/")
  })).filter(({ processId, commandLine }) => Number.isInteger(processId) && !currentProcessIds.has(processId) && (commandLine.includes(`${appPath}/scrpits/index.js`) || commandLine.includes(`${appPath}/src/index.ts`) || commandLine.includes("honoapp/scrpits/index.js") || commandLine.includes("honoapp/src/index.ts") || commandLine.includes("/node_modules/honoapp/scrpits/index.js") || commandLine.includes("/node_modules/honoapp/src/index.ts")));
  const matchedProcessIds = new Set(matchedProcesses.map(({ processId }) => processId));
  const processIds = matchedProcesses.filter(({ parentProcessId }) => !matchedProcessIds.has(parentProcessId)).map(({ processId }) => processId);
  if (processIds.length === 0) {
    console.log("honocodex is not running");
    return;
  }
  const uniqueProcessIds = [...new Set(processIds)];
  const result2 = process.platform === "win32" ? spawnSync("taskkill", [...uniqueProcessIds.flatMap((processId) => ["/PID", String(processId)]), "/T", "/F"], { stdio: "inherit", windowsHide: true }) : spawnSync("kill", ["-TERM", ...uniqueProcessIds.map(String)], { stdio: "inherit", windowsHide: true });
  if (result2.error) throw result2.error;
  if (typeof result2.status === "number" && result2.status !== 0) {
    throw new Error(`Failed to stop process ids: ${uniqueProcessIds.join(", ")}`);
  }
  console.log(`honocodex stopped ${processIds.length} process${processIds.length === 1 ? "" : "es"}`);
};
if (command === "stop") {
  stopDev();
  process.exit(0);
}
if (command === "restart") stopDev();
var runtimeOptions = {
  CWD_PATH: process.cwd(),
  HONO_PATH: honoPath
};
var startOptions = honoStartOptions(runtimeOptions);
var result = spawnSync(startOptions.command, startOptions.args, startOptions.options);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
