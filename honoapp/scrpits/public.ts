import { join } from "node:path";
import type { EnvMakeOptions } from "../src/runtime.js";

export const honoStartOptions = (runtimeEnv: EnvMakeOptions) => {
  const honoPath = runtimeEnv.HONO_PATH;
  return {
    command: process.execPath,
    args: [
      join(honoPath, "node_modules/tsx/dist/cli.mjs"),
      "watch",
      "--clear-screen=false",
      "--include",
      join(honoPath, "src"),
      "--include",
      join(honoPath, "../libs/create-vite-router/src"),
      "--include",
      join(honoPath, "../libs/extendszustand-lib/src"),
      "--exclude",
      join(honoPath, "../reactapp"),
      join(honoPath, "src/index.ts"),
    ],
    options: {
      env: {
        ...process.env,
        ...runtimeEnv,
      },
      stdio: "inherit" as const,
      windowsHide: true,
    },
  };
};
