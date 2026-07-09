## 快速使用

前置条件：
- 已安装 Node.js 和 pnpm
- 已安装并配置好 Codex CLI
- 已安装 tsx 依赖

使用方式
```bash
pnpm dlx github:see7788/extends-codex dev
pnpm dlx github:see7788/extends-codex stop
pnpm dlx github:see7788/extends-codex restart
```
建议与项目的dev命令合并

## 源码说明

extends-codex 是主要开发区，libs 是复用库。
项目边界：
- 这不是 AGENTS 项目，因为 AGENTS.md 只给 Codex 加规则，不是运行时接口。
- 这不是 Skill 项目，因为 Skill 只给 Codex 加能力说明或工作流，不是事件流。
- 这不是 MCP 项目，因为 MCP 主要让 Codex 调用外部工具，不能让 Codex 把自身消息主动推给 MCP server。
- 这不是 Codex Plugin 项目，因为 Plugin 主要打包分发 hooks、skills、MCP 等配置，不是新的推送通道。
- 这是 Codex hook companion，因为它依赖 Codex hooks 捕获事件，再交给本地 Hono 服务处理。
- 这是 Codex 下游能力，可以使用上游 Codex 生态和 ChatGPT 生态。

项目定位：
- HonoCodex 是一个 Codex 上下文对象化工作台。
- 它把零散的上下文片段、规则文件、工具说明、文件匹配规则和运行配置，整理成可视化、可维护、可重放的上下文对象。
- 它的出发点是：OpenAI 和 Codex 生态里已经有很多官方概念、能力入口和配置文件，例如 AGENTS、Skills、MCP、hooks、plugins、CLI 参数、glob 文件匹配规则和不同层级的配置，但这些东西各自解决一小段问题，组合起来之后上下文从哪里来、如何进入模型、当前到底带了什么内容，都不够直观。
- 很多具体名称本质上都在处理上下文：规则文件决定长期指令，Skills 描述能力和流程，MCP 暴露外部工具和资源，hooks 捕获事件流，plugins 打包分发配置，glob 决定哪些文件进入候选范围，CLI 参数和配置文件决定本次运行环境。
- 现有方式的另一个缺点是可视化很弱。上下文经常散落在对话历史、规则文件、工具说明、资源列表、文件匹配规则、hook 事件、命令参数和临时输入里，用户很难像检查函数入参一样检查一次 AI 调用的完整输入。
- HonoCodex 解决的问题是：Codex UI 的对话历史会越积越长，任务边界容易变模糊，用户很难精确控制本次调用到底带了哪些上下文，也很难把同一组上下文反复调整、重放和比较。
- 它的用途是：用 Web 页面先整理出一组简短、明确、可检查的上下文对象数组，再把这组上下文作为一次独立任务交给 Codex CLI 执行，并把执行结果流式返回页面。
- 它同时通过 Codex hooks 观察当前 Codex 会话，把 Codex 输入框里的用户输入和 AI 回复广播给本地 Hono 服务，再由页面缓存后显示。
- 简单说，这个项目不是让 Codex 变成另一个模型，而是在 Codex 外面加一层本地 Web 工作台，把零零散散的上下文片段和配置变成可视化、可维护的对象，再用这些对象驱动一次次 AI 调用。

核心设计：
- 一次 AI 调用被看作一次函数调用：上下文对象数组是入参，Codex CLI 是执行器，流式回复是返回值，hook 事件是旁路观察日志。
- Web 页面是上下文编辑器，负责收集、裁剪、排序和展示上下文。会话从叶子节点多方式发起。

