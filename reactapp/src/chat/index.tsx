import Editor from "@monaco-editor/react";
import { ArrowDownOutlined, ArrowUpOutlined, SplitCellsOutlined } from "@ant-design/icons";
import { Button, FloatButton, Input, Radio, Segmented } from "antd";
import { Drawer } from "extends-antd/src/Drawer";
import { hc } from "hono/client";
import { useEffect, useRef, useState } from "react";
import type { editor } from "monaco-editor";
import type chatRouterCreate from "honoapp/src/chat";

const client = hc<ReturnType<typeof chatRouterCreate>>(location.origin);
const editorOptions = {
  automaticLayout: true,
  minimap: { enabled: false },
  mouseWheelZoom: false,
  scrollBeyondLastLine: false,
  tabSize: 2,
} satisfies editor.IStandaloneEditorConstructionOptions;
const optionsWithFontSize = (fontSize: number) => ({
  ...editorOptions,
  fontSize,
  lineHeight: Math.round(fontSize * 1.5),
}) satisfies editor.IStandaloneEditorConstructionOptions;
type ChatState = Parameters<typeof client.chat.state.$post>[0]["json"];
const sourceRender = (state: ChatState) => `const state = ${JSON.stringify(state, null, 2)};`;
const sourceParse = (source: string) => {
  const match = /const\s+state\s*=\s*([\s\S]*?);?\s*$/.exec(source);
  return JSON.parse(match?.[1] ?? source) as ChatState;
};
type ChatTarget = "llmopenai" | "llmanthropic" | "codexcli";
type ChatMode = "default" | "all";
const chatTargets = ["codexcli", "llmopenai", "llmanthropic"] as const satisfies readonly ChatTarget[];
const chatModes = ["default", "all"] as const satisfies readonly ChatMode[];
const chatTargetLabel = {
  llmopenai: "llmopenai",
  llmanthropic: "llmanthropic",
  codexcli: "codexcli",
} satisfies Record<ChatTarget, string>;
const chatModeLabel = {
  default: "默认",
  all: "所有",
} satisfies Record<ChatMode, string>;
const emptyTargetText = {
  llmopenai: "",
  llmanthropic: "",
  codexcli: "",
} satisfies Record<ChatTarget, string>;
const emptyTargetPending = {
  llmopenai: false,
  llmanthropic: false,
  codexcli: false,
} satisfies Record<ChatTarget, boolean>;
const defaultPrompt = "你是什么模型";
const { TextArea } = Input;
const llmModelKey = (baseURL: string, model: string) => `${baseURL}\n${model}`;

