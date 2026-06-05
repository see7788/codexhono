import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import store from "../store";
import { z } from "zod";

const inputSchema = z.object({
  prompt: z.string().min(1),
}).strict();
const llmTestInputSchema = z.object({
  baseURL: z.string().min(1),
  model: z.string().min(1),
  prompt: z.string().min(1),
}).strict();
const agentDrawInputSchema = z.object({
  prompt: z.string().min(1),
}).strict();
const agentDrawOperationSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string(),
    text: z.string(),
    type: z.literal("node.text"),
  }).strict(),
  z.object({
    id: z.string(),
    text: z.string(),
    type: z.literal("node.replace"),
  }).strict(),
  z.object({
    parentId: z.string().optional(),
    text: z.string(),
    type: z.literal("node.add"),
  }).strict(),
  z.object({
    id: z.string(),
    parentId: z.string().optional(),
    type: z.literal("node.move"),
  }).strict(),
  z.object({
    id: z.string(),
    type: z.literal("node.delete"),
  }).strict(),
]);
const agentDrawEventSchema = z.discriminatedUnion("type", [
  z.object({
    text: z.string(),
    type: z.literal("message"),
  }).strict(),
  z.object({
    operation: agentDrawOperationSchema,
    type: z.literal("operation"),
  }).strict(),
  z.object({
    message: z.string(),
    type: z.literal("error"),
  }).strict(),
  z.object({
    type: z.literal("done"),
  }).strict(),
]);
let llmopenai = store.getState().chatActions.llm.openai.chat();
let llmanthropic = store.getState().chatActions.llm.anthropic.chat();
let codexcli = store.getState().chatActions.agent.codexcli.chat();
const stateSchema = store.getState().chatActions.state.schema;
export default new Hono().basePath("/chat")
  .get("/state", (ctx) => {
    return ctx.json(store.getState().chat);
  })
  .post("/state", zValidator("json", stateSchema), (ctx) => {
    const chat = ctx.req.valid("json");
    store.setState(state => {
      state.chat = chat;
    });
    llmopenai = store.getState().chatActions.llm.openai.chat()
    llmanthropic = store.getState().chatActions.llm.anthropic.chat()
    codexcli = store.getState().chatActions.agent.codexcli.chat()
    return ctx.body(null, 200);
  })
  .get("/llm/openai", (ctx) => {
    return ctx.json(store.getState().chatActions.llm.openai.config());
  })
  .post("/llm/openai", zValidator("json", inputSchema), (ctx) => {
    const { prompt } = ctx.req.valid("json");
    const encoder = new TextEncoder();
    return new Response(new ReadableStream<Uint8Array>({
      async start(controller) {
        const write = (text: string) => {
          controller.enqueue(encoder.encode(text));
        };
        try {
          const stream = await llmopenai(prompt);
          let hasOutput = false;
          for await (const chunk of stream) {
            for (const choice of chunk.choices) {
              const content = choice.delta.content;
              if (typeof content !== "string") continue;
              hasOutput = hasOutput || Boolean(content.trim());
              write(content);
            }
          }
          if (!hasOutput) write("Chat response is empty");
        } catch (error) {
          write(error instanceof Error ? error.message : String(error));
        } finally {
          controller.close();
        }
      },
    }), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  })
  .post("/llm/openai/test", zValidator("json", llmTestInputSchema), (ctx) => {
    const { baseURL, model, prompt } = ctx.req.valid("json");
    const encoder = new TextEncoder();
    return new Response(new ReadableStream<Uint8Array>({
      async start(controller) {
        const write = (text: string) => {
          controller.enqueue(encoder.encode(text));
        };
        try {
          const stream = await store.getState().chatActions.llm.openai.test({ baseURL, model, prompt });
          let hasOutput = false;
          for await (const chunk of stream) {
            for (const choice of chunk.choices) {
              const content = choice.delta.content;
              if (typeof content !== "string") continue;
              hasOutput = hasOutput || Boolean(content.trim());
              write(content);
            }
          }
          if (!hasOutput) write("Chat response is empty");
        } catch (error) {
          write(error instanceof Error ? error.message : String(error));
        } finally {
          controller.close();
        }
      },
    }), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  })
  .get("/llm/anthropic", (ctx) => {
    try {
      return ctx.json(store.getState().chatActions.llm.anthropic.config());
    } catch {
      return ctx.json(null, 404);
    }
  })
  .post("/llm/anthropic", zValidator("json", inputSchema), (ctx) => {
    const { prompt } = ctx.req.valid("json");
    const encoder = new TextEncoder();
    return new Response(new ReadableStream<Uint8Array>({
      async start(controller) {
        const write = (text: string) => {
          controller.enqueue(encoder.encode(text));
        };
        try {
          write(await llmanthropic(prompt));
        } catch (error) {
          write(error instanceof Error ? error.message : String(error));
        } finally {
          controller.close();
        }
      },
    }), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  })
  .post("/llm/anthropic/test", zValidator("json", llmTestInputSchema), (ctx) => {
    const { baseURL, model, prompt } = ctx.req.valid("json");
    const encoder = new TextEncoder();
    return new Response(new ReadableStream<Uint8Array>({
      async start(controller) {
        const write = (text: string) => {
          controller.enqueue(encoder.encode(text));
        };
        try {
          write(await store.getState().chatActions.llm.anthropic.test({ baseURL, model, prompt }));
        } catch (error) {
          write(error instanceof Error ? error.message : String(error));
        } finally {
          controller.close();
        }
      },
    }), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  })
  .get("/agent/codexcli", (ctx) => {
    return ctx.json(store.getState().chatActions.agent.codexcli.config());
  })
  .post("/agent/codexcli", zValidator("json", inputSchema), (ctx) => {
    const { prompt } = ctx.req.valid("json");
    const encoder = new TextEncoder();
    return new Response(new ReadableStream<Uint8Array>({
      async start(controller) {
        const write = (text: string) => {
          controller.enqueue(encoder.encode(text));
        };
        try {
          const { events } = await codexcli(prompt);
          const messageTexts = new Map<string, string>();
          let hasOutput = false;
          for await (const event of events) {
            if (event.type === "error") throw new Error(event.message);
            if (event.type === "turn.failed") throw new Error(event.error.message);
            if (
              (event.type === "item.started" || event.type === "item.updated" || event.type === "item.completed")
              && event.item.type === "agent_message"
            ) {
              const previous = messageTexts.get(event.item.id) ?? "";
              const text = event.item.text;
              const delta = text.startsWith(previous) ? text.slice(previous.length) : text;
              messageTexts.set(event.item.id, text);
              if (!delta) continue;
              hasOutput = hasOutput || Boolean(delta.trim());
              write(delta);
            }
          }
          if (!hasOutput) write("Codex CLI response is empty");
        } catch (error) {
          write(error instanceof Error ? error.message : String(error));
        } finally {
          controller.close();
        }
      },
    }), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  })
  .post("/agent/draw", zValidator("json", agentDrawInputSchema), async (ctx) => {
    const input = ctx.req.valid("json");
    const encoder = new TextEncoder();
    return new Response(new ReadableStream<Uint8Array>({
      async start(controller) {
        const write = (event: z.infer<typeof agentDrawEventSchema>) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        };
        const lineEventParse = (line: string) => {
          if (!line || line.startsWith("```")) return undefined;
          const dataPrefix = "data:";
          const jsonLine = line.startsWith(dataPrefix) ? line.slice(dataPrefix.length).trim() : line;
          try {
            const value = JSON.parse(jsonLine) as unknown;
            const event = agentDrawEventSchema.safeParse(value);
            if (event.success) return event.data;
            const operation = agentDrawOperationSchema.safeParse(value);
            if (operation.success) {
              return {
                operation: operation.data,
                type: "operation" as const,
              };
            }
          } catch {
            return undefined;
          }
        };
        let hasEvent = false;
        let buffer = "";
        try {
          const stream = await llmopenai(input.prompt);
          for await (const chunk of stream) {
            for (const choice of chunk.choices) {
              const content = choice.delta.content;
              if (typeof content !== "string") continue;
              buffer += content;
              for (let index = buffer.indexOf("\n"); index >= 0; index = buffer.indexOf("\n")) {
                const line = buffer.slice(0, index).trim();
                buffer = buffer.slice(index + 1);
                const event = lineEventParse(line);
                if (!event) continue;
                if (event.type !== "done") hasEvent = true;
                write(event);
              }
            }
          }
          const event = lineEventParse(buffer.trim());
          if (event) {
            if (event.type !== "done") hasEvent = true;
            write(event);
          }
          if (!hasEvent) {
            write({
              text: "No valid graph operation events were returned.",
              type: "message",
            });
          }
          write({ type: "done" });
        } catch (error) {
          write({
            message: error instanceof Error ? error.message : String(error),
            type: "error",
          });
        } finally {
          controller.close();
        }
      }
    }), {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
      },
    });
  });
