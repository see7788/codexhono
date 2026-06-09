import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import store from "../store";
import { z } from "zod";

let llmopenai = store.getState().chatActions.llm.openai.defFactory()
let llmanthropic = store.getState().chatActions.llm.anthropic.defFactory()
let codexcli = store.getState().chatActions.agent.codexcli.defFactory()
export default new Hono().basePath("/chat")
  .get("/state", (ctx) => {
    return ctx.json(store.getState().chat);
  })
  .post("/state", zValidator("json", store.getState().chatActions.stateSchema), (ctx) => {
    const chat = ctx.req.valid("json");
    store.setState(state => {
      state.chat = chat;
    });
    llmopenai = store.getState().chatActions.llm.openai.defFactory()
    llmanthropic = store.getState().chatActions.llm.anthropic.defFactory()
    codexcli = store.getState().chatActions.agent.codexcli.defFactory()
    return ctx.body(null, 200);
  })
  .get("/llm/openai", (ctx) => {
    return ctx.json(store.getState().chatActions.llm.openai.defConfig());
  })
  .post("/llm/openai", zValidator("json", store.getState().chatActions.inputSchema), (ctx) => {
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
  .post("/llm/openai/test", zValidator("json", store.getState().chatActions.testSchema), (ctx) => {
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
      return ctx.json(store.getState().chatActions.llm.anthropic.defConfig());
    } catch {
      return ctx.json(null, 404);
    }
  })
  .post("/llm/anthropic", zValidator("json", store.getState().chatActions.inputSchema), (ctx) => {
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
  .post("/llm/anthropic/test", zValidator("json", store.getState().chatActions.testSchema), (ctx) => {
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
    return ctx.json(store.getState().chatActions.agent.codexcli.defConfig());
  })
  .post("/agent/codexcli", zValidator("json", store.getState().chatActions.inputSchema), (ctx) => {
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