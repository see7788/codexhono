import Editor from "@monaco-editor/react";
import { CloseOutlined, DeleteOutlined, SaveOutlined, SplitCellsOutlined } from "@ant-design/icons";
import { Button, Dropdown, FloatButton, message, Tooltip } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import type * as Monaco from "monaco-editor";
import type { editor } from "monaco-editor";
import type { Tpl } from "honoapp/src/tpl/source";
import ExtendsDrawer from "./ExtendsDrawer";
import appStore from "../store";

type Nodes = Record<string, string | number>;
type TargetRange = { target: string; start: number; end: number };
type NavigationTree = {
  text: string;
  spans?: Array<{ start: number; length: number }>;
  childItems?: NavigationTree[];
};
type TypeScriptWorker = {
  getNavigationTree: (fileName: string) => Promise<NavigationTree | undefined>;
};
type MonacoWithTypeScriptWorker = typeof Monaco & {
  languages: typeof Monaco.languages & {
    typescript: typeof Monaco.languages.typescript & {
      getTypeScriptWorker: () => Promise<(uri: editor.ITextModel["uri"]) => Promise<TypeScriptWorker>>;
    };
  };
};
const baseEditorOptions = {
  automaticLayout: true,
  minimap: { enabled: false },
  mouseWheelZoom: false,
  scrollBeyondLastLine: false,
  tabSize: 2,
} satisfies editor.IStandaloneEditorConstructionOptions;
const fontSizeInRange = (value: number) => Math.min(24, Math.max(10, value));
const optionsWithFontSize = (fontSize: number) => ({
  ...baseEditorOptions,
  fontSize,
  lineHeight: Math.round(fontSize * 1.5),
}) satisfies editor.IStandaloneEditorConstructionOptions;

