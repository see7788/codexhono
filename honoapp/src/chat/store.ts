import OpenAI, { APIPromise, } from "openai";
import type { Stream } from "openai/core/streaming";
import { Codex, Thread } from "@openai/codex-sdk";
import immerStateCreator from "extendszustand-lib/src/immerStateCreator";
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
export type Store = {
  chat: z.infer<typeof stateSchema>,
  chatActions: {
    stateSchema: typeof stateSchema
    inputSchema: typeof inputSchema
    testSchema: typeof testSchema
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
        defFactory: () => (prompt: string) => APIPromise<Stream<OpenAI.Chat.Completions.ChatCompletionChunk>>,
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
        defFactory: () => (prompt: string) => Promise<string>,
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
        defFactory: () => (prompt: string) => ReturnType<Thread["runStreamed"]>,
      },
    }
  }
};

const createStore = immerStateCreator<Store>((set, get) => {

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
      anthropic?: (prompt: string) => {}
    },
    agent: {
      codexcli?: Thread["runStreamed"]
    }
  } = {
    llm: {},
    agent: {}
  }
  return {
    chatActions: {
      stateSchema,
      testSchema,
      inputSchema,
      llm: {
        openai: {
          defConfig: llmopenaiConfig,
          defFactory: llmopenaiFactory,
          test: llmopenaiTest,
        },
        anthropic: {
          defConfig: llmanthropicConfig,
          defFactory: llmanthropicFactory,
          test: llmanthropicTest,
        },
      },
      agent: {
        codexcli: {
          defConfig: codexcliConfig,
          defFactory: agentAodexcliFactory,
        },
      },
    },
    chat: {
      llm: {
        "https://openrouter.ai/api/v1": {
          protocols: ["openai"],
          agents: ["codexcli"],
          apikeys: [],
          models: ["openai/gpt-oss-120b:free"],
        },
        "https://api.deepseek.com": {
          protocols: ["openai"],
          agents: [],
          apikeys: [],
          models: ["deepseek-v4-flash", "deepseek-v4-pro"],
        },
        "https://api.deepseek.com/anthropic": {
          protocols: ["anthropic"],
          agents: [],
          apikeys: [],
          models: ["deepseek-v4-flash", "deepseek-v4-pro"],
        },
      },
      codexcli: {
        approvalPolicy: "never",
        sandboxMode: "danger-full-access",
        networkAccessEnabled: true,
      },

    },
  };
});

export default createStore;
