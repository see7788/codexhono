import { execFileSync } from "node:child_process";

const changedFiles = execFileSync("git", ["status", "--short"], { encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean)
  .map(line => line.slice(3).replaceAll("\\", "/"));
const documentationChanged = changedFiles.some(file => file === "README.md" || file.startsWith("docs/"));
const publicEntryChanged = changedFiles.some(file => (
  /(^|\/)package\.json$/.test(file)
  || /(^|\/)src\/(index|routers)\.(ts|tsx)$/.test(file)
  || file === "honoapp/src/tpl/source.ts"
));

if (publicEntryChanged && !documentationChanged) {
  console.error("公开入口、命令、运行流程或模板结构已变化，但 README.md/docs 未同步修改。");
  process.exit(1);
}

console.log(publicEntryChanged
  ? "文档门禁通过：高风险公开入口与文档均有变更。"
  : "文档门禁通过：未检测到需要强制同步文档的高风险公开入口变更。");
