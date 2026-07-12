import { z } from "zod";

const commandHookSchema = z.object({
  type: z.literal("command"),
  command: z.string().min(1),
  timeout: z.number().int().positive(),
});
const sectionBaseSchema = z.object({
  title: z.string().min(1).optional(),
  text: z.string().min(1).optional(),
  items: z.array(z.string().min(1)).optional(),
  orderedItems: z.array(z.string().min(1)).optional(),
  code: z.object({
    language: z.string().min(1),
    content: z.string().min(1),
  }).optional(),
});
const sectionContentRefine = (section: z.infer<typeof sectionBaseSchema>, ctx: z.RefinementCtx) => {
  if (!section.text && !section.items?.length && !section.orderedItems?.length && !section.code) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "section must contain text, items, orderedItems, or code",
    });
  }
};

export const tplSchema = z.object({
  nodes: z.record(z.string().min(1), z.union([z.string().min(1), z.number().finite()])),
  agentsMd: z.object({
    sections: z.array(sectionBaseSchema.superRefine(sectionContentRefine)),
  }),
  configToml: z.object({
    shellEnvironmentPolicy: z.object({
      inherit: z.literal("all"),
      exclude: z.array(z.string().min(1)),
    }),
    features: z.object({
      hooks: z.boolean(),
    }),
    hooks: z.object({
      UserPromptSubmit: z.array(commandHookSchema),
      Stop: z.array(commandHookSchema),
    }),
  }).superRefine((configToml, ctx) => {
    if (!configToml.features.hooks) {
      return;
    }
    if (!configToml.hooks.UserPromptSubmit.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hooks", "UserPromptSubmit"],
        message: "UserPromptSubmit hooks must not be empty when hooks are enabled",
      });
    }
    if (!configToml.hooks.Stop.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hooks", "Stop"],
        message: "Stop hooks must not be empty when hooks are enabled",
      });
    }
  }),
  skills: z.record(
    z.string().min(1).regex(/^[^/\\]+$/),
    z.object({
      description: z.string().min(1),
      title: z.string().min(1),
      intro: z.string().min(1).optional(),
      sections: z.array(sectionBaseSchema.extend({
        title: z.string().min(1),
      }).superRefine(sectionContentRefine)).min(1),
    }),
  ),
});

export type Tpl = z.infer<typeof tplSchema>;
export type tplGlobal_t = Pick<Tpl, "nodes" | "agentsMd" | "skills"> & {
  configToml: {
    mcpServers: Record<string, {
      args?: string[];
      command: string;
    }>;
  };
};

const nodes = {
  HOOK_USER_COMMAND: "HOOK_USER_COMMAND",
  HOOK_ASSISTANT_COMMAND: "HOOK_ASSISTANT_COMMAND",
} as const;

const tpl: Tpl = {
  nodes,
  agentsMd: {
    sections: [],
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
