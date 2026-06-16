import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import immerStateCreator from "extends-zustand/src/immerStateCreator";
import { Project } from "ts-morph";
import ts from "typescript";
import runtime from "../runtime";
import sourceTpl, { tplSchema, type Tpl } from "./source";
type Store = {
  tpl: {
    source: string,
  },
  tplActions: {
    agentsMdDelete: () => void,
    agentsMdWrite: (content: string) => void,
    codexTplMaterialize: () => void,
    configTomlDelete: () => void,
    configTomlRead: () => string,
    configTomlWrite: (content: string) => void,
    skillDelete: (dir: string) => void,
    skillWrite: (dir: string, content: string) => void,
    sourceChange: (source: string) => void,
    sourceRead: () => {
      dirtyTargets: string[],
      existingTargets: string[],
      nodes: Record<string, string | number>,
      source: string,
      type: string,
    },
  },
};

const createTplStore = immerStateCreator<Store>((set, get) => {
  const sourceTextGet = () => {
    const declaration = new Project({ skipAddingFilesFromTsConfig: true })
      .addSourceFileAtPath(fileURLToPath(new URL("./source.ts", import.meta.url)))
      .getVariableDeclarationOrThrow("tpl");
    return {
      source: declaration.getInitializerOrThrow().getText(),
      type: declaration.getType().getText(declaration, ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.InTypeAlias),
    };
  };
  const sourceParse = (source: string) =>
    new Project({ skipAddingFilesFromTsConfig: true })
      .createSourceFile("codextpl.ts", source)
      .getVariableDeclarationOrThrow("tpl")
      .getInitializerOrThrow()
      .getText();
  const codexFilePath = (filePath: string) => join(runtime.CODEX_PATH, filePath);
  const skillFilePath = (dir: string) => join("skills", dir, "SKILL.md");
  const runtimeNodesGet = () => ({
    ...sourceTpl.nodes,
    ...runtime,
  });
  const tplParse = (source: string, nodes: Record<string, string | number>) =>
    tplSchema.parse(new Function(
      "nodes",
      `"use strict"; const tpl = ${source}; return tpl;`,
    )(nodes));
  const markdownSectionRender = (item: Tpl["agentsMd"]["sections"][number]) => {
    const parts = [
      item.title ? `## ${item.title}` : undefined,
      item.text,
    ].filter(value => value !== undefined);
    const blockAdd = (lines: string[]) => {
      if (parts.length) {
        parts.push("");
      }
      parts.push(...lines);
    };
    if (item.items) {
      blockAdd(item.items.map(value => `- ${value}`));
    }
    if (item.orderedItems) {
      blockAdd(item.orderedItems.map((value, index) => `${index + 1}. ${value}`));
    }
    if (item.code) {
      blockAdd([`\`\`\`${item.code.language}`, item.code.content, "```"]);
    }
    return parts.join("\n");
  };
  const agentsMdRender = (tpl: Tpl) => `${tpl.agentsMd.sections.map(markdownSectionRender).join("\n\n")}\n`;
  const configTomlHookRender = (name: keyof Tpl["configToml"]["hooks"]) =>
    (hook: Tpl["configToml"]["hooks"][typeof name][number]) => [
      `[[hooks.${name}]]`,
      `hooks = [{ type = ${JSON.stringify(hook.type)}, command = ${JSON.stringify(hook.command)}, timeout = ${hook.timeout} }]`,
      "",
    ];
  const configTomlMcpServerRender = (name: string, server: NonNullable<Tpl["configToml"]["mcpServers"]>[string]) => [
    `[mcp_servers.${name}]`,
    `command = ${JSON.stringify(server.command)}`,
    ...(server.args ? [`args = ${JSON.stringify(server.args)}`] : []),
    "",
  ];
  const configTomlMcpServersRender = (tpl: Tpl) =>
    Object.entries(tpl.configToml.mcpServers ?? {}).flatMap(([name, server]) => configTomlMcpServerRender(name, server));
  const configTomlRender = (tpl: Tpl) => `${[
    ...(tpl.configToml.developerInstructions ? [
      `developer_instructions = ${JSON.stringify(tpl.configToml.developerInstructions.join("\n"))}`,
      "",
    ] : []),
    "[features]",
    `hooks = ${tpl.configToml.features.hooks}`,
    "",
    ...configTomlMcpServersRender(tpl),
    ...tpl.configToml.hooks.UserPromptSubmit.flatMap(configTomlHookRender("UserPromptSubmit")),
    ...tpl.configToml.hooks.Stop.flatMap(configTomlHookRender("Stop")),
  ].join("\n").trimEnd()}\n`;
  const frontmatterString = (value: string) => JSON.stringify(value);
  const skillRender = (dir: string, skill: Tpl["skills"][string]) => {
    return [`---`, `name: ${frontmatterString(dir)}`, `description: ${frontmatterString(skill.description)}`, "---", "", `# ${skill.title}`, skill.intro ? `\n${skill.intro}` : "", ...skill.sections.map(item => `\n${markdownSectionRender(item)}`), ""].join("\n");
  };
  const codexRender = (tpl: Tpl) => ({
    "AGENTS.md": agentsMdRender(tpl),
    "config.toml": configTomlRender(tpl),
    ...Object.fromEntries(Object.entries(tpl.skills).map(([dir, skill]) => [skillFilePath(dir), skillRender(dir, skill)])),
  });
  const currentTplParse = () => tplParse(get().tpl.source, runtimeNodesGet());
  const codexExistingTargetsGet = (tpl: Tpl) => [
    existsSync(codexFilePath("AGENTS.md")) ? "agentsMd" : undefined,
    existsSync(codexFilePath("config.toml")) ? "configToml" : undefined,
    ...Object.keys(tpl.skills).map(dir => (
      existsSync(codexFilePath(skillFilePath(dir))) ? `skill:${dir}` : undefined
    )),
  ].filter((value): value is string => Boolean(value));
  const codexDirtyTargetsGet = (tpl: Tpl) => Object.entries(codexRender(tpl))
    .filter(([filePath, content]) => {
      const path = codexFilePath(filePath);
      return !existsSync(path) || readFileSync(path, "utf8") !== content;
    })
    .map(([filePath]) => {
      if (filePath === "AGENTS.md") {
        return "agentsMd";
      }
      if (filePath === "config.toml") {
        return "configToml";
      }
      return `skill:${filePath.split(/[\\/]/)[1]}`;
    });
  const codexFileWrite = (filePath: string, content: string) => {
    const path = codexFilePath(filePath);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content, "utf8");
  };
  return {
    tpl: {
      source: sourceTextGet().source,
    },
    tplActions: {
    agentsMdDelete: () => {
      rmSync(codexFilePath("AGENTS.md"), { force: true });
    },
    agentsMdWrite: (content) => {
      codexFileWrite("AGENTS.md", content);
    },
    codexTplMaterialize: () => {
      const rendered = codexRender(currentTplParse());
      rmSync(codexFilePath("skills"), { recursive: true, force: true });
      for (const [filePath, content] of Object.entries(rendered)) {
        codexFileWrite(filePath, content);
      }
    },
    configTomlDelete: () => {
      rmSync(codexFilePath("config.toml"), { force: true });
    },
    configTomlRead: () => configTomlRender(currentTplParse()),
    configTomlWrite: (content) => {
      codexFileWrite("config.toml", content);
    },
    skillDelete: (dir) => {
      rmSync(codexFilePath(skillFilePath(dir)), { force: true });
    },
    skillWrite: (dir, content) => {
      codexFileWrite(skillFilePath(dir), content);
    },
    sourceChange: (source) => {
      const tplSource = sourceParse(source);
      set((state) => {
        state.tpl.source = tplSource;
      });
    },
    sourceRead: () => {
      const source = get().tpl.source;
      const nodes = runtimeNodesGet();
      const tpl = tplParse(source, nodes);
      return {
        ...sourceTextGet(),
        source,
        nodes,
        existingTargets: codexExistingTargetsGet(tpl),
        dirtyTargets: codexDirtyTargetsGet(tpl),
      };
    },
    },
  };
});

export default createTplStore;
