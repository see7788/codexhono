# extends-codex

extends-codex 是运行在 Codex CLI 旁边的本地上下文工作台。它通过 Codex hooks 捕获用户输入和助手回复，由 Hono 服务将事件流推送到 React 页面；页面还可以整理上下文节点、查看 TypeScript 文件与调用关系、调用 Codex CLI 或兼容模型，并维护项目的 `.codex/AGENTS.md`、`config.toml` 和 skills。适合需要检查、裁剪、重放 Codex 上下文，或集中维护项目级 Codex 配置的场景。

## 快速使用

需要 Node.js、pnpm 和已完成登录配置的 Codex CLI。在目标项目根目录运行：

```bash
pnpm dlx github:see7788/extends-codex dev
```

服务会监听局域网地址，从 `3000` 开始选择可用端口，在终端输出 Web 地址，并将当前项目的 `.codex` 模板物化到磁盘。`dev` 使用 watch 模式；其他进程命令如下：

```bash
pnpm dlx github:see7788/extends-codex start
pnpm dlx github:see7788/extends-codex stop
pnpm dlx github:see7788/extends-codex restart
```

长期使用时，建议把命令并入目标项目根 `package.json` 的 `dev` script，例如：

```json
{
  "scripts": {
    "dev": "extends-codex dev"
  }
}
```

## 项目结构

```text
extends-codex/
├── honoapp/
│   └── src/
│       ├── index.ts                      # 服务入口，只负责启动和模板物化
│       ├── runtime.ts                    # 工作区与服务运行时
│       │   ├── init()                    # 选择局域网地址和可用端口并启动 Hono
│       │   └── HOOK_*_COMMAND            # 生成用户输入与助手回复 hook 命令
│       ├── routers.ts                    # Hono 路由汇总与 React 应用托管
│       ├── chat/
│       │   ├── index.ts                  # /chat 模型与代理接口
│       │   │   ├── /state                # 读取和保存模型配置
│       │   │   ├── /llm/*                # 调用或测试 OpenAI、Anthropic 兼容模型
│       │   │   └── /agent/codexcli       # 将上下文任务交给 Codex CLI
│       │   └── store.ts                  # 模型配置、流式调用与 Codex 线程执行
│       ├── file/
│       │   └── index.ts                  # /file 文件与代码关系接口
│       │       └── GET /file             # 按需返回目录、符号、callers 和 callees
│       ├── sse/
│       │   ├── index.ts                  # hook 事件广播接口
│       │   │   ├── GET /sse/events       # 页面订阅事件流
│       │   │   └── POST /ssepush         # 接收 hook 消息并广播
│       │   └── hookReceive.ts             # Codex hook stdin 转发入口
│       ├── tpl/
│       │   ├── source.ts                 # `.codex` 规则、配置和 skills 的模板源
│       │   ├── usercodex.ts              # 用户级 Codex 配置增量同步
│       │   │   └── default()             # 合并 shell 环境排除项并保留其他配置
│       │   ├── store.ts                  # 模板解析、保存与目标文件物化
│       │   └── index.ts                  # /tpl 模板管理接口
│       │       ├── /source                # 读取和更新模板源码
│       │       └── /agentsMd|configToml|skills/* # 发布或删除 `.codex` 目标
│       └── email/
│           └── index.ts                  # /email IMAP 邮件采集接口
│               ├── GET /accounts         # 返回可采集账号
│               └── POST /collect         # 返回邮件正文与附件元信息
├── reactapp/
│   └── src/
│       ├── App.tsx                       # Web 页面入口
│       │   ├── /file                     # 文件、符号和调用关系树
│       │   ├── /sse                      # 上下文节点树与 hook 消息工作台
│       │   ├── /chat                     # 模型配置与测试
│       │   ├── /tpl                      # `.codex` 模板编辑与发布
│       │   └── /email                    # 邮件采集
│       ├── store.ts                      # 前端 zustand 切片组合
│       ├── file/store.ts                 # 文件树按需加载
│       ├── sse/store.ts                  # 上下文编辑、调用与事件接收
│       └── tpl/store.ts                  # 模板加载、保存与目标发布
├── preloads/
│   └── webcodex/src/doubaoAsk.ts         # Web 预加载侧豆包提问能力
├── package.json                          # extends-codex bin 与根开发命令
└── pnpm-workspace.yaml                   # 本仓库及 extends-* 复用包工作区
```

`package.json` 的 `bin` 字段与 `bin/<command>.js|mjs` wrapper 不属于本仓库手写源码，两者由外部 `create-todo-cli nodeScript/nodePackageBinInit` 同步生成。该命令会交互确认命令名和真实源码入口，同时更新 `bin`、`files`、`tsx` 运行依赖，生成负责 `dev/start/stop/restart` 的 wrapper，并执行 `pnpm install` 与 `pnpm link`。检查发布入口时必须把这两个生成结果作为同一组产物核对，不能把 `files` 中的 `bin/` 当成 npm `bin` 声明，也不能仅凭生成产物暂时不存在判定源码入口丢失。

## 运行链路

1. `extends-codex dev` 通过 tsx watch 启动 `honoapp/src/index.ts`。
2. 入口先向用户级 Codex 配置增量合并 shell 环境排除项，再由 Hono 运行时定位执行命令所在工作区，创建 `.codex`、`.zustand`，并将项目模板中的运行地址和 hook 命令渲染为真实值。
3. Codex 的 `UserPromptSubmit` 和 `Stop` hooks 将消息发送到 `/ssepush`，页面通过 `/sse/events` 实时接收。
4. 页面整理出的上下文可以发送给已配置模型，或作为独立任务交给 Codex CLI，并流式显示返回内容。

## 开发

仓库使用 pnpm workspace，并依赖同级的 `extends-hono`、`extends-vite`、`extends-ssh`、`extends-zustand` 和 `extends-antd` 工作区；其中 `extends-ssh` 是 `extends-vite` 的 `workspace:*` 依赖，必须加入同一个根 workspace 才能完成安装。安装依赖后可运行：

```bash
pnpm install
pnpm dev
pnpm docs:check
pnpm typecheck
pnpm build:vscode
```

本仓库的 `pnpm dev` 通过 tsx watch 直接运行 `honoapp/src/index.ts`；上面的 `pnpm dlx github:see7788/extends-codex dev` 是其他项目使用已发布 CLI 的方式，两者不是同一个入口。
`pnpm docs:check` 会在 package、进程/路由入口或模板源变化时要求 README 或 `docs/` 同步变化，作为语义 checklist 之外的机械门禁。

`.codex` 是运行时生成产物；规则、配置或 skill 的长期修改应落在 `honoapp/src/tpl/source.ts` 模板源中。
