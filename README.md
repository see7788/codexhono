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
│       ├── index.ts                      # 用户级同步、服务启动和项目模板物化入口
│       ├── runtime.ts                    # 工作区与服务运行时
│       │   ├── init()                    # 选择局域网地址和可用端口并启动 Hono
│       │   └── HOOK_*_COMMAND            # 生成用户输入与助手回复 hook 命令
│       ├── routers.ts                    # Hono 路由汇总与 React 应用托管
│       ├── tpl-global.ts                 # PC 用户级 AGENTS、MCP 与 skills 模板及幂等增量同步
│       │   ├── source                    # 按 tplGlobal_t 定义用户级 AGENTS、MCP、skills 与环境策略
│       │   └── sync()                    # 安全合并用户配置；尚未实例化和接入入口
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
│       │   ├── source.ts                 # 项目级空模板、hooks 与 Electron 环境策略
│       │   │   └── tplGlobal_t           # 复用模板结构并声明用户级 MCP 配置类型
│       │   ├── render.ts                 # 项目级与用户级共同消费的 AGENTS/skill 渲染
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
2. 入口先通过 `TplGlobal` 增量同步用户级 AGENTS、MCP 与 skills，再由 Hono 运行时定位执行命令所在工作区，创建 `.codex`、`.zustand`，并将项目模板中的 hook 命令和 Electron 环境策略渲染为真实值。
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

`.codex` 是运行时生成产物；PC 用户级 AGENTS、MCP 与 skills 的长期规则只维护在 `honoapp/src/tpl-global.ts`，项目级 `honoapp/src/tpl/source.ts` 只维护 hooks 与 Electron 环境策略。
模板只在存在多个真实消费点，或定义自身维护独立状态、生命周期、不变量时允许抽象；其他单点定义必须内联到真实消费处，移动可见性、文件或目录不视为复用。
项目自定义函数、方法、构造器和 store action 出现两个及以上业务形参时统一使用一个对象形参，并优先内联其类型；框架和第三方固定回调签名不受此约束。
`extends-*` 被视为用户个人长期维护的独立工具库。当前项目调用不满足其既有公开能力时，模板要求返回 `Library Boundary Decision Required` 并停止写入；未经用户选择，不得在工具库或消费项目新增文件、接口、适配层，不得修改接口参数或业务逻辑，只能先提供“新增能力”与“修改既有能力”的兼容性和影响分析供用户决策。
`pnpm-workspace.yaml` 启用 `injectWorkspacePackages`，使跨目录工作区库在当前消费项目的依赖上下文中解析 Hono、Zustand、Immer 等框架，避免源码软链接复用其他工作区 `node_modules` 后产生同名类型不兼容。
模板处理公共库冲突时先在消费项目根使用 `pnpm why/list -r` 区分直接依赖、传递依赖和跨 API 的共享框架：跨边界类型由 peerDependencies 与消费项目版本归一，内部依赖允许隔离多版本，传递依赖优先升级上游并只在兼容时 overrides。多个根 workspace 共同消费相邻 `extends-*` 时检查 injection；常规声明一致仍报错才检查实际解析路径，并通过另一消费项目重新 install 后回到原项目 typecheck 的方式验证不会复发。
真实外部链路按调用、生产者状态、原始响应、本地解析和消费者显示逐层取证；第三方页面结构变化后重新获取 DOM，owner 已有关系不接受消费者恢复参数覆盖。长异步任务使用符合服务时长的轮询与统一限流退避，同一路径连续两次失败后停止试探并回到最早未证实边界。临时诊断必须带退出条件并在事实确认后删除。个人维护项目默认授予 AI 当前分支 Git 高权限：禁止创建或切换分支，但任务需要的提交、历史整理、同步、push 和 tag 无需再次确认；长任务在真实验证通过且可独立回退的里程碑自动提交并推送当前分支和有价值的 tag。
