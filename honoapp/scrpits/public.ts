// import { join } from "node:path";
// import type { RuntimeOptions } from "../src/runtime.js";

// export const honoStartOptions = (runtimeOptions: Required<RuntimeOptions>) => {
//   const honoPath = runtimeOptions.HONO_PATH;
//   return {
//     command: process.execPath,
//     args: [
//       join(honoPath, "node_modules/tsx/dist/cli.mjs"),
//       "watch",
//       "--clear-screen=false",
//       "--include",
//       join(honoPath, "src"),
//       "--include",
//       join(honoPath, "node_modules/extends-vite/src"),
//       "--include",
//       join(honoPath, "node_modules/extends-zustand/src"),
//       "--exclude",
//       join(honoPath, "../reactapp"),
//       join(honoPath, "src/index.ts"),
//       "--cwd",
//       runtimeOptions.CWD_PATH,
//       "--hono",
//       runtimeOptions.HONO_PATH,
//     ],
//     options: {
//       env: process.env,
//       stdio: "inherit" as const,
//       windowsHide: true,
//     },
//   };
// };
