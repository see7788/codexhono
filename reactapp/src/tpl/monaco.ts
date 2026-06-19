import "monaco-editor/esm/nls.messages.zh-cn.js";
import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.main.js";
import { typescript } from "monaco-editor/esm/vs/editor/editor.main.js";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

let initialized = false;

const setupMonacoEnvironment = () => {
  (self as unknown as {
    MonacoEnvironment: {
      getWorker: (_: string, label: string) => Worker;
    };
  }).MonacoEnvironment = {
    getWorker(_, label) {
      if (label === "json") return new jsonWorker();
      if (label === "css" || label === "scss" || label === "less") return new cssWorker();
      if (label === "html" || label === "handlebars" || label === "razor") return new htmlWorker();
      if (label === "typescript" || label === "javascript") return new tsWorker();
      return new editorWorker();
    },
  };
};

const setupMonacoTheme = () => {
  monaco.editor.defineTheme("hono-green", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "389e0d" },
      { token: "string", foreground: "237804" },
      { token: "number", foreground: "135200" },
      { token: "comment", foreground: "73a857", fontStyle: "italic" },
    ],
    colors: {
      "editor.foreground": "#1f2a1f",
      "editorCursor.foreground": "#389e0d",
      "editorBracketHighlight.foreground1": "#237804",
      "editorBracketHighlight.foreground2": "#389e0d",
      "editorBracketHighlight.foreground3": "#52c41a",
      "editorBracketHighlight.foreground4": "#73d13d",
      "editorBracketHighlight.foreground5": "#95de64",
      "editorBracketHighlight.foreground6": "#135200",
      "editorError.foreground": "#a8071a",
      "editorError.border": "#ffccc7",
      "editorWarning.foreground": "#5b8c00",
      "editorWarning.border": "#d9f7be",
      "editor.lineHighlightBackground": "#f0fbe8",
      "editor.selectionBackground": "#b7eb8f66",
    },
  });
  monaco.editor.setTheme("hono-green");
};

export default function initTplMonaco() {
  if (initialized) return;
  initialized = true;
  setupMonacoEnvironment();
  loader.config({ monaco });
  typescript.typescriptDefaults.setCompilerOptions({
    allowNonTsExtensions: true,
    noEmit: true,
    strict: true,
    target: typescript.ScriptTarget.ESNext,
  });
  typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });
  setupMonacoTheme();
}