## 项目结构
```txt
extends-codex/
├─ bin/
│  └─ extends-codex.js                         # CLI 包装入口
│     ├─ extends-codex dev                     # watch 模式启动 Hono 服务
│     ├─ extends-codex start                   # 普通模式启动 Hono 服务
│     ├─ extends-codex stop                    # 停止当前项目的 extends-codex 进程
│     └─ extends-codex restart                 # 先停止旧进程，再以 watch 模式重启
├─ honoapp/
│  ├─ src/
│  │  ├─ index.ts                          # 服务启动入口
│  │  │  └─ runtime.init(routers)          # 启动 Hono，并在启动后物化 .codex 模板
│  │  ├─ runtime.ts                        # 本地运行时边界
│  │  │  ├─ init(routers)                  # 选择局域网地址、递增可用端口并启动服务
│  │  │  ├─ ORIGIN                         # 暴露页面和 API 访问地址
│  │  │  ├─ HOOK_USER_COMMAND              # 生成 Codex 用户输入 hook 命令
│  │  │  └─ HOOK_ASSISTANT_COMMAND         # 生成 Codex 助手回复 hook 命令
│  │  ├─ routers.ts                        # 服务端路由汇总
│  │  │  ├─ /chat                          # 挂载聊天与模型代理接口
│  │  │  ├─ /tpl                           # 挂载 Codex 模板管理接口
│  │  │  ├─ /sse 与 /ssepush               # 挂载 hook 消息推送和页面订阅接口
│  │  │  ├─ /email                         # 挂载邮件采集接口
│  │  │  ├─ /file                          # 挂载文件树与代码关系接口
│  │  │  └─ reactapp                       # 托管前端 Vite 应用
│  │  ├─ store.ts                          # 服务端 zustand 仓库组合
│  │  │  ├─ createChatStore                # 提供聊天配置、模型调用和 Codex CLI 代理能力
│  │  │  └─ createTplStore                 # 提供 .codex 模板读写和物化能力
│  │  ├─ chat/
│  │  │  ├─ index.ts                       # /chat Hono API
│  │  │  │  ├─ GET/POST /chat/state        # 读取或保存聊天配置
│  │  │  │  ├─ GET/POST /chat/llm/openai   # 读取 OpenAI 兼容配置并发起流式对话
│  │  │  │  ├─ POST /chat/llm/openai/test  # 用指定 baseURL/model 测试 OpenAI 兼容模型
│  │  │  │  ├─ GET/POST /chat/llm/anthropic # 读取 Anthropic 配置并发起对话
│  │  │  │  ├─ POST /chat/llm/anthropic/test # 用指定 baseURL/model 测试 Anthropic 模型
│  │  │  │  └─ GET/POST /chat/agent/codexcli # 读取 Codex CLI 配置并发起代理任务
│  │  │  └─ store.ts                       # chatActions 业务能力
│  │  │     ├─ llm.openai.defChat/test     # 提供 OpenAI 兼容流式调用
│  │  │     ├─ llm.anthropic.defChat/test  # 提供 Anthropic 消息调用
│  │  │     └─ agent.codexcli.defChat      # 提供 Codex SDK 线程执行能力
│  │  ├─ tpl/
│  │  │  ├─ index.ts                       # /tpl Hono API
│  │  │  │  ├─ GET/POST /tpl/source        # 读取或保存 source.ts 中的模板源码
│  │  │  │  ├─ PUT/DELETE /tpl/agentsMd    # 写入或删除 .codex/AGENTS.md
│  │  │  │  ├─ GET/PUT/DELETE /tpl/configToml # 读取、写入或删除 .codex/config.toml
│  │  │  │  └─ PUT/DELETE /tpl/skills/:dir # 写入或删除 .codex/skills/:dir/SKILL.md
│  │  │  ├─ store.ts                       # tplActions 模板能力
│  │  │  │  ├─ sourceRead/sourceChange     # 提供模板源码读取、解析和保存
│  │  │  │  ├─ codexTplMaterialize         # 根据模板生成 .codex 目标文件
│  │  │  │  └─ agentsMd/configToml/skill   # 提供目标文件写入和删除能力
│  │  │  └─ source.ts                      # AGENTS、config.toml 和 skills 的模板源
│  │  ├─ sse/
│  │  │  ├─ index.ts                       # SSE 推送 API
│  │  │  │  ├─ GET /sse/events             # 提供页面订阅的事件流
│  │  │  │  ├─ POST /ssepush               # 接收 hook 或页面推送并广播
│  │  │  │  └─ sseSend(message)            # 向所有 SSE 连接广播消息
│  │  │  └─ hookReceive.ts                 # Codex hook 命令入口
│  │  │     └─ hook user|assistant         # 消费 Codex hook stdin，并转发到 /ssepush
│  │  ├─ file/
│  │  │  └─ index.ts                       # /file Hono API
│  │  │     └─ GET /file?path=...          # 提供目录、文件符号和调用关系树节点
│  │  └─ email/
│  │     └─ index.ts                       # /email Hono API
│  │        ├─ GET /email/accounts         # 提供可采集邮箱账号列表
│  │        └─ POST /email/collect         # 连接 IMAP 并返回邮件正文和附件元信息
│  └─ scrpits/
│     └─ vscode.ts                         # VS Code 扩展入口
├─ preloads/
│  └─ webcodex/
│     └─ src/doubaoAsk.ts                  # 预加载侧豆包提问脚本
├─ reactapp/
│  ├─ src/
│  │  ├─ App.tsx                           # 前端路由入口
│  │  │  ├─ /file                          # 文件树和代码关系页面
│  │  │  ├─ /sse                           # 上下文节点树和 hook 消息页面
│  │  │  ├─ /chat                          # 模型配置和对话页面
│  │  │  ├─ /tpl                           # Codex 模板编辑和预览页面
│  │  │  └─ /email                         # 邮件采集页面
│  │  ├─ store.ts                          # 前端持久化仓库组合
│  │  │  ├─ createFile                     # 消费 /file，提供文件树加载状态
│  │  │  ├─ createSse                      # 消费 /chat 和 /sse，提供节点树编辑和 AI 对话状态
│  │  │  └─ createTpl                      # 消费 /tpl，提供模板编辑、保存和目标文件发布状态
│  │  ├─ file/
│  │  │  ├─ index.tsx                      # 文件树页面
│  │  │  └─ store.ts                       # fileActions
│  │  │     ├─ treeOpen                    # 消费 GET /file，打开项目根节点
│  │  │     └─ nodeLoad                    # 消费 GET /file?path=...，加载目录/符号/调用关系子节点
│  │  ├─ sse/
│  │  │  ├─ index.tsx                      # SSE 工作台页面
│  │  │  └─ store.ts                       # sseActions
│  │  │     ├─ node.*                      # 提供上下文节点增删改、移动和选中能力
│  │  │     ├─ nodesLoop                   # 提供从目标节点回溯上下文链路的能力
│  │  │     ├─ chat                        # 消费 /chat，将节点链路交给模型或 Codex CLI
│  │  │     └─ hookPushReceive             # 消费 /sse/events，接收 Codex hook 推送
│  │  ├─ tpl/
│  │  │  ├─ index.tsx                      # Codex 模板编辑页面
│  │  │  └─ store.ts                       # tplActions
│  │  │     ├─ sourceLoad/sourceSave       # 消费 GET/POST /tpl/source
│  │  │     └─ targetPut/targetDelete      # 消费 /tpl 目标文件接口，发布或删除 .codex 文件
│  │  ├─ chat/                             # 聊天配置页面
│  │  └─ email/                            # 邮件采集页面
│  └─ vite.config.ts                       # 前端构建和开发服务配置
├─ package.json                            # 包入口和 extends-codex bin 声明
├─ pnpm-workspace.yaml                     # 工作区包声明
└─ tsconfig.json                           # 根 TypeScript 工程引用
```
