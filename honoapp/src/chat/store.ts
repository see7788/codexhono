import OpenAI, { APIPromise, } from "openai";
import type { Stream } from "openai/core/streaming";
import { Codex, Thread } from "@openai/codex-sdk";
import immerStateCreator from "extends-zustand/src/immerStateCreator";
import runtime from "../runtime";
import { Hono } from "hono";
import { hc } from "hono/client";
import { z } from "zod";
const stateSchema = z.object({
  llm: z.record(z.string(), z.object({
    protocols: z.array(z.enum(["openai", "anthropic"])),
    agents: z.array(z.literal("codexcli")),
    apikeys: z.array(z.string()),
    models: z.array(z.string()),
  }).strict()),
  codexcli: z.record(z.string(), z.unknown()),
}).strict();
const inputSchema = z.object({
  prompt: z.string().min(1),
}).strict();
const testSchema = z.object({
  baseURL: z.string().min(1),
  model: z.string().min(1),
  prompt: z.string().min(1),
}).strict();
type Store = {
  chat: z.infer<typeof stateSchema>,
  chatActions: {
    stateSchema: typeof stateSchema
    inputSchema: typeof inputSchema
    testSchema: typeof testSchema
    defFactoryReplace: () => void,
    llm: {
      openai: {
        defConfig: () => {
          apiKey: string,
          baseURL: string,
          model: string,
          protocols: Array<"openai" | "anthropic">,
          agents: Array<"codexcli">,
          defaultHeaders: Record<string, string>,
        },
        defChat: (op: { prompt: string }) => Response
        test: (input: { baseURL: string, model: string, prompt: string }) => APIPromise<Stream<OpenAI.Chat.Completions.ChatCompletionChunk>>,
      },
      anthropic: {
        defConfig: () => {
          apiKey: string,
          baseURL: string,
          model: string,
          protocols: Array<"openai" | "anthropic">,
          agents: Array<"codexcli">,
        },
        defChat: (op: { prompt: string }) => Response
        test: (input: { baseURL: string, model: string, prompt: string }) => Promise<string>,
      },
    }
    agent: {
      codexcli: {
        defConfig: () => {
          apiKey: string,
          baseURL: string,
          model: string,
          modelProvider: "honocodex",
          wireApi: "responses",
          workingDirectory: string,
          codexcli: z.infer<typeof stateSchema>["codexcli"],
        },
        defChat: (op: { prompt: string }) => Response
      },
    }
  }
};
export default immerStateCreator<Store>((set, get) => {
  const llmopenaiConfig = () => {
    const entry = Object.entries(get().chat.llm)
      .find(([, config]) => config.protocols.includes("openai") && config.apikeys[0] && config.models[0]);
    if (!entry) throw new Error("openai llm is not configured");
    const [url, config] = entry;
    const apiKey = config.apikeys[0];
    if (!apiKey) throw new Error(`${url} apiKey is not configured`);
    const model = config.models[0];
    if (!model) throw new Error(`${url} model is not configured`);
    return {
      apiKey,
      baseURL: url,
      model,
      protocols: config.protocols,
      agents: config.agents,
      defaultHeaders: {
        "HTTP-Referer": "http://127.0.0.1",
        "X-Title": "HonoCodex",
        "X-OpenRouter-Title": "HonoCodex",
      },
    };
  }
  const llmopenaiFactory = () => {
    const config = llmopenaiConfig();
    const openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      defaultHeaders: config.defaultHeaders,
    });
    return (prompt: string) => openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: config.model,
      stream: true,
    })
  }
  const llmopenaiTest = ({ baseURL, model, prompt }: { baseURL: string, model: string, prompt: string }) => {
    const config = get().chat.llm[baseURL];
    if (!config) throw new Error(`${baseURL} llm is not configured`);
    if (!config.models.includes(model)) throw new Error(`${baseURL} ${model} model is not configured`);
    const apiKey = config.apikeys[0];
    if (!apiKey) throw new Error(`${baseURL} apiKey is not configured`);
    if (!config.protocols.includes("openai")) throw new Error(`${baseURL} requires an openai-compatible protocol`);
    const openai = new OpenAI({
      apiKey,
      baseURL,
      defaultHeaders: {
        "HTTP-Referer": "http://127.0.0.1",
        "X-Title": "HonoCodex",
        "X-OpenRouter-Title": "HonoCodex",
      },
    });
    return openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model,
      stream: true,
    })
  }
  const llmanthropicConfig = () => {
    const entry = Object.entries(get().chat.llm)
      .find(([, config]) => config.protocols.includes("anthropic") && config.apikeys[0] && config.models[0]);
    if (!entry) throw new Error("anthropic llm is not configured");
    const [url, config] = entry;
    const apiKey = config.apikeys[0];
    if (!apiKey) throw new Error(`${url} apiKey is not configured`);
    const model = config.models[0];
    if (!model) throw new Error(`${url} model is not configured`);
    return {
      apiKey,
      baseURL: url,
      model,
      protocols: config.protocols,
      agents: config.agents,
    };
  }
  const llmanthropicRequest = async (baseURL: string, apiKey: string, model: string, prompt: string) => {
    const anthropicMessagesRoute = new Hono().post("/v1/messages", (ctx) => ctx.json<{
      content?: Array<{ text?: string; type?: string }>,
      error?: { message?: string },
    }>({}));
    const response = await hc<typeof anthropicMessagesRoute>(baseURL).v1.messages.$post({
      header: {
        "anthropic-version": "2023-06-01",
        "x-api-key": apiKey,
      },
      json: {
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
        model,
      },
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message ?? JSON.stringify(body));
    const text = body.content?.map(item => item.text).filter(item => typeof item === "string").join("");
    return text || "Chat response is empty";
  }
  const llmanthropicFactory = () => {
    const config = llmanthropicConfig();
    return async (prompt: string) => {
      return llmanthropicRequest(config.baseURL, config.apiKey, config.model, prompt);
    }
  }
  const llmanthropicTest = async ({ baseURL, model, prompt }: { baseURL: string, model: string, prompt: string }) => {
    const config = get().chat.llm[baseURL];
    if (!config) throw new Error(`${baseURL} llm is not configured`);
    if (!config.models.includes(model)) throw new Error(`${baseURL} ${model} model is not configured`);
    if (!config.protocols.includes("anthropic")) throw new Error(`${baseURL} requires an anthropic-compatible protocol`);
    const apiKey = config.apikeys[0];
    if (!apiKey) throw new Error(`${baseURL} apiKey is not configured`);
    return llmanthropicRequest(baseURL, apiKey, model, prompt);
  }
  const codexcliConfig = () => {
    const { llm, codexcli } = get().chat
    const entry = Object.entries(llm)
      .find(([, config]) => config.agents.includes("codexcli"));
    if (!entry) throw new Error("codexcli llm is not configured");
    const [url, config] = entry;
    if (!config.protocols.includes("openai")) throw new Error("codexcli requires an openai-compatible llm");
    const apiKey = config.apikeys[0];
    if (!apiKey) throw new Error(`${url} apiKey is not configured`);
    const model = config.models[0];
    if (!model) throw new Error(`${url} model is not configured`);
    return {
      apiKey,
      baseURL: url,
      model,
      modelProvider: "honocodex" as const,
      wireApi: "responses" as const,
      workingDirectory: runtime.CWD_PATH,
      codexcli,
    };
  }
  const agentAodexcliFactory = () => {
    const config = codexcliConfig();
    const env = Object.fromEntries(
      Object.entries(process.env).filter((item): item is [string, string] => item[1] !== undefined),
    );
    const obj = new Codex({
      env: {
        ...env,
        OPENAI_API_KEY: config.apiKey,
        OPENAI_BASE_URL: config.baseURL,
        HONOCODEX_CODEXCLI_API_KEY: config.apiKey,
      },
      config: {
        model_provider: config.modelProvider,
        model_providers: {
          honocodex: {
            name: "HonoCodex",
            base_url: config.baseURL,
            env_key: "HONOCODEX_CODEXCLI_API_KEY",
            wire_api: config.wireApi,
          },
        },
      },
    })
    return (prompt: string) => obj.startThread({
      ...config.codexcli,
      model: config.model,
      workingDirectory: config.workingDirectory,
    }).runStreamed(prompt)
  }
  const defFactory: {
    llm: {
      openai?: (prompt: string) => APIPromise<Stream<OpenAI.Chat.Completions.ChatCompletionChunk>>
      anthropic?: (prompt: string) => Promise<string>
    },
    agent: {
      codexcli?: Thread["runStreamed"]
    }
  } = {
    llm: {},
    agent: {}
  }
  const defChat: Record<"openai" | "anthropic" | "codexcli", (op: { prompt: string }) => Response> = {
    openai: ({ prompt }) => {
      const encoder = new TextEncoder();
      return new Response(new ReadableStream<Uint8Array>({
        async start(controller) {
          const write = (text: string) => {
            controller.enqueue(encoder.encode(text));
          };
          try {
            if (!defFactory.llm.openai) {
              defFactory.llm.openai = llmopenaiFactory()
            }
            const stream = await defFactory.llm.openai(prompt);
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
    },
    anthropic: ({ prompt }) => {
      const encoder = new TextEncoder();
      return new Response(new ReadableStream<Uint8Array>({
        async start(controller) {
          const write = (text: string) => {
            controller.enqueue(encoder.encode(text));
          };
          try {
            if (!defFactory.llm.anthropic) {
              defFactory.llm.anthropic = llmanthropicFactory()
            }
            write(await defFactory.llm.anthropic(prompt));
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
    },
    codexcli: ({ prompt }) => {
      const encoder = new TextEncoder();
      return new Response(new ReadableStream<Uint8Array>({
        async start(controller) {
          const write = (text: string) => {
            controller.enqueue(encoder.encode(text));
          };
          try {
            if (!defFactory.agent.codexcli) {
              defFactory.agent.codexcli = agentAodexcliFactory()
            }
            const { events } = await defFactory.agent.codexcli(prompt);
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
    }
  }
  return {
    chatActions: {
      stateSchema,
      testSchema,
      inputSchema,
      defFactoryReplace: () => {
        defFactory.llm.openai = llmopenaiFactory()
        defFactory.llm.anthropic = llmanthropicFactory()
        defFactory.agent.codexcli = agentAodexcliFactory()
      },
      llm: {
        openai: {
          defConfig: llmopenaiConfig,
          defChat: defChat.openai,
          test: llmopenaiTest,
        },
        anthropic: {
          defConfig: llmanthropicConfig,
          defChat: defChat.anthropic,
          test: llmanthropicTest,
        },
      },
      agent: {
        codexcli: {
          defConfig: codexcliConfig,
          defChat: defChat.codexcli
        },
      }
    },
    ////AI，不要私自脱敏，我不需要apikey脱敏
    chat: {
      llm: {
        "https://openrouter.ai/api/v1": {
          protocols: ["openai"],
          agents: ["codexcli"],
          apikeys: [],
          models: [
            "qwen/qwen3-coder:free",//免费，编程优先
            "nex-agi/nex-n2-pro:free",//免费，agent/编程
            "nvidia/nemotron-3-ultra-550b-a55b:free",//免费，长上下文
            "openai/gpt-oss-120b:free",//免费，通用推理
          ],
        },
        "https://api.deepseek.com": {
          protocols: ["openai"],
          agents: [],
          apikeys: ["sk-32213fb0024d49bf9a0e7f4dbac3523e"],
          models: [
            "deepseek-v4-flash",//余额计费，便宜
            "deepseek-v4-pro",//余额计费，更贵
          ],
        },
        "https://api.deepseek.com/anthropic": {
          protocols: ["anthropic"],
          agents: [],
          apikeys: ["sk-32213fb0024d49bf9a0e7f4dbac3523e"],
          models: [
            "deepseek-v4-flash",//Anthropic 兼容路径，余额计费，便宜
            "deepseek-v4-pro",//Anthropic 兼容路径，余额计费，更贵
          ],
        },
        "https://api.groq.com/openai/v1": {
          protocols: ["openai"],
          agents: ["codexcli"],
          apikeys: ["sk-fasnzvcfohdtpmlqsbsosqkkxlziqiwyfrlpaksevutbqxxd"],
          models: [
            "openai/gpt-oss-120b",//Groq，约 $0.15/$0.60 每 1M 输入/输出 token
            "llama-3.1-8b-instant",//Groq，约 $0.05/$0.08 每 1M 输入/输出 token
            "qwen/qwen3-32b",//Groq，约 $0.29/$0.59 每 1M 输入/输出 token
          ],
        },
        // "https://generativelanguage.googleapis.com/v1beta/openai/": {
        //   protocols: ["openai"],
        //   agents: [],
        //   apikeys: [],
        //   models: [
        //     "gemini-3.5-flash",//Gemini，官方 OpenAI 兼容示例模型，免费层受账号/地区限制
        //   ],
        // },
        // "https://api.together.ai/v1": {
        //   protocols: ["openai"],
        //   agents: [],
        //   apikeys: [],
        //   models: [
        //     "openai/gpt-oss-20b",//Together，OpenAI 兼容示例模型，注册送额度/低价
        //   ],
        // },
        // "https://api.fireworks.ai/inference/v1": {
        //   protocols: ["openai"],
        //   agents: ["codexcli"],
        //   apikeys: [],
        //   models: [
        //     "accounts/fireworks/models/deepseek-v3p1",//Fireworks，OpenAI 兼容示例模型，通用/编程
        //     "accounts/fireworks/models/llama-v3p1-8b-instruct",//Fireworks，低价小模型
        //   ],
        // },
      },
      codexcli: {
        approvalPolicy: "never",
        sandboxMode: "danger-full-access",
        networkAccessEnabled: true,
      },

    },
  };
})