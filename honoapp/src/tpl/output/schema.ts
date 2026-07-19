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

const sourceBaseSchema = z.object({
  nodes: z.record(z.string().min(1), z.union([z.string().min(1), z.number().finite()])),
  agentsMd: z.object({
    sections: z.array(sectionBaseSchema.superRefine(sectionContentRefine)),
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

const mcpServersSchema = z.record(z.string().min(1), z.object({
  args: z.array(z.string()).optional(),
  command: z.string().min(1),
}));

const agentsSchema = z.record(z.string().min(1).regex(/^[^/\\]+$/), z.object({
  description: z.string().min(1),
  model: z.string().min(1),
  modelReasoningEffort: z.string().min(1),
  developerInstructions: z.string().min(1),
}));

const projectSourceSchema = sourceBaseSchema.extend({
  scope: z.literal("project"),
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
    if (!configToml.features.hooks) return;
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
});

const globalSourceSchema = sourceBaseSchema.extend({
  scope: z.literal("global"),
  configToml: z.object({
    mcpServers: mcpServersSchema,
  }),
  agents: agentsSchema,
});

export const sourceSchema = z.discriminatedUnion("scope", [projectSourceSchema, globalSourceSchema]);

export type Source = z.infer<typeof sourceSchema>;
export type ProjectSource = z.infer<typeof projectSourceSchema>;
export type GlobalSource = z.infer<typeof globalSourceSchema>;
