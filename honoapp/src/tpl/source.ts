import type { ProjectSource } from "./output/schema";
import { nodes as globalNodes } from "./global/source";

const nodes = {
  ...globalNodes,
  HOOK_USER_COMMAND: "HOOK_USER_COMMAND",
  HOOK_ASSISTANT_COMMAND: "HOOK_ASSISTANT_COMMAND",
} as const;

const tpl: ProjectSource = {
  scope: "project",
  nodes,
  agentsMd: {
    sections: [
      {
        title: "总原则",
        text: "按照用户级 AGENTS.md 处理。",
      },
    ],
  },
  configToml: {
    shellEnvironmentPolicy: {
      inherit: "all",
      exclude: ["ELECTRON_RUN_AS_NODE"],
    },
    features: {
      hooks: true,
    },
    hooks: {
      UserPromptSubmit: [
        {
          type: "command",
          command: nodes.HOOK_USER_COMMAND,
          timeout: 10,
        },
      ],
      Stop: [
        {
          type: "command",
          command: nodes.HOOK_ASSISTANT_COMMAND,
          timeout: 10,
        },
      ],
    },
  },
  skills: {},
};

export default tpl;
