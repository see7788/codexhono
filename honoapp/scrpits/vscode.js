// scrpits/vscode.ts
import * as vscode from "vscode";
import { spawn } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

// scrpits/public.ts
import { join } from "path";
var honoStartOptions = (runtimeOptions) => {
  const honoPath = runtimeOptions.HONO_PATH;
  return {
    command: process.execPath,
    args: [
      join(honoPath, "node_modules/tsx/dist/cli.mjs"),
      "watch",
      "--clear-screen=false",
      "--include",
      join(honoPath, "src"),
      "--include",
      join(honoPath, "node_modules/extends-vite/src"),
      "--include",
      join(honoPath, "node_modules/extends-zustand/src"),
      "--exclude",
      join(honoPath, "../reactapp"),
      join(honoPath, "src/index.ts"),
      "--cwd",
      runtimeOptions.CWD_PATH,
      "--hono",
      runtimeOptions.HONO_PATH
    ],
    options: {
      env: process.env,
      stdio: "inherit",
      windowsHide: true
    }
  };
};

// scrpits/vscode.ts
var server;
async function activate(context) {
  const activeEditorPush = () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) console.log(editor.document.uri.fsPath);
  };
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspacePath) throw new Error("VSCode workspace folder is required");
  const honoPath = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const runtimeOptions = {
    CWD_PATH: workspacePath,
    HONO_PATH: honoPath
  };
  const startOptions = honoStartOptions(runtimeOptions);
  server = spawn(startOptions.command, startOptions.args, startOptions.options);
  context.subscriptions.push(
    // 当前文件切换时触发
    vscode.window.onDidChangeActiveTextEditor(activeEditorPush),
    // 工作区文件夹增删时触发
    vscode.workspace.onDidChangeWorkspaceFolders(activeEditorPush)
  );
  activeEditorPush();
}
function deactivate() {
  server.kill();
}
export {
  activate,
  deactivate
};