const renderSection = (item: Tpl["agentsMd"]["sections"][number]) => [
  item.title ? `## ${item.title}` : undefined,
  item.text,
  ...(item.items ? ["", ...item.items.map(value => `- ${value}`)] : []),
  ...(item.orderedItems ? ["", ...item.orderedItems.map((value, index) => `${index + 1}. ${value}`)] : []),
  ...(item.code ? ["", `\`\`\`${item.code.language}`, item.code.content, "```"] : []),
].filter(value => value !== undefined).join("\n");
const renderAgentsMd = (tpl: Tpl) => `${tpl.agentsMd.sections.map(renderSection).join("\n\n")}\n`;
const renderConfigToml = (tpl: Tpl) => [
  ...(tpl.configToml.developerInstructions ? [
    `developer_instructions = ${JSON.stringify(tpl.configToml.developerInstructions.join("\n"))}`,
    "",
  ] : []),
  "[features]",
  `hooks = ${tpl.configToml.features.hooks}`,
  "",
  ...tpl.configToml.hooks.UserPromptSubmit.flatMap(hook => ["[[hooks.UserPromptSubmit]]", `type = ${JSON.stringify(hook.type)}`, `command = ${JSON.stringify(hook.command)}`, `timeout = ${hook.timeout}`, ""]),
  ...tpl.configToml.hooks.Stop.flatMap(hook => ["[[hooks.Stop]]", `type = ${JSON.stringify(hook.type)}`, `command = ${JSON.stringify(hook.command)}`, `timeout = ${hook.timeout}`, ""]),
].join("\n");
const renderSkill = (dir: string, skill: Tpl["skills"][string]) => [
  "---",
  `name: ${JSON.stringify(dir)}`,
  `description: ${JSON.stringify(skill.description)}`,
  "---",
  "",
  `# ${skill.title}`,
  skill.intro ? `\n${skill.intro}` : "",
  ...skill.sections.map(item => `\n${renderSection(item)}`),
  "",
].join("\n");
const braceDelta = (line: string) => {
  let quote: "'" | "\"" | "`" | undefined;
  let delta = 0;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (quote) {
      if (char === "\\") index += 1;
      else if (char === quote) quote = undefined;
      continue;
    }
    if (char === "/" && next === "/") break;
    if (char === "'" || char === "\"" || char === "`") quote = char;
    else if (char === "{") delta += 1;
    else if (char === "}") delta -= 1;
  }
  return delta;
};
const targetRangesByBraces = (source: string, nodes: Nodes) => {
  const lines = source.split(/\r?\n/);
  const ranges: TargetRange[] = [];
  const stack: Array<{ target: string; start: number; closeDepth: number }> = [];
  const tplLineIndex = lines.findIndex(line => /^\s*const\s+tpl\s*:\s*Tpl\s*=/.test(line));
  let depth = 0;
  for (let index = Math.max(0, tplLineIndex); index < lines.length; index += 1) {
    const line = lines[index];
    if (depth === 1) {
      if (/^\s*agentsMd\s*:/.test(line)) stack.push({ target: "agentsMd", start: index + 1, closeDepth: 1 });
      if (/^\s*configToml\s*:/.test(line)) stack.push({ target: "configToml", start: index + 1, closeDepth: 1 });
    }
    if (depth === 2) {
      const skillKey = /^\s*(?:\[nodes\.([A-Za-z_$][\w$]*)\]|"([^"]+)"|'([^']+)')\s*:/.exec(line);
      if (skillKey) {
        const key = skillKey[1] ? String(nodes[skillKey[1]] ?? skillKey[1]) : skillKey[2] ?? skillKey[3];
        stack.push({ target: `skill:${key}`, start: index + 1, closeDepth: 2 });
      }
    }
    depth += braceDelta(line);
    while (stack.length > 0 && depth <= stack[stack.length - 1].closeDepth) {
      const range = stack.pop();
      if (range) ranges.push({ ...range, end: index + 1 });
    }
  }
  return ranges;
};
const navigationNodeRange = (model: editor.ITextModel, node: NavigationTree) => {
  const span = node.spans?.[0];
  if (!span) return undefined;
  return {
    start: model.getPositionAt(span.start).lineNumber,
    end: model.getPositionAt(span.start + span.length).lineNumber,
  };
};
const findNavigationNode = (node: NavigationTree, text: string): NavigationTree | undefined => {
  if (node.text === text) return node;
  for (const child of node.childItems ?? []) {
    const result = findNavigationNode(child, text);
    if (result) return result;
  }
};
const skillTargetFromNavigationText = (text: string, nodes: Nodes) => {
  const nodeKey = /^\[nodes\.([A-Za-z_$][\w$]*)\]$/.exec(text);
  if (nodeKey) return `skill:${String(nodes[nodeKey[1]] ?? nodeKey[1])}`;
  const quotedKey = /^["'](.+)["']$/.exec(text);
  if (quotedKey) return `skill:${quotedKey[1]}`;
};
const targetRangesByNavigation = (model: editor.ITextModel, tree: NavigationTree, nodes: Nodes) => {
  const tplNode = findNavigationNode(tree, "tpl");
  const skillsNode = tplNode?.childItems?.find(item => item.text === "skills");
  const ranges: TargetRange[] = [];
  for (const target of ["agentsMd", "configToml"]) {
    const node = tplNode?.childItems?.find(item => item.text === target);
    const range = node ? navigationNodeRange(model, node) : undefined;
    if (range) ranges.push({ target, ...range });
  }
  for (const node of skillsNode?.childItems ?? []) {
    const target = skillTargetFromNavigationText(node.text, nodes);
    const range = navigationNodeRange(model, node);
    if (target && range) ranges.push({ target, ...range });
  }
  return ranges;
};
const targetAtLine = (lineNumber: number, fileOptions: Array<{ label: string; value: string }>, ranges: TargetRange[]) => {
  const targets = new Set(fileOptions.map(item => item.value));
  return ranges.find(range => range.start <= lineNumber && lineNumber <= range.end && targets.has(range.target))?.target;
};
const lineForTarget = (source: string, target: string, nodes: Nodes, ranges: TargetRange[]) => {
  const range = ranges.find(item => item.target === target) ?? targetRangesByBraces(source, nodes).find(item => item.target === target);
  if (range) return range.start;
  const lines = source.split(/\r?\n/);
  const tplLineIndex = lines.findIndex(line => /^\s*const\s+tpl\s*:\s*Tpl\s*=/.test(line));
  for (let index = Math.max(0, tplLineIndex); index < lines.length; index += 1) {
    const line = lines[index];
    if (target === "agentsMd" && /^\s*agentsMd\s*:/.test(line)) return index + 1;
    if (target === "configToml" && /^\s*configToml\s*:/.test(line)) return index + 1;
    const skillKey = /^\s*(?:\[nodes\.([A-Za-z_$][\w$]*)\]|"([^"]+)"|'([^']+)')\s*:/.exec(line);
    if (!skillKey) continue;
    const key = skillKey[1] ? String(nodes[skillKey[1]] ?? skillKey[1]) : skillKey[2] ?? skillKey[3];
    if (target === `skill:${key}`) return index + 1;
  }
};
const executableSource = (value: string) => value
  .replace(/\r?\ntype Tpl = .*\r?\n\r?\n(?=const tpl\s*:)/, "\n")
  .replace(/(\bconst\s+nodes\s*=\s*[\s\S]*?)\s+as\s+const;/, "$1;")
  .replace(/\bconst\s+tpl\s*:\s*Tpl\s*=/, "const tpl =");
