import * as vscode from "vscode";
import { spawn, type ChildProcess } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { EnvOptions } from "../src/runtime.js";
import { honoStartOptions } from "./public.js";
/**
 * VSCode 插件入口只会约定调用这两个导出：
 * - activate(context): 插件被激活时调用，用来启动服务、注册事件监听、注册命令。
 * - deactivate(): 插件被停用或 VSCode 退出时调用，用来释放资源；没有清理逻辑时可以留空。
 *
 * 其他能力一般不是生命周期回调，而是在 activate 内通过 vscode API 注册：
 * - vscode.commands.registerCommand: 注册命令回调。
 * - vscode.window.onDidChangeActiveTextEditor: 监听当前编辑器变化。
 * - vscode.workspace.onDidChangeWorkspaceFolders: 监听工作区变化。
 * - vscode.workspace.onDidChangeTextDocument: 监听文档内容变化。
 */
let server: ChildProcess;

// VSCode 插件激活回调。这里拉起 hono bin，并输出当前 active editor 路径。
export async function activate(context: vscode.ExtensionContext) {
  const activeEditorPush = () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) console.log(editor.document.uri.fsPath);
  };
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspacePath) throw new Error("VSCode workspace folder is required");
  const honoPath = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const runtimeEnv: EnvOptions = {
    CWD_PATH: workspacePath,
    HONO_PATH: honoPath,
  };
  const startOptions = honoStartOptions(runtimeEnv);
  server = spawn(startOptions.command, startOptions.args, startOptions.options);
  context.subscriptions.push(
    // 当前文件切换时触发
    vscode.window.onDidChangeActiveTextEditor(activeEditorPush),
    // 工作区文件夹增删时触发
    vscode.workspace.onDidChangeWorkspaceFolders(activeEditorPush),
  );
  activeEditorPush();
}

// VSCode 插件停用回调。这里停止插件启动的 hono 子进程。
export function deactivate() {
  server.kill();
}
