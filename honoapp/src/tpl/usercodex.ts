import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const shellEnvironmentPolicy = {
  inherit: "all",
  exclude: ["ELECTRON_RUN_AS_NODE"],
} as const;

export default () => {
  const configPath = join(process.env.CODEX_HOME ?? join(homedir(), ".codex"), "config.toml");
  const config = existsSync(configPath) ? readFileSync(configPath, "utf8") : "";
  const newline = config.includes("\r\n") ? "\r\n" : "\n";
  const lines = config.split(/\r?\n/);
  const tableStart = lines.findIndex(line => line.trim() === "[shell_environment_policy]");

  if (tableStart === -1) {
    const separator = config && !config.endsWith("\n") ? newline : "";
    const prefix = config && config.trim() ? newline : "";
    const policy = [
      "[shell_environment_policy]",
      `inherit = ${JSON.stringify(shellEnvironmentPolicy.inherit)}`,
      `exclude = ${JSON.stringify(shellEnvironmentPolicy.exclude)}`,
      "",
    ].join(newline);
    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, `${config}${separator}${prefix}${policy}`, "utf8");
    return;
  }

  const tableEndOffset = lines.slice(tableStart + 1).findIndex(line => /^\s*\[/.test(line));
  const tableEnd = tableEndOffset === -1 ? lines.length : tableStart + 1 + tableEndOffset;
  const inheritIndex = lines.slice(tableStart + 1, tableEnd)
    .findIndex(line => /^\s*inherit\s*=/.test(line));
  const excludeIndex = lines.slice(tableStart + 1, tableEnd)
    .findIndex(line => /^\s*exclude\s*=/.test(line));
  const inheritLine = `inherit = ${JSON.stringify(shellEnvironmentPolicy.inherit)}`;

  if (inheritIndex === -1) {
    lines.splice(tableStart + 1, 0, inheritLine);
  } else {
    lines[tableStart + 1 + inheritIndex] = inheritLine;
  }

  const currentTableEnd = tableEnd + (inheritIndex === -1 ? 1 : 0);
  const currentExcludeIndex = lines.slice(tableStart + 1, currentTableEnd)
    .findIndex(line => /^\s*exclude\s*=/.test(line));
  if (currentExcludeIndex === -1) {
    lines.splice(tableStart + 2, 0, `exclude = ${JSON.stringify(shellEnvironmentPolicy.exclude)}`);
  } else {
    const lineIndex = tableStart + 1 + currentExcludeIndex;
    const existing = [...lines[lineIndex]!.matchAll(/"((?:\\.|[^"\\])*)"/g)]
      .map(match => JSON.parse(`"${match[1]}"`) as string);
    lines[lineIndex] = `exclude = ${JSON.stringify([...new Set([...existing, ...shellEnvironmentPolicy.exclude])])}`;
  }

  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, lines.join(newline), "utf8");
};
