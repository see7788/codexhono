import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import * as vscode from "vscode";

type ServiceState = "stopped" | "starting" | "running" | "stopping";

class StatusViewProvider implements vscode.TreeDataProvider<string> {
  private readonly changeEmitter = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.changeEmitter.event;
  private state: ServiceState = "stopped";

  stateSet(state: ServiceState) {
    this.state = state;
    this.changeEmitter.fire();
  }

  getChildren() {
    return ["service"];
  }

  getTreeItem() {
    const pending = this.state === "starting" || this.state === "stopping";
    const running = this.state === "running";
    const item = new vscode.TreeItem(
      pending ? "服务状态变更中" : running ? "服务运行中" : "服务已停止",
      vscode.TreeItemCollapsibleState.None,
    );
    item.command = pending ? undefined : { command: "extendsCodex.serviceToggle", title: "切换 extends-codex 服务" };
    item.iconPath = new vscode.ThemeIcon(
      pending ? "loading~spin" : running ? "debug-stop" : "debug-start",
      new vscode.ThemeColor(pending ? "foreground" : running ? "testing.iconPassed" : "testing.iconQueued"),
    );
    return item;
  }
}

class ServiceController {
  private browserProcess: ChildProcess | undefined;
  private origin: string | undefined;
  private serviceProcess: ChildProcess | undefined;
  private state: ServiceState = "stopped";

  constructor(
    private readonly browserProfilePath: string,
    private readonly output: vscode.OutputChannel,
    private readonly stateChange: (state: ServiceState) => void,
  ) {}

  get stateGet() {
    return this.state;
  }

  async toggle(input: { workspacePath: string }) {
    if (this.state === "stopped") return this.start(input);
    if (this.state === "running") return this.stop();
  }

  async stop() {
    if (this.state === "stopped" || this.state === "stopping") return;
    this.stateSet("stopping");
    const browserProcess = this.browserProcess;
    const serviceProcess = this.serviceProcess;
    this.browserProcess = undefined;
    this.serviceProcess = undefined;
    this.origin = undefined;
    await Promise.all([processStop(browserProcess), processStop(serviceProcess)]);
    this.stateSet("stopped");
  }

  private async start(input: { workspacePath: string }) {
    this.stateSet("starting");
    try {
      const serviceProcess = serviceProcessStart(input);
      this.serviceProcess = serviceProcess;
      this.processWatch(serviceProcess);
      const origin = await serviceOriginWait({ output: this.output, serviceProcess });
      this.origin = origin;
      const browserProcess = browserProcessStart({ origin, profilePath: this.browserProfilePath });
      this.browserProcess = browserProcess;
      this.browserWatch(browserProcess);
      this.stateSet("running");
    } catch (error) {
      const serviceProcess = this.serviceProcess;
      this.serviceProcess = undefined;
      this.origin = undefined;
      await processStop(serviceProcess);
      this.stateSet("stopped");
      throw error;
    }
  }

  private processWatch(serviceProcess: ChildProcess) {
    serviceProcess.once("exit", (code, signal) => {
      if (this.serviceProcess !== serviceProcess) return;
      this.output.appendLine(`extends-codex exited (${signal ?? code ?? "unknown"})`);
      this.serviceProcess = undefined;
      this.origin = undefined;
      void processStop(this.browserProcess);
      this.browserProcess = undefined;
      this.stateSet("stopped");
    });
  }

  private browserWatch(browserProcess: ChildProcess) {
    browserProcess.once("exit", (code, signal) => {
      if (this.browserProcess !== browserProcess) return;
      this.output.appendLine(`Managed Chrome exited (${signal ?? code ?? "unknown"})`);
      const serviceProcess = this.serviceProcess;
      this.browserProcess = undefined;
      this.serviceProcess = undefined;
      this.origin = undefined;
      void processStop(serviceProcess).finally(() => this.stateSet("stopped"));
    });
  }

  private stateSet(state: ServiceState) {
    this.state = state;
    this.stateChange(state);
  }
}

function serviceProcessStart(input: { workspacePath: string }) {
  return process.platform === "win32"
    ? spawn("cmd.exe", ["/d", "/s", "/c", `extends-codex dev --workspace "${input.workspacePath}"`], { cwd: input.workspacePath, stdio: ["ignore", "pipe", "pipe"], windowsHide: true })
    : spawn("extends-codex", ["dev", "--workspace", input.workspacePath], { cwd: input.workspacePath, stdio: ["ignore", "pipe", "pipe"] });
}

