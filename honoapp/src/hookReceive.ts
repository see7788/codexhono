import { pushHook } from "./tpl/hook";

pushHook().catch((error) => {
  console.error("honocodex hook failed:", error);
  process.exitCode = 1;
});