export default function Chat() {
  const [source, sourceSet] = useState("");
  const [status, statusSet] = useState("");
  const [drawerOpen, drawerOpenSet] = useState(false);
  const [drawerSize, drawerSizeSet] = useState<number>();
  const [chatMode, chatModeSet] = useState<ChatMode>("default");
  const [chatTarget, chatTargetSet] = useState<ChatTarget>("codexcli");
  const [configSource, configSourceSet] = useState(emptyTargetText);
  const [prompt, promptSet] = useState(emptyTargetText);
  const [responseText, responseTextSet] = useState(emptyTargetText);
  const [responseDuration, responseDurationSet] = useState(emptyTargetText);
  const [pending, pendingSet] = useState(emptyTargetPending);
  const [allLlmKey, allLlmKeySet] = useState("");
  const [allConfigSource, allConfigSourceSet] = useState("");
  const [allPrompt, allPromptSet] = useState(defaultPrompt);
  const [allResponseText, allResponseTextSet] = useState("");
  const [allResponseDuration, allResponseDurationSet] = useState("");
  const [allPending, allPendingSet] = useState(false);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const sourceRef = useRef("");
  const lastSavedSourceRef = useRef("");
  const saveBusyRef = useRef(false);
  const savePendingSourceRef = useRef<string | null>(null);
  const [hoverItem, hoverItemSet] = useState<({ path: string[]; index: number; top: number }) | null>(null);

  const chatDrawerOpen = () => {
    promptSet(value => ({
      llmopenai: value.llmopenai || defaultPrompt,
      llmanthropic: value.llmanthropic || defaultPrompt,
      codexcli: value.codexcli || defaultPrompt,
    }));
    drawerOpenSet(true);
  };
  const stateLoad = async () => {
    const response = await client.chat.state.$get();
    if (!response.ok) {
      statusSet(await response.text());
      drawerOpenSet(true);
      return;
    }
    const nextSource = sourceRender(await response.json());
    lastSavedSourceRef.current = nextSource;
    sourceSet(nextSource);
    statusSet("已加载");
  };
  const stateSave = async (nextSource: string) => {
    let json: Parameters<typeof client.chat.state.$post>[0]["json"];
    try {
      json = sourceParse(nextSource);
    } catch (error) {
      statusSet(error instanceof Error ? error.message : String(error));
      return;
    }
    const response = await client.chat.state.$post({ json });
    if (!response.ok) {
      const message = await response.text();
      statusSet(`${message}, rolled back`);
      if (sourceRef.current === nextSource) {
        sourceSet(lastSavedSourceRef.current);
      }
      return;
    }
    lastSavedSourceRef.current = nextSource;
    statusSet("已保存");
  };
  const stateSaveQueue = async (nextSource: string) => {
    if (nextSource === lastSavedSourceRef.current) return;
    if (saveBusyRef.current) {
      savePendingSourceRef.current = nextSource;
      return;
    }
    saveBusyRef.current = true;
    let currentSource: string | null = nextSource;
    try {
      while (currentSource) {
        savePendingSourceRef.current = null;
        await stateSave(currentSource);
        currentSource = savePendingSourceRef.current;
        if (currentSource === lastSavedSourceRef.current) currentSource = null;
      }
    } finally {
      saveBusyRef.current = false;
    }
  };
  const configLoad = async (target: ChatTarget) => {
    const response = target === "llmopenai"
      ? await client.chat.llm.openai.$get()
      : target === "llmanthropic"
        ? await client.chat.llm.anthropic.$get()
        : await client.chat.agent.codexcli.$get();
    drawerOpenSet(true);
    if (!response.ok) {
      statusSet(await response.text());
      return;
    }
    const config = await response.json();
    configSourceSet(value => ({ ...value, [target]: JSON.stringify(config, null, 2) }));
    statusSet(`${chatTargetLabel[target]} 参数已加载`);
  };
  const promptSubmit = async (target: ChatTarget) => {
    const promptText = prompt[target].trim();
    if (!promptText) {
      statusSet(`${chatTargetLabel[target]} 对话内容为空`);
      drawerOpenSet(true);
      return;
    }
    drawerOpenSet(true);
    promptSet(value => ({ ...value, [target]: promptText }));
    pendingSet(value => ({ ...value, [target]: true }));
    responseTextSet(value => ({ ...value, [target]: "" }));
    responseDurationSet(value => ({ ...value, [target]: "" }));
    const startTime = performance.now();
    try {
      const response = target === "llmopenai"
        ? await client.chat.llm.openai.$post({ json: { prompt: promptText } })
        : target === "llmanthropic"
          ? await client.chat.llm.anthropic.$post({ json: { prompt: promptText } })
          : await client.chat.agent.codexcli.$post({ json: { prompt: promptText } });
      if (!response.ok) {
        statusSet(await response.text());
        return;
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error(`${chatTargetLabel[target]} response body is empty`);
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        responseTextSet(current => ({ ...current, [target]: text }));
      }
      text += decoder.decode();
      responseTextSet(current => ({ ...current, [target]: text }));
      const duration = `${((performance.now() - startTime) / 1000).toFixed(2)}s`;
      responseDurationSet(current => ({ ...current, [target]: duration }));
      statusSet(`${chatTargetLabel[target]} 对话完成，耗时 ${duration}`);
    } catch (error) {
      const duration = `${((performance.now() - startTime) / 1000).toFixed(2)}s`;
      responseDurationSet(current => ({ ...current, [target]: duration }));
      statusSet(error instanceof Error ? error.message : String(error));
    } finally {
      pendingSet(value => ({ ...value, [target]: false }));
    }
  };
  const llmConfigShow = (baseURL: string, model: string) => {
    const state = stateParse();
    const config = state?.llm[baseURL];
    if (!config) {
      statusSet(`${baseURL} 配置不存在`);
      return;
    }
    allConfigSourceSet(JSON.stringify({
        apiKey: config.apikeys[0],
        baseURL,
        model,
        protocols: config.protocols,
        agents: config.agents,
      }, null, 2));
    statusSet(`${model} 参数已加载`);
  };
  const llmPromptSubmit = async (baseURL: string, model: string) => {
    const promptText = allPrompt.trim();
    if (!promptText) {
      statusSet(`${model} 对话内容为空`);
      return;
    }
    allPromptSet(promptText);
    allPendingSet(true);
    allResponseTextSet("");
    allResponseDurationSet("");
    const startTime = performance.now();
    try {
      const response = allLlmModel?.protocols.includes("anthropic")
        ? await client.chat.llm.anthropic.test.$post({ json: { baseURL, model, prompt: promptText } })
        : await client.chat.llm.openai.test.$post({ json: { baseURL, model, prompt: promptText } });
      if (!response.ok) {
        statusSet(await response.text());
        return;
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error(`${model} response body is empty`);
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        allResponseTextSet(text);
      }
      text += decoder.decode();
      allResponseTextSet(text);
      const duration = `${((performance.now() - startTime) / 1000).toFixed(2)}s`;
      allResponseDurationSet(duration);
      statusSet(`${model} 对话完成，耗时 ${duration}`);
    } catch (error) {
      const duration = `${((performance.now() - startTime) / 1000).toFixed(2)}s`;
      allResponseDurationSet(duration);
      statusSet(error instanceof Error ? error.message : String(error));
    } finally {
      allPendingSet(false);
    }
  };

  useEffect(() => {
    sourceRef.current = source;
  }, [source]);

  useEffect(() => {
    if (!source || source === lastSavedSourceRef.current) return;
    const id = window.setTimeout(() => {
      void stateSaveQueue(source);
    }, 1000);
    return () => window.clearTimeout(id);
  }, [source]);

  useEffect(() => {
    void stateLoad();
  }, []);

  const stateParse = () => {
    try {
      return sourceParse(source);
    } catch {
      return null;
    }
  };
  const itemMove = (path: string[], from: number, to: number) => {
    const state = stateParse();
    if (!state || from === to) return;
    const target = path.reduce<unknown>((value, key) => (
      value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined
    ), state);
    if (!Array.isArray(target)) return;
    const items = [...target];
    if (to < 0 || to >= items.length) return;
    const [item] = items.splice(from, 1);
    items.splice(to, 0, item);
    const next = structuredClone(state) as Record<string, unknown>;
    const parent = path.slice(0, -1).reduce<Record<string, unknown>>((value, key) => (
      value[key] as Record<string, unknown>
    ), next);
    parent[path[path.length - 1]] = items;
    sourceSet(sourceRender(next as ChatState));
  };
  const itemAtLine = (lineNumber: number) => {
    const pathByDepth: string[] = [];
    let arrayDepth = -1;
    let arrayPath: string[] = [];
    let index = -1;
    const lines = sourceRef.current.split(/\r?\n/);
    for (let lineIndex = 0; lineIndex < lineNumber; lineIndex += 1) {
      const line = lines[lineIndex];
      const indent = line.search(/\S/);
      const depth = indent < 0 ? 0 : indent / 2;
      const keyMatch = /^\s*"([^"]+)"\s*:\s*([\[{])/.exec(line);
      if (keyMatch) {
        pathByDepth[depth] = keyMatch[1];
        pathByDepth.length = depth + 1;
        if (keyMatch[2] === "[") {
          arrayDepth = depth;
          arrayPath = pathByDepth.slice(0, depth + 1);
        }
        index = -1;
        continue;
      }
      if (arrayDepth >= 0 && depth === arrayDepth + 1 && /^\s*(?:"[^"]*"|[\d.-]+|true|false|null)\s*,?\s*$/.test(line)) {
        index += 1;
        if (lineIndex + 1 === lineNumber) return { path: arrayPath, index };
      }
      if (arrayDepth >= 0 && depth === arrayDepth && /^\s*\]\s*,?\s*$/.test(line)) {
        arrayDepth = -1;
        arrayPath = [];
        index = -1;
      }
    }
    return null;
  };
  const itemMoveHover = (step: -1 | 1) => {
    const item = hoverItem;
    if (!item) {
      return;
    }
    itemMove(item.path, item.index, item.index + step);
  };
  const llmEntries = () => {
    const state = stateParse();
    return state ? Object.entries(state.llm) : [];
  };
  const allLlmModels = llmEntries().flatMap(([baseURL, config]) => config.models.map(model => ({
    baseURL,
    key: llmModelKey(baseURL, model),
    model,
    protocols: config.protocols,
  })));
  const allLlmModel = allLlmModels.find(item => item.key === allLlmKey) ?? allLlmModels[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", minWidth: 0 }}>
      <Drawer
        open={drawerOpen}
        title="chat"
        resizeSize={drawerSize}
        size="min(520px, calc(100vw - 72px))"
        onResizeSizeChange={drawerSizeSet}
        onClose={() => drawerOpenSet(false)}
      >
        <div style={{ marginBottom: 12 }}>{status}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Segmented
            block
            options={chatModes.map(mode => ({ label: chatModeLabel[mode], value: mode }))}
            value={chatMode}
            onChange={value => chatModeSet(value as ChatMode)}
          />
          {chatMode === "all" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {allLlmModels.length > 0 && (
                <>
                  <Radio.Group
                    value={allLlmModel?.key}
                    onChange={event => allLlmKeySet(event.target.value)}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {allLlmModels.map(item => (
                        <Radio key={item.key} value={item.key}>
                          <span style={{ wordBreak: "break-all" }}>{item.baseURL}</span>
                          <span style={{ color: "#666", marginLeft: 8, wordBreak: "break-word" }}>{item.model}</span>
                        </Radio>
                      ))}
                    </div>
                  </Radio.Group>
                  <pre style={{ margin: 0, maxHeight: 160, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {allConfigSource}
                  </pre>
                  <TextArea
                    autoSize={{ minRows: 3, maxRows: 6 }}
                    placeholder={`${allLlmModel?.model ?? "llm"} 对话`}
                    value={allPrompt}
                    onChange={event => allPromptSet(event.target.value)}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button disabled={!allLlmModel} onClick={() => allLlmModel && llmConfigShow(allLlmModel.baseURL, allLlmModel.model)}>获取配置</Button>
                    <Button disabled={!allLlmModel} loading={allPending} type="primary" onClick={() => allLlmModel && llmPromptSubmit(allLlmModel.baseURL, allLlmModel.model)}>测试对话</Button>
                  </div>
                  {allResponseDuration && <div style={{ color: "#666" }}>响应时长：{allResponseDuration}</div>}
                  <pre style={{ margin: 0, maxHeight: 220, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {allResponseText}
                  </pre>
                </>
              )}
              {allLlmModels.length === 0 && <div style={{ color: "#999" }}>没有 llm 配置</div>}
            </div>
          )}
          {chatMode === "default" && (
            <>
          <Segmented
            block
            options={chatTargets.map(target => ({ label: chatTargetLabel[target], value: target }))}
            value={chatTarget}
            onChange={value => chatTargetSet(value as ChatTarget)}
          />
          <pre style={{ margin: 0, maxHeight: 180, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {configSource[chatTarget]}
          </pre>
          <TextArea
            autoSize={{ minRows: 3, maxRows: 6 }}
            placeholder={`${chatTargetLabel[chatTarget]} 对话`}
            value={prompt[chatTarget]}
            onChange={event => promptSet(value => ({ ...value, [chatTarget]: event.target.value }))}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={() => configLoad(chatTarget)}>获取配置</Button>
            <Button loading={pending[chatTarget]} type="primary" onClick={() => promptSubmit(chatTarget)}>测试对话</Button>
          </div>
          {responseDuration[chatTarget] && <div style={{ color: "#666" }}>响应时长：{responseDuration[chatTarget]}</div>}
          <pre style={{ margin: 0, maxHeight: 220, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {responseText[chatTarget]}
          </pre>
            </>
          )}
        </div>
      </Drawer>
      <div style={{ flex: 1, minHeight: 0, position: "relative" }} onMouseLeave={() => hoverItemSet(null)}>
        {hoverItem && (
          <div style={{ display: "flex", gap: 2, left: 4, position: "absolute", top: hoverItem.top, zIndex: 20 }}>
            <Button icon={<ArrowUpOutlined />} size="small" onClick={() => itemMoveHover(-1)} />
            <Button icon={<ArrowDownOutlined />} size="small" onClick={() => itemMoveHover(1)} />
          </div>
        )}
        <Editor
          defaultLanguage="typescript"
          language="typescript"
          loading={null}
          options={optionsWithFontSize(14)}
          path="chat-state.ts"
          theme="hono-green"
          value={source}
          onMount={editor => {
            editorRef.current = editor;
            editor.onMouseMove(event => {
              const lineNumber = event.target.position?.lineNumber;
              const item = lineNumber ? itemAtLine(lineNumber) : null;
              const position = lineNumber ? editor.getScrolledVisiblePosition({ lineNumber, column: 1 }) : null;
              hoverItemSet(item && position ? { ...item, top: position.top } : null);
            });
          }}
          onChange={value => sourceSet(value ?? "")}
        />
      </div>
      <FloatButton.Group shape="square">
        {!drawerOpen && <FloatButton icon={<SplitCellsOutlined />} tooltip="chat 工具" onClick={chatDrawerOpen} />}
      </FloatButton.Group>
    </div>
  );
}
