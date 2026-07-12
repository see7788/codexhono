import type { Tpl } from "./source";

const markdownSectionRender = (section: Tpl["agentsMd"]["sections"][number]) => {
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
};

export const agentsMdRender = (tpl: Pick<Tpl, "agentsMd">) => (
  tpl.agentsMd.sections.length ? `${tpl.agentsMd.sections.map(markdownSectionRender).join("\n\n")}\n` : ""
);

export const skillRender = ({ dir, skill }: { dir: string; skill: Tpl["skills"][string] }) => [
  "---",
  `name: ${JSON.stringify(dir)}`,
  `description: ${JSON.stringify(skill.description)}`,
  "---",
  "",
  `# ${skill.title}`,
  skill.intro ? `\n${skill.intro}` : "",
  ...skill.sections.map(section => `\n${markdownSectionRender(section)}`),
  "",
].join("\n");