const lineStartOffsets = (value: string) => {
  const offsets = [0];
  for (const match of value.matchAll(/\r?\n/g)) offsets.push(match.index + match[0].length);
  return offsets;
};
const offsetAtPosition = (lineStarts: number[], lineNumber: number, column: number) => (lineStarts[lineNumber - 1] ?? 0) + column - 1;
const runtimeNodeRanges = (value: string) => {
  const lineStarts = lineStartOffsets(value);
  const lines = value.split(/\r?\n/);
  const ranges: Array<{ start: number; end: number }> = [];
  const nodesStart = lines.findIndex(line => /^\s*const\s+nodes\s*=/.test(line));
  if (nodesStart < 0) return ranges;
  for (let index = nodesStart + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s*}\s+as\s+const;/.test(line)) break;
    if (!/^\s*"[A-Z0-9_]+"\s*:/.test(line)) continue;
    ranges.push({
      start: lineStarts[index],
      end: index + 1 < lineStarts.length ? lineStarts[index + 1] : value.length,
    });
  }
  return ranges;
};
const runtimeNodeChangeAllowed = (previous: string, changes: editor.IModelContentChange[]) => {
  const lineStarts = lineStartOffsets(previous);
  const protectedRanges = runtimeNodeRanges(previous);
  for (const change of changes) {
    const start = offsetAtPosition(lineStarts, change.range.startLineNumber, change.range.startColumn);
    const end = offsetAtPosition(lineStarts, change.range.endLineNumber, change.range.endColumn);
    const touchedRanges = protectedRanges.filter(range => (
      start < range.end && end > range.start
    ) || (
        start === end && start > range.start && start < range.end
      ));
    if (touchedRanges.length === 0) continue;
    if (change.text !== "") return false;
    if (touchedRanges.some(range => start > range.start || end < range.end)) return false;
  }
  return true;
};