function serviceOriginWait(input: { output: vscode.OutputChannel; serviceProcess: ChildProcess }) {
  return new Promise<string>((resolve, reject) => {
    let output = "";
    const finish = (error?: Error, origin?: string) => {
      clearTimeout(timeout);
      input.serviceProcess.off("error", errorHandle);
      input.serviceProcess.off("exit", exitHandle);
      if (error) reject(error);
      else if (origin) resolve(origin);
    };
    const timeout = setTimeout(() => finish(new Error("等待 extends-codex 服务地址超时，请查看输出面板。")), 30_000);
    const outputHandle = (chunk: Buffer) => {
      const text = chunk.toString();
      input.output.append(text);
      output += text;
      const origin = /honoapp listening on (http:\/\/\S+)/.exec(output)?.[1];
      if (origin) finish(undefined, origin);
    };
    const errorHandle = (error: Error) => finish(error);
    const exitHandle = (code: number | null) => finish(new Error(`extends-codex 启动失败（退出码 ${code ?? "unknown"}）。`));
    input.serviceProcess.stdout?.on("data", outputHandle);
    input.serviceProcess.stderr?.on("data", outputHandle);
    input.serviceProcess.once("error", errorHandle);
    input.serviceProcess.once("exit", exitHandle);
  });
}

function browserProcessStart(input: { origin: string; profilePath: string }) {
  const chromePath = chromePathGet();
  if (!chromePath) throw new Error("未找到 Google Chrome，服务已停止。");
  return spawn(chromePath, [
    `--app=${input.origin}`,
    `--user-data-dir=${input.profilePath}`,
    "--no-default-browser-check",
    "--no-first-run",
  ], { stdio: "ignore", windowsHide: true });
}

function chromePathGet() {
  const candidates = process.platform === "win32"
    ? [
      process.env.PROGRAMFILES && `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
      process.env["PROGRAMFILES(X86)"] && `${process.env["PROGRAMFILES(X86)"]}\\Google\\Chrome\\Application\\chrome.exe`,
      process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    ]
    : process.platform === "darwin"
      ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
      : ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable"];
  return candidates.find((path): path is string => typeof path === "string" && existsSync(path));
}

function processStop(childProcess: ChildProcess | undefined) {
  if (!childProcess || childProcess.exitCode !== null || childProcess.pid === undefined) return Promise.resolve();
  if (process.platform !== "win32") {
    childProcess.kill("SIGTERM");
    return new Promise<void>(resolve => childProcess.once("exit", () => resolve()));
  }
  return new Promise<void>(resolve => {
    const taskkill = spawn("taskkill.exe", ["/PID", String(childProcess.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    taskkill.once("exit", () => resolve());
    taskkill.once("error", () => resolve());
  });
}

export function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel("extends-codex");
  const statusButton = vscode.window.createStatusBarItem("extendsCodex.serviceToggle", vscode.StatusBarAlignment.Left, 10_000);
  const statusProvider = new StatusViewProvider();
  let statusView: vscode.TreeView<string> | undefined;
  const statusRender = (state: ServiceState) => {
    const pending = state === "starting" || state === "stopping";
    const running = state === "running";
    statusButton.text = pending ? "$(loading~spin) extends-codex" : running ? "$(debug-stop) extends-codex" : "$(debug-start) extends-codex";
    statusButton.color = new vscode.ThemeColor(pending ? "foreground" : running ? "testing.iconPassed" : "testing.iconQueued");
    statusButton.tooltip = pending ? "服务状态正在变更" : running ? "服务运行中，点击停止" : "服务已停止，点击启动";
    statusButton.command = pending ? undefined : "extendsCodex.serviceToggle";
    statusProvider.stateSet(state);
    if (statusView) statusView.badge = running ? { value: 1, tooltip: "extends-codex 服务运行中" } : undefined;
  };
  const service = new ServiceController(vscode.Uri.joinPath(context.globalStorageUri, "chrome-profile").fsPath, output, statusRender);
  statusRender(service.stateGet);
  statusView = vscode.window.createTreeView("extendsCodex.status", { treeDataProvider: statusProvider });
  statusRender(service.stateGet);
  statusButton.show();
  context.subscriptions.push(
    output,
    statusButton,
    statusView,
    vscode.commands.registerCommand("extendsCodex.serviceToggle", async () => {
      const activeEditor = vscode.window.activeTextEditor;
      const workspacePath = (activeEditor
        ? vscode.workspace.getWorkspaceFolder(activeEditor.document.uri)?.uri.fsPath
        : undefined) ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspacePath) {
        void vscode.window.showErrorMessage("请先打开工作区，再启动 extends-codex 服务。");
        return;
      }
      const title = service.stateGet === "running" ? "正在关闭 extends-codex" : "正在启动 extends-codex";
      try {
        await vscode.window.withProgress({ location: { viewId: "extendsCodex.status" }, title }, () => service.toggle({ workspacePath }));
      } catch (error) {
        output.show(true);
        void vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
      }
    }),
    { dispose: () => service.stop() },
  );
}

export function deactivate() {
  return undefined;
}
