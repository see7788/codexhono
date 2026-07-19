import { existsSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { sourceSchema, type GlobalSource, type Source } from "./schema";

type OutputState = {
  files: Record<string, string>;
};

const contentNormalized = (content: string) => content.replace(/\r\n/g, "\n");

export default class CodexOutput {
  private readonly path: string;
  private readonly source: Source;

  constructor(input: { path: string; source: Source }) {
    this.path = input.path;
    this.source = sourceSchema.parse(input.source);
  }

  filesStatus() {
    const files = this.filesRender();
    return {
      existing: Object.keys(files).filter(filePath => existsSync(this.targetPath(filePath))),
      dirty: Object.entries(files)
        .filter(([filePath, content]) => {
          const path = this.targetPath(filePath);
          return !existsSync(path) || readFileSync(path, "utf8") !== content;
        })
        .map(([filePath]) => filePath),
    };
  }

  materialize() {
    if (this.source.scope === "global") {
      this.globalMaterialize(this.source);
      return;
    }
    rmSync(this.targetPath("skills"), { recursive: true, force: true });
    for (const [filePath, content] of Object.entries(this.filesRender())) {
      this.targetWrite(filePath, content);
    }
  }

  private targetPath(filePath: string) {
    return join(this.path, filePath);
  }

  private markdownSectionRender(section: Source["agentsMd"]["sections"][number]) {
    const parts = [
      section.title ? `## ${section.title}` : undefined,
      section.text,
    ].filter(value => value !== undefined);
    const blockAdd = (lines: string[]) => {
      if (parts.length) {
        parts.push("");
      }
      parts.push(...lines);
    };
    if (section.items) {
      blockAdd(section.items.map(value => `- ${value}`));
    }
    if (section.orderedItems) {
      blockAdd(section.orderedItems.map((value, index) => `${index + 1}. ${value}`));
    }
    if (section.code) {
      blockAdd(["```" + section.code.language, section.code.content, "```"]);
    }
    return parts.join("\n");
  }

  private agentsMdRender() {
    return this.source.agentsMd.sections.length
      ? `${this.source.agentsMd.sections.map(section => this.markdownSectionRender(section)).join("\n\n")}\n`
      : "";
  }

  private skillRender(input: { dir: string; skill: Source["skills"][string] }) {
    return [
      "---",
      `name: ${JSON.stringify(input.dir)}`,
      `description: ${JSON.stringify(input.skill.description)}`,
      "---",
      "",
      `# ${input.skill.title}`,
      input.skill.intro ? `\n${input.skill.intro}` : "",
      ...input.skill.sections.map(section => `\n${this.markdownSectionRender(section)}`),
      "",
    ].join("\n");
  }

  private mcpServerRender(name: string, server: GlobalSource["configToml"]["mcpServers"][string]) {
    return [
      `[mcp_servers.${name}]`,
      `command = ${JSON.stringify(server.command)}`,
      ...(server.args ? [`args = ${JSON.stringify(server.args)}`] : []),
    ].join("\n");
  }

  private configTomlRender() {
    if (this.source.scope === "global") {
      return `${Object.entries(this.source.configToml.mcpServers)
        .map(([name, server]) => this.mcpServerRender(name, server))
        .join("\n\n")}\n`;
    }
    const configTomlHookRender = (name: keyof typeof this.source.configToml.hooks) =>
      (hook: typeof this.source.configToml.hooks[typeof name][number]) => [
        `[[hooks.${name}]]`,
        `hooks = [{ type = ${JSON.stringify(hook.type)}, command = ${JSON.stringify(hook.command)}, timeout = ${hook.timeout} }]`,
        "",
      ];
    return `${[
      "[shell_environment_policy]",
      `inherit = ${JSON.stringify(this.source.configToml.shellEnvironmentPolicy.inherit)}`,
      `exclude = ${JSON.stringify(this.source.configToml.shellEnvironmentPolicy.exclude)}`,
      "",
      "[features]",
      `hooks = ${this.source.configToml.features.hooks}`,
      "",
      ...this.source.configToml.hooks.UserPromptSubmit.flatMap(configTomlHookRender("UserPromptSubmit")),
      ...this.source.configToml.hooks.Stop.flatMap(configTomlHookRender("Stop")),
    ].join("\n").trimEnd()}\n`;
  }

  private agentRender(name: string, agent: GlobalSource["agents"][string]) {
    return [
      `name = ${JSON.stringify(name)}`,
      `description = ${JSON.stringify(agent.description)}`,
      `model = ${JSON.stringify(agent.model)}`,
      `model_reasoning_effort = ${JSON.stringify(agent.modelReasoningEffort)}`,
      `developer_instructions = ${agent.developerInstructions}`,
      "",
    ].join("\n");
  }

  private filesRender(): Record<string, string> {
    return {
      "AGENTS.md": this.agentsMdRender(),
      "config.toml": this.configTomlRender(),
      ...Object.fromEntries(Object.entries(this.source.skills).map(([dir, skill]) => [
        `skills/${dir}/SKILL.md`,
        this.skillRender({ dir, skill }),
      ])),
      ...(this.source.scope === "global" ? Object.fromEntries(Object.entries(this.source.agents).map(([name, agent]) => [
        `agents/${name}.toml`,
        this.agentRender(name, agent),
      ])) : {}),
    };
  }

  private targetWrite(filePath: string, content: string) {
    const path = this.targetPath(filePath);
    const current = existsSync(path) ? readFileSync(path, "utf8") : undefined;
    if (current === content) return;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content, "utf8");
  }

  private stateRead() {
    const path = this.targetPath(".extends-codex-output.json");
    if (!existsSync(path)) return undefined;
    const state = JSON.parse(readFileSync(path, "utf8"));
    if (!state || typeof state !== "object" || !state.files || typeof state.files !== "object") {
      throw new Error(`Invalid extends-codex output state in ${path}`);
    }
    if (Object.values(state.files).some(content => typeof content !== "string")) {
      throw new Error(`Invalid extends-codex output state files in ${path}`);
    }
    return state as OutputState;
  }

  private managedContentReplace(current: string, previous: string, next: string, filePath: string) {
    const index = current.indexOf(previous);
    if (index === -1 || current.indexOf(previous, index + previous.length) !== -1) {
      throw new Error(`Cannot locate unique extends-codex content in ${this.targetPath(filePath)}`);
    }
    return `${current.slice(0, index)}${next}${current.slice(index + previous.length)}`;
  }

  private agentsMdMerge(current: string, next: string, previous?: string) {
    if (previous !== undefined) return this.managedContentReplace(current, previous, next, "AGENTS.md");
    const start = "<!-- extends-codex-global:start -->";
    const end = "<!-- extends-codex-global:end -->";
    const startIndex = current.indexOf(start);
    const endIndex = current.indexOf(end);
    if ((startIndex === -1) !== (endIndex === -1) || endIndex < startIndex) {
      throw new Error(`Invalid legacy extends-codex block in ${this.targetPath("AGENTS.md")}`);
    }
    if (startIndex !== -1) {
      const after = current.slice(endIndex + end.length);
      return `${current.slice(0, startIndex)}${next}${next.endsWith("\n") && after.startsWith("\n") ? after.slice(1) : after}`;
    }
    return `${current}${current && !current.endsWith("\n") ? "\n" : ""}${current ? "\n" : ""}${next}`;
  }

  private configTomlMerge(current: string, next: string, source: GlobalSource, previous?: string) {
    if (previous !== undefined) return this.managedContentReplace(current, previous, next, "config.toml");
    const newline = current.includes("\r\n") ? "\r\n" : "\n";
    const lines = current.split(/\r?\n/);
    const startIndex = lines.findIndex(line => line.trim() === "# extends-codex-global-mcp:start");
    const endIndex = lines.findIndex(line => line.trim() === "# extends-codex-global-mcp:end");
    if ((startIndex === -1) !== (endIndex === -1) || (startIndex !== -1 && endIndex < startIndex)) {
      throw new Error(`Invalid legacy extends-codex MCP block in ${this.targetPath("config.toml")}`);
    }
    if (startIndex !== -1) {
      lines.splice(startIndex, endIndex - startIndex + 1, ...next.trimEnd().split("\n"));
      return lines.join(newline);
    }
    for (const name of Object.keys(source.configToml.mcpServers)) {
      const headers = [`[mcp_servers.${name}]`, `[mcp_servers.${JSON.stringify(name)}]`];
      if (lines.some(line => headers.includes(line.trim()))) {
        throw new Error(`Global MCP is owned by another source: ${name}`);
      }
    }
    while (lines.at(-1)?.trim() === "") lines.pop();
    if (lines.length) lines.push("");
    lines.push(...next.trimEnd().split("\n"), "");
    return lines.join(newline);
  }

  private ownedFilePreflight(filePath: string, next: string, previous?: string) {
    const path = this.targetPath(filePath);
    if (!existsSync(path)) return;
    const current = readFileSync(path, "utf8");
    if (previous !== undefined) {
      if (contentNormalized(current) !== contentNormalized(previous)) {
        throw new Error(`Global Codex file changed outside its source: ${path}`);
      }
      return;
    }
    if (contentNormalized(current) === contentNormalized(next)) return;
    if (filePath.startsWith("skills/")) {
      if (current.includes("<!-- extends-codex-global-skill -->")) return;
    }
    if (filePath.startsWith("agents/") && (current.startsWith("# extends-codex-global-agent\n") || current.startsWith("# extends-codex-global-agent\r\n"))) return;
    throw new Error(`Global Codex file is owned by another source: ${path}`);
  }

  private globalMaterialize(source: GlobalSource) {
    const files = this.filesRender();
    const state = this.stateRead();
    const legacyAgentsStatePath = this.targetPath(".extends-codex-agents.json");
    const legacyAgentsState = existsSync(legacyAgentsStatePath)
      ? JSON.parse(readFileSync(legacyAgentsStatePath, "utf8"))
      : undefined;
    if (legacyAgentsState !== undefined && typeof legacyAgentsState?.agentsContent !== "string") {
      throw new Error(`Invalid legacy extends-codex agents state in ${legacyAgentsStatePath}`);
    }

    const agentsCurrent = existsSync(this.targetPath("AGENTS.md")) ? readFileSync(this.targetPath("AGENTS.md"), "utf8") : "";
    const agentsNext = this.agentsMdMerge(
      agentsCurrent,
      files["AGENTS.md"],
      state?.files["AGENTS.md"] ?? legacyAgentsState?.agentsContent,
    );
    const configCurrent = existsSync(this.targetPath("config.toml")) ? readFileSync(this.targetPath("config.toml"), "utf8") : "";
    const configNext = this.configTomlMerge(configCurrent, files["config.toml"], source, state?.files["config.toml"]);

    for (const [filePath, content] of Object.entries(files)) {
      if (filePath === "AGENTS.md" || filePath === "config.toml") continue;
      this.ownedFilePreflight(filePath, content, state?.files[filePath]);
    }

    this.targetWrite("AGENTS.md", agentsNext);
    this.targetWrite("config.toml", configNext);
    for (const [filePath, content] of Object.entries(files)) {
      if (filePath === "AGENTS.md" || filePath === "config.toml") continue;
      this.targetWrite(filePath, content);
    }
    this.targetWrite(".extends-codex-output.json", `${JSON.stringify({ files }, undefined, 2)}\n`);
    if (existsSync(legacyAgentsStatePath)) unlinkSync(legacyAgentsStatePath);
  }
}