export default function CodexTplPage() {
  const existingTargets = appStore(state => state.tpl.existingTargets);
  const loading = appStore(state => state.tpl.loading);
  const source = appStore(state => state.tpl.source);
  const sourceSaveStatus = appStore(state => state.tpl.sourceSaveStatus);
  const sourceSaveTick = appStore(state => state.tpl.sourceSaveTick);
  const sourceChange = appStore(state => state.tplActions.sourceChange);
  const sourceLoad = appStore(state => state.tplActions.sourceLoad);
  const sourceSave = appStore(state => state.tplActions.sourceSave);
  const sourceSaveStatusChange = appStore(state => state.tplActions.sourceSaveStatusChange);
  const sourceSaveTickNext = appStore(state => state.tplActions.sourceSaveTickNext);
  const targetDelete = appStore(state => state.tplActions.targetDelete);
  const targetPut = appStore(state => state.tplActions.targetPut);
  const [target, setTarget] = useState("agentsMd");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sourceFontSize, setSourceFontSize] = useState(12);
  const [previewFontSize, setPreviewFontSize] = useState(12);
  const [sourceEditorReady, setSourceEditorReady] = useState(0);
  const monacoRef = useRef<MonacoWithTypeScriptWorker | null>(null);
  const sourceEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const acceptedSourceRef = useRef("");
  const revertingSourceRef = useRef(false);
  const targetRangesRef = useRef<TargetRange[]>([]);
  const targetRangeVersionRef = useRef(0);
  const fileOptionsRef = useRef<Array<{ label: string; value: string }>>([]);
  const sourcePostReadyRef = useRef(false);
  const sourcePostVersionRef = useRef(0);
  const sourceEditorOptions = useMemo(() => optionsWithFontSize(sourceFontSize), [sourceFontSize]);
  const previewEditorOptions = useMemo(() => optionsWithFontSize(previewFontSize), [previewFontSize]);

  useEffect(() => {
    sourceLoad()
      .catch(error => {
        console.error(error);
        message.error("codextpl 加载失败");
      });
  }, [sourceLoad]);

  const tpl = useMemo(() => {
    if (!source.trim()) return "";
    try {
      return Function(`"use strict";${executableSource(source)}; return tpl;`)() as Tpl;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  }, [source]);

  useEffect(() => {
    if (!sourcePostReadyRef.current) {
      if (source !== "") sourcePostReadyRef.current = true;
      return;
    }

    const version = sourcePostVersionRef.current + 1;
    sourcePostVersionRef.current = version;
    sourceSaveStatusChange("pending");
    sourceSaveTickNext();
    const timer = window.setTimeout(() => {
      const model = sourceEditorRef.current?.getModel();
      const hasEditorError = model && monacoRef.current
        ? monacoRef.current.editor.getModelMarkers({ resource: model.uri })
          .some(item => item.severity === monacoRef.current?.MarkerSeverity.Error)
        : false;
      if (typeof tpl !== "object" || hasEditorError) {
        if (sourcePostVersionRef.current === version) sourceSaveStatusChange("failed");
        return;
      }
      if (sourcePostVersionRef.current === version) sourceSaveStatusChange("saving");
      sourceSave(source)
        .then(() => {
          if (sourcePostVersionRef.current === version) sourceSaveStatusChange("saved");
        })
        .catch(error => {
          console.error("codextpl source save failed:", error);
          if (sourcePostVersionRef.current === version) sourceSaveStatusChange("failed");
        });
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [source, sourceSave, sourceSaveStatusChange, sourceSaveTickNext, tpl]);
  useEffect(() => {
    const editorInstance = sourceEditorRef.current;
    const monacoInstance = monacoRef.current;
    if (typeof tpl !== "object" || !editorInstance || !monacoInstance) {
      targetRangesRef.current = [];
      return;
    }
    const version = targetRangeVersionRef.current + 1;
    targetRangeVersionRef.current = version;
    const timer = window.setTimeout(() => {
      const model = editorInstance.getModel();
      if (!model) return;
      monacoInstance.languages.typescript.getTypeScriptWorker()
        .then(workerFactory => workerFactory(model.uri))
        .then(worker => worker.getNavigationTree(model.uri.toString()))
        .then(tree => {
          if (targetRangeVersionRef.current !== version) return;
          const ranges = tree ? targetRangesByNavigation(model, tree, tpl.nodes) : [];
          targetRangesRef.current = ranges.length > 0 ? ranges : targetRangesByBraces(editorInstance.getValue(), tpl.nodes);
        })
        .catch((error: unknown) => {
          console.error("codextpl navigation tree failed:", error);
          if (targetRangeVersionRef.current === version) targetRangesRef.current = targetRangesByBraces(editorInstance.getValue(), tpl.nodes);
        });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [source, sourceEditorReady, tpl]);
  const fileOptions = useMemo(() => [
    { label: "AGENTS.md", value: "agentsMd" },
    { label: "config.toml", value: "configToml" },
    ...(typeof tpl === "object" ? Object.keys(tpl.skills).map(dir => ({ label: `skills/${dir}/SKILL.md`, value: `skill:${dir}` })) : []),
  ], [tpl]);
  fileOptionsRef.current = fileOptions;
  const position = Math.max(0, fileOptions.findIndex(item => item.value === target));
  const selectedLabel = fileOptions[position]?.label ?? target;
  const pathValue = target.startsWith("skill:") ? ["skills", target.slice("skill:".length), "SKILL.md"] : [selectedLabel];
  const skillItems = typeof tpl === "object" ? Object.keys(tpl.skills).map(dir => ({ key: `skill:${dir}`, label: dir })) : [];
  const rootItems = [
    { key: "agentsMd", label: "AGENTS.md" },
    { key: "configToml", label: "config.toml" },
    { key: "skills", label: "skills" },
  ];
  const preview = useMemo(() => {
    if (typeof tpl !== "object") return tpl;
    if (target === "agentsMd") return renderAgentsMd(tpl);
    if (target === "configToml") return renderConfigToml(tpl);
    const dir = target.slice("skill:".length);
    const skill = tpl.skills[dir];
    return skill ? renderSkill(dir, skill) : `skill not found: ${dir}`;
  }, [target, tpl]);
  const targetExists = existingTargets.includes(target);
  const zoomSource = (event: React.WheelEvent) => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    event.stopPropagation();
    setSourceFontSize(value => fontSizeInRange(value + (event.deltaY < 0 ? 1 : -1)));
  };
  const zoomPreview = (event: React.WheelEvent) => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    event.stopPropagation();
    setPreviewFontSize(value => fontSizeInRange(value + (event.deltaY < 0 ? 1 : -1)));
  };
  const targetAtSourceLine = (editorInstance: editor.IStandaloneCodeEditor, lineNumber: number) => {
    const sourceValue = editorInstance.getValue();
    const tplValue = Function(`"use strict";${executableSource(sourceValue)}; return tpl;`)() as Tpl;
    return targetAtLine(lineNumber, fileOptionsRef.current, targetRangesByBraces(sourceValue, tplValue.nodes));
  };
  const updateTargetAtSourceLine = (editorInstance: editor.IStandaloneCodeEditor, lineNumber: number) => {
    const next = targetAtSourceLine(editorInstance, lineNumber);
    if (next) setTarget(next);
  };
  const selectTarget = (next: string) => {
    setTarget(next);
    window.requestAnimationFrame(() => {
      if (typeof tpl !== "object") return;
      const editorInstance = sourceEditorRef.current;
      if (!editorInstance) return;
      const lineNumber = lineForTarget(editorInstance.getValue(), next, tpl.nodes, targetRangesRef.current);
      if (!lineNumber) return;
      editorInstance.setPosition({ lineNumber, column: 1 });
      editorInstance.revealLineInCenterIfOutsideViewport(lineNumber);
      editorInstance.focus();
    });
  };
  const syncTargetFromCursor = () => {
    if (typeof tpl !== "object") return;
    const editorInstance = sourceEditorRef.current;
    if (!editorInstance) return;
    updateTargetAtSourceLine(editorInstance, editorInstance.getPosition()?.lineNumber ?? 1);
  };
  const sourceSaveView = {
    idle: { color: "#8c8c8c", background: "#f5f5f5", line: "#8c8c8c", text: "源码未加载" },
    pending: { color: "#ad6800", background: "#fff7e6", line: "#52c41a", text: "等待防抖保存" },
    saving: { color: "#0958d9", background: "#e6f4ff", line: "#1677ff", text: "保存中" },
    saved: { color: "#237804", background: "#f6ffed", line: "#52c41a", text: "已持久化" },
    failed: { color: "#a8071a", background: "#fff1f0", line: "#ff4d4f", text: "持久化失败" },
  }[sourceSaveStatus];

  const putFile = async () => {
    try {
      if (typeof tpl !== "object") throw new Error(tpl);
      await targetPut(target, preview);
      message.success("修改成功");
    } catch (error) {
      console.error(error);
      message.error(error instanceof Error ? error.message : "修改失败");
    }
  };
  const deleteFile = async () => {
    try {
      await targetDelete(target);
      message.success("删除成功");
    } catch (error) {
      console.error(error);
      message.error(error instanceof Error ? error.message : "删除失败");
    }
  };
  const edit = (
    <div data-codextpl-zone="source" style={{ display: "flex", flexDirection: "column", height: "100%", minWidth: 0 }} onWheelCapture={zoomSource}>
      <style>
        {`
          @keyframes codextpl-source-debounce-save {
            from { transform: scaleX(0); }
            to { transform: scaleX(1); }
          }
          @keyframes codextpl-source-active-save {
            from { transform: translateX(-75%) scaleX(.3); }
            to { transform: translateX(175%) scaleX(.3); }
          }
        `}
      </style>
      <div
        aria-live="polite"
        style={{
          alignItems: "center",
          background: sourceSaveView.background,
          borderBottom: "1px solid #d9d9d9",
          color: sourceSaveView.color,
          display: "flex",
          flex: "0 0 20px",
          fontSize: 12,
          justifyContent: "flex-end",
          lineHeight: "20px",
          overflow: "hidden",
          padding: "0 10px",
          position: "relative",
        }}
      >
        <div
          key={sourceSaveTick}
          style={{
            animation: sourceSaveStatus === "pending"
              ? "codextpl-source-debounce-save 2000ms linear forwards"
              : sourceSaveStatus === "saving"
                ? "codextpl-source-active-save 720ms ease-in-out infinite"
                : undefined,
            background: sourceSaveView.line,
            bottom: 0,
            left: 0,
            opacity: sourceSaveStatus === "idle" ? 0.08 : 0.22,
            position: "absolute",
            right: 0,
            top: 0,
            transform: sourceSaveStatus === "saved" || sourceSaveStatus === "failed" ? "scaleX(1)" : "scaleX(0)",
            transformOrigin: "left center",
          }}
        />
        <span style={{ position: "relative", zIndex: 1 }}>{sourceSaveView.text}</span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Editor
          language="typescript"
          path="codextpl.ts"
          theme="hono-green"
          value={source}
          onChange={value => sourceChange(value ?? "")}
          onMount={(editorInstance, monaco) => {
            monacoRef.current = monaco as MonacoWithTypeScriptWorker;
            sourceEditorRef.current = editorInstance;
            acceptedSourceRef.current = editorInstance.getValue();
            setSourceEditorReady(value => value + 1);
            editorInstance.onDidChangeModelContent(event => {
              if (revertingSourceRef.current) return;
              const model = editorInstance.getModel();
              if (!model) return;
              const previous = acceptedSourceRef.current;
              const next = model.getValue();
              if (runtimeNodeChangeAllowed(previous, event.changes)) {
                acceptedSourceRef.current = next;
                return;
              }
              revertingSourceRef.current = true;
              model.setValue(previous);
              sourceChange(previous);
              revertingSourceRef.current = false;
            });
            editorInstance.onDidChangeCursorPosition(event => {
              updateTargetAtSourceLine(editorInstance, event.position.lineNumber);
            });
            editorInstance.onMouseDown(event => {
              const lineNumber = event.target.position?.lineNumber;
              if (!lineNumber) return;
              updateTargetAtSourceLine(editorInstance, lineNumber);
            });
          }}
          options={sourceEditorOptions}
        />
      </div>
    </div>
  );
  const previewTitle = (
    <div style={{ display: "flex", alignItems: "center", minWidth: 0, height: 24, overflow: "hidden" }}>
      <Dropdown
        menu={{
          items: rootItems,
          onClick: ({ key }) => {
            if (key === "agentsMd" || key === "configToml") selectTarget(key);
            if (key === "skills" && skillItems[0]) selectTarget(String(skillItems[0].key));
          },
        }}
      >
        <Button size="small" type="text">{pathValue[0]}</Button>
      </Dropdown>
      {pathValue[0] === "skills" && (
        <>
          <span style={{ color: "#999" }}>/</span>
          <Dropdown menu={{ items: skillItems, onClick: ({ key }) => selectTarget(key) }}>
            <Button size="small" type="text">{pathValue[1]}</Button>
          </Dropdown>
          <span style={{ color: "#999" }}>/</span>
          <Button size="small" type="text">SKILL.md</Button>
        </>
      )}
    </div>
  );
  const previewFooter = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 8 }}>
      <Tooltip title="保存">
        <Button type="text" icon={<SaveOutlined />} loading={loading} onClick={putFile} />
      </Tooltip>
      {targetExists && (
        <Tooltip title="删除">
          <Button type="text" danger icon={<DeleteOutlined />} loading={loading} onClick={deleteFile} />
        </Tooltip>
      )}
      <Tooltip title="关闭">
        <Button type="text" icon={<CloseOutlined />} onClick={() => setPreviewOpen(false)} />
      </Tooltip>
    </div>
  );
  const demo = (
    <ExtendsDrawer
      closable={false}
      destroyOnHidden
      footer={previewFooter}
      getContainer={false}
      mask={false}
      open={previewOpen}
      placement="right"
      title={previewTitle}
      size="46vw"
    >
      <div data-codextpl-zone="preview" style={{ height: "100%", minWidth: 0 }} onWheelCapture={zoomPreview}>
        <Editor
          language={target === "configToml" ? "toml" : "markdown"}
          path={selectedLabel}
          theme="hono-green"
          value={preview}
          options={{ ...previewEditorOptions, readOnly: true }}
        />
      </div>
    </ExtendsDrawer>
  );

  return (
    <div style={{ height: "100vh", minWidth: 0, position: "relative", overflow: "hidden" }}>
      {edit}
      {previewOpen && demo}
      {!previewOpen && (
        <FloatButton
          icon={<SplitCellsOutlined />}
          shape="square"
          tooltip="预览"
          onClick={() => {
            syncTargetFromCursor();
            setPreviewOpen(true);
          }}
        />
      )}
    </div>
  );
}
