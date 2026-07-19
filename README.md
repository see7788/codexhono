# extends-codex

extends-codex 是运行在 Codex CLI 旁边的本地上下文与配置工作台。它通过 Codex hooks 捕获用户输入和助手回复，由 Hono 服务将事件流推送到 React 页面；页面可以整理上下文节点、查看 TypeScript 文件与调用关系、调用 Codex CLI 或兼容模型，并维护项目的 `.codex/AGENTS.md`、`config.toml` 和 skills。启动时还会幂等同步 PC 用户级 AGENTS、MCP、全局 agents 与 skills，适合检查、裁剪、重放 Codex 上下文，或集中维护 Codex 配置的场景。

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
│       ├── index.ts                      # 入口，只组合统一 Codex 输出、服务启动和项目模板物化
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
│       │   ├── globalsource/             # 用户级 source 与全局/项目统一输出边界
│       │   │   ├── source.ts             # 唯一用户级全局 source
│       │   │   │   ├── nodes             # 全局与项目 source 共同使用的静态节点
│       │   │   │   ├── agentsMd/skills   # 全局规则与 skills
│       │   │   │   ├── configToml        # 全局 MCP
│       │   │   │   └── agents/legacy     # 全局 agents 与安全迁移定义
│       │   │   ├── schema.ts             # 全局和项目共同使用的 source 验证契约
│       │   │   │   └── sourceSchema      # 区分 global/project 并验证对应配置
│       │   │   └── output.ts             # 唯一 Codex 文件输出类及私有渲染
│       │   │       ├── CodexOutput({ path, source }) # 绑定目标目录与已验证 source
│       │   │       └── filesStatus()/materialize() # 查询状态或物化指定目标
│       │   ├── source.ts                 # 只定义项目级 AGENTS、hooks 与 skills source
│       │   ├── store.ts                  # 解析页面 source，并调用 CodexOutput 预览或物化
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
├── honoapp-vscode-plugin/                  # 独立 VS Code 插件子项目
│   ├── src/index.ts                        # 启动服务，并提供左侧原生服务状态视图
│   ├── src/media/icon.png                   # 由 icon.ico 生成的插件图标
│   ├── src/media/icon-activity.png          # 由同一图案生成的 Activity Bar 单色图标
│   ├── dist/app/                             # 页面构建后的静态产物
│   ├── tsconfig.json                       # 插件编译配置，输出 dist/index.js
│   └── package.json                        # 插件身份、main、视图声明与 build 命令
├── package.json                          # extends-codex bin 与根开发命令
└── pnpm-workspace.yaml                   # 本仓库及 extends-* 复用包工作区
```

`package.json` 的 `bin` 字段与 `bin/<command>.js|mjs` wrapper 不属于本仓库手写源码，两者由外部 `create-todo-cli nodeScript/nodePackageBinInit` 同步生成。该命令会交互确认命令名和真实源码入口，同时更新 `bin`、`files`、`tsx` 运行依赖，生成负责 `dev/start/stop/restart` 的 wrapper，并执行 `pnpm install` 与 `pnpm link`。检查发布入口时必须把这两个生成结果作为同一组产物核对，不能把 `files` 中的 `bin/` 当成 npm `bin` 声明，也不能仅凭生成产物暂时不存在判定源码入口丢失。

## 运行链路

1. `extends-codex dev` 通过 tsx watch 启动 `honoapp/src/index.ts`。
2. 入口先以用户级路径和 global source 创建 `CodexOutput`，增量同步用户级 AGENTS、MCP、agents 与 skills；Hono 启动后，项目 store 再以工作区 `.codex` 路径和 project source 创建同一个 `CodexOutput`，物化项目 AGENTS、hooks 与 skills。页面模板状态持久化在 `.zustand`。
3. Codex 的 `UserPromptSubmit` 和 `Stop` hooks 将消息发送到 `/ssepush`，页面通过 `/sse/events` 实时接收。
4. 页面整理出的上下文可以发送给已配置模型，或作为独立任务交给 Codex CLI，并流式显示返回内容。

## 开发

仓库使用 pnpm workspace，并依赖同级的 `extends-hono`、`extends-vite`、`extends-ssh`、`extends-zustand` 和 `extends-antd` 工作区；其中 `extends-ssh` 是 `extends-vite` 的 `workspace:*` 依赖，必须加入同一个根 workspace 才能完成安装。安装依赖后可运行：

```bash
pnpm install
pnpm dev
pnpm docs:check
pnpm typecheck
pnpm --dir honoapp-vscode-plugin run build
```

本仓库的 `pnpm dev` 通过 tsx watch 直接运行 `honoapp/src/index.ts`；上面的 `pnpm dlx github:see7788/extends-codex dev` 是其他项目使用已发布 CLI 的方式，两者不是同一个入口。
`pnpm --dir honoapp-vscode-plugin run build` 编译 `honoapp-vscode-plugin/src/index.ts` 为插件入口 `honoapp-vscode-plugin/dist/index.js`；插件不内嵌 `honoapp`，而是在当前工作区启动 `extends-codex dev`，由 Vite 提供最新页面源码并由 Hono 提供模板接口。调试时打开 `honoapp-vscode-plugin/` 文件夹并按 F5，`.vscode/launch.json` 会启动 Extension Development Host；普通新开 VS Code 窗口不会加载该本地扩展。`pnpm docs:check` 会在 package、进程/路由入口或模板源变化时要求 README 或 `docs/` 同步变化，作为语义 checklist 之外的机械门禁。

`.codex` 是运行时生成产物；PC 用户级 AGENTS、MCP、agents 与 skills 的长期定义只维护在 `honoapp/src/tpl/globalsource/source.ts` 的同一个 source 对象，项目级 `honoapp/src/tpl/source.ts` 只维护项目 AGENTS、hooks 与 skills，并直接复用全局 `nodes` 后补充自己的 hook 节点。两类 source 由同一个 `sourceSchema` 验证，并由同一个 `CodexOutput({ path, source })` 输出；用户级采用增量合并并通过 `.codex/.extends-codex-output.json` 保存所有权状态，项目级直接物化目标文件。AGENTS、skills、agents 和 config 正文不再写入 extends-codex 所有权标记，旧标记只在首次迁移时识别和移除。全局 AGENTS 承担总纲、任务分流、三个 agent 的最小兜底定义和模板改进分流，详细约束由对应 skill 维护；`worker` 负责实际处理和修改，`indexer` 负责检查实现和发现问题，`tokener` 负责运行验证和确认结果，没有真实创建子 agent 时统一记为 `worker`。
模板只在存在多个真实消费点，或定义自身维护独立状态、生命周期、不变量时允许抽象；其他单点定义必须内联到真实消费处，移动可见性、文件或目录不视为复用。
无参数 class 若在创建时同步完成唯一动作，且实例不维护后续状态或生命周期，必须把动作放进构造函数并直接 `new ClassName()`；禁止再暴露只被立即调用一次的 `sync`、`init`、`run` 或 `start`。
项目自定义函数、方法、构造器和 store action 出现两个及以上业务形参时统一使用一个对象形参，并优先内联其类型；框架和第三方固定回调签名不受此约束。
`extends-*` 被视为用户个人长期维护的独立工具库。当前项目调用不满足其既有公开能力时，模板要求返回 `Library Boundary Decision Required` 并停止写入；未经用户选择，不得在工具库或消费项目新增文件、接口、适配层，不得修改接口参数或业务逻辑，只能先提供“新增能力”与“修改既有能力”的兼容性和影响分析供用户决策。
`pnpm-workspace.yaml` 启用 `injectWorkspacePackages`，使跨目录工作区库在当前消费项目的依赖上下文中解析 Hono、Zustand、Immer 等框架，避免源码软链接复用其他工作区 `node_modules` 后产生同名类型不兼容。
模板处理公共库冲突时先在消费项目根使用 `pnpm why/list -r` 区分直接依赖、传递依赖和跨 API 的共享框架：跨边界类型由 peerDependencies 与消费项目版本归一，内部依赖允许隔离多版本，传递依赖优先升级上游并只在兼容时 overrides。多个根 workspace 共同消费相邻 `extends-*` 时检查 injection；常规声明一致仍报错才检查实际解析路径，并通过另一消费项目重新 install 后回到原项目 typecheck 的方式验证不会复发。
真实外部链路按调用、生产者状态、原始响应、本地解析和消费者显示逐层取证；第三方页面结构变化后重新获取 DOM，owner 已有关系不接受消费者恢复参数覆盖。长异步任务使用符合服务时长的轮询与统一限流退避，同一路径连续两次失败后停止试探并回到最早未证实边界。临时诊断必须带退出条件并在事实确认后删除。个人维护项目默认授予 AI 当前分支 Git 高权限：禁止创建或切换分支，但任务需要的提交、历史整理、同步、push 和 tag 无需再次确认；长任务在真实验证通过且可独立回退的里程碑自动提交并推送当前分支和有价值的 tag。

---

## 待补充 Codex 要求

本节记录本项目磨合出的全局协作要求；`todoapp-vscode-plugin` 完成并具备工作流接口后，再统一复核、写入全局模板并物化。

- 默认不新增测试性质文件，例如 `*.test.*`、`*.spec.*` 与 `__tests__/`；验证使用真实构建、真实接口、真实页面或老板明确的运行入口。
- 类型建模优先使用单一完整领域类型，并以 TypeScript 的 `Pick`、`Omit`、泛型约束和继承/组合派生创建、更新或局部操作类型；禁止为同一字段集合手工重复声明近似类型、重复 action 或重复字段更新逻辑。
- 参数与输入类型只在存在真实边界价值时抽象：单一调用点、同文件且没有独立业务语义的参数组合，不新建 `XxxInput`、对象包裹或 helper，优先保持直接参数；仅在跨层/跨包、多个调用者、可选字段组合或稳定请求契约时，才使用对象参数及由 `Pick`/`Omit` 派生的输入类型。
- 工作流统一使用九种状态：待确认、待办、未派工、运行中、已反馈、已中断、已完成、阻塞、已取消。待办表示老板目标已确认但尚未拆成可执行派工；未派工表示已建立具体执行叶子但尚无真实实例；已反馈表示工作者已返回、等待 parent 吸收结果并续派或完成；已中断表示实例被打断/退出但可重派；阻塞表示外部条件或老板确认缺失；已完成与已取消是终态。工作者完成“识别/报告阻塞”时可标已反馈，parent 必须在其下新增建议或待老板确认节点；原目标保持阻塞，直到老板确认新的待办、取消或替代节点。
- 领域数字与展示文字的映射放在对应对象的 `store.ts` 默认导出切片内：持久化数据根不存映射，`${object}Actions` 根保存其非持久化映射数据与方法；TSX 只从仓库消费映射结果，不导入独立常量或为单一路由定义专用映射组件。本轮以文字展示替代图标；后续如需颜色或图标，也只能作为同一映射的附加展示字段，不能替代可读文字。
- Zustand 对象目录的主仓库结构固定为同名持久化数据根与同名复数 `Actions` 根：例如 `todotree` 只保存可持久化业务数据，`todotreeActions` 承担该对象的方法及不持久化运行态；不得把 action 或临时状态混入数据根，也不得拆成无对象归属的平铺 action。
- 多工作者不构成固定流水线：边界清晰且连续的完整功能切片优先委派给一个 worker 端到端实现并验证；仅对独立 ownership 并行，indexer 只用于首次陌生范式或必要调查，tokener 只用于关键风险/阻塞，logger 只监督真实运行任务。
- React 项目必须采用 React Router，并提供一个名为 `routers` 的路由定义文件；每个实际路由必须消费对应 TSX 页面文件，不能只在根 `App.tsx` 内堆叠页面内容而没有可观察路由入口。
- 不得把 VS Code Timeline/Local History 当作跨路径恢复机制：既有重要源码、模板和规则文件默认禁止移动、重命名或删除；确需调整路径时，必须先取得老板明确授权，并在移动前创建可验证的 Git 检查点，记录旧路径、新路径与提交标识。禁止在未保存当前脏文件完整内容时执行 `git restore`、checkout 或整文件覆盖；恢复必须先展示可信候选版本及差异，老板确认后才能写回。
- 中文模板、规则、Markdown 与源码必须保持严格 UTF-8：读取使用 Node `fs.readFileSync(path, "utf8")` 并做 fatal UTF-8、BOM、`U+FFFD`、哈希、行数和语义锚点检查；禁止把 PowerShell `Get-Content`、终端输出、乱码文本、截图/OCR 或未知代码页字符串接入写回链路。只允许基于可信原文件做最小 `apply_patch`；出现乱码、异常大 diff、语法连锁报错或语义锚点缺失时立即停止，先保全当前字节与恢复来源，禁止自动转码、Git 覆盖或继续试探性修改。
- 仓库文本统一使用 UTF-8 无 BOM 与 LF；根目录必须通过 `.editorconfig`、`.gitattributes` 和 VS Code 工作区设置固定打开、保存与 Git 行尾格式，关闭自动猜测编码。每个独立可验收交付物写后验证通过必须立即创建只包含本任务 ownership 文件的 Git 提交，再开始下一项无关任务、移动文件或物化；禁止 `git add .`、`git add -A` 和夹带用户改动，提交失败时不得称为已保存或完成。

- parent 只做领导工作：理解老板对话、维护任务树内容、派工、接收反馈、重排和汇报；普通文档、源码、配置、测试、构建与运行实现都必须由具体 worker 完成。
- 默认任务树按真实依赖显示 `worker` 或 `indexer` 的实施；必要时追加 `tokener` 审查；parent 收到审查反馈后先追加反馈节点，再追加新的 worker 修复节点。树上不显示 logger。
- logger 在后台只依据真实派工、写入、运行状态、阻塞和未完成事实监督；只能在指定位置、指定格式标记状态，发现 parent 越界或 logger 自身越权时报告并停止，不做业务、审查、派工或无事实提醒。
- tokener 强制只读，只返回证据、根因和建议；它没有实施、建任务或派工权限。
- `todoapp-vscode-plugin` 完成后，工作流对象接口成为 parent 与 logger 的共同约束入口：parent 通过接口派工/接收反馈，logger 通过只读监督与状态接口操作；浏览器 Zustand persist 只保存项目路径分区的 UI 状态，不取代工作流事实。

## 可审计的工作流 [?] 待确认、[ ] 待办、[>] 未派工、[~] 运行中、[<] 已反馈、[|] 已中断、[x] 已完成、[!] 阻塞、[-] 已取消

- [x] worker 解决：全局 skill 产物改为以 YAML frontmatter 开头；隔离生成的 8 个 skill 均通过 `quick_validate.py`，重复同步哈希一致。
- [x] worker 解决：收敛只读任务、项目文档写入和 Git 外部写入授权边界；隔离生成的 checklist skill 已包含新规则并通过格式校验。
- [x] worker 解决：统一 `任务台账`、`待办事项`、`todolist`、`todoclick` 四个强制触发词；隔离产物和真实用户级 `checklist-styleskill` 均已验证包含文档末尾规则。
- [x] worker 解决：任务台账已改为无编号的一行一项，支持当前文件行号沟通并把删除整行识别为取消任务；`worker`、`indexer`、`tokener` 已强定义为真实 agent 名称，隔离 skill 校验、定向类型检查、文档门禁和真实用户级同步均通过。
- [x] worker 验证：原全局模板定向类型检查、`docs:check`、真实 checklist skill 格式校验和重复同步均通过；完整 `pnpm typecheck` 仍只有 `honoapp/src/chat/index.ts` 与 `honoapp/src/store.ts` 的既有 Zustand 类型错误，与模板改动无关。
- [x] worker 解决：README 与全局模板已统一台账强规则和三个 agent 角色；隔离用户目录可完整生成，真实用户级 AGENTS 已出现兜底定义，`worker.toml`、`indexer.toml`、`tokener.toml` 已同步，旧 `light_worker.toml`、`reviewer_teacher.toml` 已按模板所有权安全替换。
- [x] worker 解决：`tpl-global.ts` 与 `tpl/render.ts` 已收敛为 `honoapp/src/tpl/globalsource/` 下的 `source.ts`、`schema.ts`、`render.ts`、`output.ts`；用户级全局定义只有一个 source 对象，项目 `source.ts` 已删除自身 validator 并引入共享契约，未使用的旧 `tpl/ts.ts` 重复类型已删除。
- [x] worker 解决：用户级启动同步与项目级 store 已共同使用 `CodexOutput({ path, source })`，config/AGENTS/skills/agents 只保留一套渲染和输出实现；真实用户目录已改由隐藏状态文件维护所有权，AI 可读正文与 config 中的旧 MCP、skill、agent 边界标记均已移除。
- [x] worker 验证：Codegraph 已确认 `CodexOutput` 和 `materialize()` 各有启动入口与项目 store 两个真实消费者；定向类型检查、文档门禁、8 个真实全局 skill 校验、隔离用户/项目输出、Hono `/tpl/source` 零 dirty、真实迁移和重复物化哈希稳定均通过，完整 `pnpm typecheck` 仍只有既有 Zustand 依赖来源错误。
- [x] worker 解决：README 已按 globalsource 目录、共享 schema、统一输出类、单一 source 归属和无正文标记的真实生成链路完成对齐。
- [x] worker 解决：globalsource/source 已改为普通导出的共享 `nodes`，项目 source 直接复用后仅补两个 hook 节点；全局 scope-style 已禁止为引用静态常量使用 IIFE、闭包参数、factory 或回调包裹 source，Codegraph 调用关系、定向类型检查、文档门禁、真实全局 skill 同步和 Hono 项目输出零 dirty 均通过。
- [x] worker 解决：清理本轮测试启动的 3000–3005 服务与隔离开发宿主；验证：精确核对 PID 后停止，3000–3010 当前无监听。
- [x] worker 解决：修复 `vscode/src/index.ts` 的 TypeScript 错误，并把左侧 `extends-codex` 图标的 Webview View 对齐为直接显示服务页面；验证：`pnpm --dir vscode exec tsc --noEmit` 通过，源码无 `spawn`、无树项二次点击。
- [x] worker 验证：构建 `honoapp` 与 `vscode` 两个 workspace 包，验证包解析、服务启动/停止和 HTTP 页面响应；`pnpm build:vscode`、`pnpm --dir vscode exec tsc --noEmit` 与直接包 import 均通过，服务 HTTP 200 后已执行 `stop()`，并复查清理 3000–3010 测试监听。
- [x] worker 解决：`vscode/` 已具备正式安装链路，`@vscode/vsce`、`package` 命令和独立打包入口已接通；`pnpm --dir vscode run package` 生成 `extends-codex.vsix`。
- [x] worker 验证：VSIX 仅含扩展清单、`dist/index.js` 与图标；TypeScript 检查、`vsce ls --no-dependencies`、包内入口依赖审计和正式打包均通过。
- [x] worker 解决：`extendsCodex.service` 的生命周期已绑定到抽屉可见性；正式安装版在打开时显示端口 `:49423`，切走抽屉后 HTTP 连接失败，再打开后服务重启为 `:49530`。
- [x] worker 验证：正式安装 `extends-codex.vsix` 后，`code --list-extensions --show-versions` 返回 `see7788.extends-codex-vscode@0.2.0`。
- [x] worker 观察：普通 VS Code 已打开 `extends-electron-vite`，活动栏 `extends-codex` 已创建 Webview；DevTools 当前页为 `http://127.0.0.1:49530/#/file`，内嵌页面可见。
- [x] worker 处理：插件说明和台账已更新；正式 VSIX 内容审计、构建、安装、HTTP 资源与实际窗口观察一致。
- [x] worker 接管：`vscode/` 产出的 VSIX 已在普通 VS Code 中正式安装并验证启动、隐藏和重启，任务退出条件已满足。
- [x] worker 解决：移除未使用的 `honoapp` workspace 运行依赖，插件归一为零运行依赖并使用 `vsce package --no-dependencies`；锁文件、VSIX 打包和包内容审计均通过。
- [x] worker 观察：正式安装版的 Webview 白色容器、端口标题和静态服务均已观察；首页与主 JS 为 HTTP 200，切换抽屉后端口释放、再次打开后新端口可用。
- [x] worker 解决：仅在 `vscode/src/index.ts` 的 Webview 容器入口消除多余滚动条；`body` 禁止溢出、iframe 块级渲染并关闭内嵌滚动，重新打包覆盖安装后，普通 VS Code 实际窗口已观察到白色页面无横、纵滚动条，未改动 `honoapp`。
- [x] worker 解决：以 `vscode/src/media/icon.ico` 为唯一来源生成插件 PNG 和透明单色的 Activity Bar PNG；正式 VSIX 已重新打包并覆盖安装，普通 VS Code 实际窗口已观察到 Activity Bar 的闪电图案正常显示。
- [x] worker 解决：`vscode/media/` 的资源已完成归位，当前统一图标位于 `vscode/src/media/`，无清单引用的旧 `extends-codex.png` 与 `extends-codex.svg` 已清理；页面产物随后按构建产物边界移至 `vscode/dist/app/`。
- [x] worker 解决：`vscode/src/media/app/` 的页面构建产物已移入 `vscode/dist/app/`，`src/media/` 只保留图标；构建不会清空页面产物，VSIX 内容与服务路径已同步，正式安装版服务页 HTTP 200。
- [~] worker（当前主 Codex / GPT-5）分析：现有扩展把业务页面托管与服务开关混在同一入口，导致图标状态不能准确表达服务生命周期；需要以 VS Code 原生状态呈现服务生命周期。worker（当前主 Codex / GPT-5）方案：入口仅负责启动、停止和状态映射，移除抽屉页面职责，使用原生加载态与运行徽标。worker（当前主 Codex / GPT-5）实施：恢复 Activity Bar 插件 icon，并修复状态栏开关初始停止状态未渲染文本的问题，使其始终可见且可直接操作。验收：普通 VS Code 中可观察初始灰色、加载、运行彩色和停止灰色的图标/状态栏变化，且浏览器与服务生命周期一致；插件不再托管业务页面。
- [x] worker 解决：全局模板已按用户确认的对话与台账习惯更新：已完成项保持不动，未完成项按最新纠正改写；关键歧义主动询问；台账按可验收交付物记录，并仅在真实结果、阻塞或需要确认时同步。验证：`node scripts/docs-check.mjs` 与 `pnpm --dir honoapp exec tsc --noEmit` 通过。
- [x] worker 解决：已根据本话题历史补全全局模板的范围锁、用户纠正、用户指定交付形式、宿主能力取证、可见交付验收及 Agent 测试资源清理规则；已完成历史台账项保持不动。验证：`node scripts/docs-check.mjs` 与 `pnpm --dir honoapp exec tsc --noEmit` 通过。
- [x] worker 解决：已按用户授权将规则写入 `tpl/global/source.ts` 作为首次初始化默认值，并通过现有 `/tpl/global/source` 与 `/tpl/global/materialize` 写入、发布当前全局模板数据；验证持久化数据与生成的用户级 AGENTS、codebase/checklist skills 一致，后续日常改进只改接口数据。`config.toml` 的既有 dirty 状态保留未覆盖。
- [x] worker 解决：全局规则已强制 pnpm 包名与 `workspace:*` 依赖/导入，要求每个多阶段任务在任何诊断或实现前立即写入进行中台账项，并禁止新增台账时清理无关未完成项；默认源码与当前全局数据已同步更新、物化并验证。验证：Hono 数据与用户级生成文档一致，`node scripts/docs-check.mjs`、`pnpm --dir honoapp exec tsc --noEmit` 通过；既有 `config.toml` dirty 未覆盖。
- [x] worker 解决：已统一台账的待确认术语、状态同步与未完成项改写规则，并移除当前全局数据中的旧规则重复；面向所有项目的“模板改进分流”已改为不暴露实现路径的“模板服务”启动与 API 契约，并已同步物化验证。验证：Hono 持久化数据与生成的用户级 AGENTS/checklist skill 一致，`node scripts/docs-check.mjs`、`pnpm --dir honoapp exec tsc --noEmit` 通过；既有 `config.toml` dirty 未覆盖。
- [x] worker 解决：仅修复模板服务 Hono 接口；`/tpl` 与 `/tpl/` 均 302 到既有 `/#/tpl`，项目/全局 source、status、materialize 均经真实 HTTP 验证为 200，非法 source 为 JSON 400 且不污染后续读取；热更新等待原端口释放后继续使用 3000。未修改任何前端文件；`pnpm --dir honoapp exec tsc --noEmit`、`node scripts/docs-check.mjs` 与 `git diff --check` 通过。
- [x] worker 解决：VS Code 插件改为在当前工作区执行 `extends-codex dev`，不再经 production 静态产物启动；根因是旧 `reactapp/dist` 仍请求已删除的 `/tpl/agentsMd` 等接口，而非 VSIX 内嵌 `honoapp` 或当前 Hono 路由错误。已重建 `reactapp/dist`，其模板 store 仅保留 `PUT /tpl/source` 与 `POST /tpl/materialize`；VSIX 已重新打包并覆盖安装，插件入口、类型检查、文档门禁和 diff 检查均通过。已打开的 VS Code 窗口需重新加载后生效。
- [x] worker 解决：按用户确认的插件边界更新当前全局模板数据：AI 只检查 VS Code 插件是否存在并提示启动；插件启动服务后自动物化项目 AGENTS.md，AI 不猜端口、不直接改 `.codex` 产物或模板内部状态。通过 `/tpl/global/source` 更新并 `/tpl/global/materialize` 物化，持久化数据和生成的用户级 AGENTS.md 均已验证；未修改模板服务源码，类型检查、文档门禁与 diff 检查通过。
- [x] worker（当前主 Codex / GPT-5）分析：现有规则只要求目标、范围和完成依据，导致台账既未显示实际处理模型，也无法追溯“发现问题—选择方案—实施—验证”的循环过程；需要以真实参与者记录过程。worker（当前主 Codex / GPT-5）方案：新建或纠正未完成事项时，同一行按时间顺序记录实际角色、运行时可得模型标识、问题/证据、解决方式、实施结果和验收；既有 `[x]` 历史不改。worker（当前主 Codex / GPT-5）实施：已更新当前全局 checklist 模板数据并物化。验收：`GET /tpl/global/source` 与 `C:/Users/diyya/.codex/skills/checklist-styleskill/SKILL.md` 均含该规则，`node scripts/docs-check.mjs` 和 `git diff --check -- README.md` 通过。
- [x] worker（当前主 Codex / GPT-5）分析：现有正式标题仍为“任务台账”，不能表达记录真实参与者、证据、方案、实施与验证的可审计语义；需要统一全局名称但保留旧称作触发别名。worker（当前主 Codex / GPT-5）方案：将文档标题与全局 checklist 规范的正式名称改为“可审计的工作流”，把任务台账、待办事项、todolist 等定义为同义触发词。worker（当前主 Codex / GPT-5）实施：已更新 README 标题、服务端持久化模板数据并物化。验收：`GET /tpl/global/source` 和用户级 `checklist-styleskill/SKILL.md` 均确认正式名称、固定标题与别名规则，`node scripts/docs-check.mjs` 与 `git diff --check -- README.md` 通过。
- [x] worker（当前主 Codex / GPT-5）分析：项目级 `.codex/agents/` 不存在，用户级 `worker.toml`、`indexer.toml`、`tokener.toml` 均存在；旧规则允许 worker 兼任，不能满足三角色实际参与要求。indexer（模型标识未提供）审查：应将项目级优先、三角色必备与职责分派写为全局总纲首项，并替换兼任规则。worker（当前主 Codex / GPT-5）实施：已通过 `/tpl/global/source` 写入并 `/tpl/global/materialize` 物化。tokener_probe（运行时模型标识未提供）验证：回读确认服务端总纲首项要求项目级优先检查三角色、缺一停止，用户级 AGENTS 已物化同一首项；原 B-001 阻塞解除。
- [x] worker（当前主 Codex / GPT-5）分析：官方自定义 agent schema、物化文件与本机模型目录交叉确认，`worker`、`indexer`、`tokener` 均包含必填 `name`、`description`、`developer_instructions`，配置模型 `gpt-5.6-terra`、`gpt-5.6-luna`、`gpt-5.6-sol` 均在本机目录；`codex doctor` 为 0 fail，仅 Responses WebSocket 握手超时并可回退 HTTPS。根因是此前把 10 秒等待窗口超时误判为 agent 不可用，以 `fork_turns: all` 复制超长历史后又主动中断。worker（当前主 Codex / GPT-5）方案与实施：保留三个 TOML，委派改用最小上下文和边界清晰提示，`list_agents` 仍为 `running` 时持续等待；该规则已通过 `/tpl/global/source` 更新并物化。indexer_probe、worker_probe、tokener_probe（运行时模型标识均未提供）验证：三个最小探针分别真实返回 `indexer available`、`worker available`、`tokener available`；tokener 进一步确认服务端、用户级 AGENTS 与 checklist 规则逐字一致、UTF-8 有效，`node scripts/docs-check.mjs` 通过。
- [x] indexer（运行时模型标识未提供）分析：已确认项目页仅有 `reactapp/src/tpl/index.tsx`、`store.ts` 与 `/#/tpl`；global 后端已提供 `/tpl/global/source`、`/status`、`/materialize` 并由服务端写入用户级 `.codex`。global 返回契约与项目 lifecycle 相似但 source 结构不同，不能复用项目 `Tpl` 预览；`reactapp/src/store.ts` 的 `partialize` 会持久化新增普通 slice，因此 global 必须有独立、非 persist 的页面 store。验收：源码、路由和接口契约均已核对。
- [x] worker_tpl_global（运行时模型标识未提供）处理：新增 `reactapp/src/tpl/global/index.tsx`、独立非持久化 `store.ts` 和 `/#/tpl/global` 路由，通过 Hono `hc<typeof globalTplRouter>` 接入 `/tpl/global/source`、`/status`、`/materialize`，项目 tpl 悬浮按钮可切换；页面只把 `agents` 作为生效工作者，`legacy` 明确为迁移数据。验收：`pnpm --dir reactapp exec vite build` 通过；完整 TypeScript 检查仍有既有 Hono 跨包类型解析错误，留待 tokener 区分验证。
- [x] tokener_tpl_global（运行时模型标识未提供）验证：路由、独立非 persist store、Hono GET/PUT/POST、`agents`/`legacy` 边界、两侧完整 typecheck、Vite 构建及 3000 只读 HTTP 均通过。隔离 Edge 真实 DOM 从 `/#/tpl` 点击“切换到用户级全局模板”进入 `/#/tpl/global`，确认 global 标题与迁移说明后点击“切换到项目模板”返回；网络 `nonGet=[]`，未保存或物化，测试进程、9337 端口与 profile 已精确清理。
- [x] indexer（运行时模型标识未提供）分析：发现“独立验收一行”与“每条同时写三角色”互相冲突，导致已完成分析无法结项。worker（运行时模型标识未提供）处理：通过 `/tpl/global/source` 更新规则并物化，未开始的事项改为“待分派责任角色”，当前 tpl 分析、实施、验证已拆行。tokener（运行时模型标识未提供）验证：回读用户级 checklist 和 README 均符合，`node scripts/docs-check.mjs`、`git diff --check -- README.md` 通过。
- [x] indexer_global_cache（运行时模型标识未提供）分析：确认服务端 Zustand 持久源相对默认源码有三工作者强制规则、模板服务约定及最新可审计工作流等 9 类差异；13 个 ownership 目标均与持久源一致，`config.toml` 由 215-byte 用户配置与唯一 191-byte 模板 MCP 片段组成。验收：schema 均通过，已记录源码、source cache、output state、AGENTS 与 config 哈希，并限定不得删除 `.system`、整个 `.codex` 或用户 config 前缀。
- [x] worker_global_rebuild（运行时模型标识未提供）处理：已把服务端持久源的全部有效语义迁入 `honoapp/src/tpl/global/source.ts`；精确停止旧服务树并删除旧 AGENTS、8 个托管 skill、3 个 agent、source cache 与 output state，`config.toml` 仅移除模板片段且保留 215-byte 用户配置，`.system` 未动；新服务从默认源码重建缓存与 13 项产物。验收：API 均为 200，二次物化哈希稳定，schema、Hono TypeScript、文档门禁、diff 与严格 UTF-8 通过。
- [x] tokener_global_rebuild（运行时模型标识未提供）验证：默认源码与新 source cache 深语义差异为 0，默认 render、output state 与 13 项物化内容一致；215-byte 用户 config 前缀、唯一模板 MCP 片段、3 个 agent 及 `.system` 50 个文件完整。连续两次 materialize 后 65 个相关文件聚合哈希不变，GET/POST 均为 200，Hono TypeScript、文档门禁、diff 与严格 UTF-8 通过；`config.toml` 唯一 dirty 已证实是完整文件与托管片段直接比较造成的状态误报。
- [x] indexer_hono_exports（运行时模型标识未提供）分析：确认 `"./*": "./*/index.ts"` 可覆盖 7 条目录导入，但项目 tpl 的 `honoapp/src/tpl/source` 必须改走 `honoapp/src/tpl` 公共入口，并由生产者导出当前 `ProjectSource` 类型；还发现页面引用当前 schema 已删除的 MCP/agent 字段。验收：React 21 条错误中 8 条为 TS2307，pnpm why/list 确认 `workspace:*` 正常且无需修改 workspace、依赖、lockfile 或 tsconfig。
- [x] worker_hono_exports（运行时模型标识未提供）处理：`honoapp` 保留根导出并新增目录子路径导出，由 `honoapp/src/tpl` 公开 `ProjectSource as Tpl`；React tpl 改走包目录入口并清理失效预览字段，3 个 router factory 消费改用 `hc<ReturnType<typeof ...RouterCreate>>`，未使用断言或宽化。验收：Hono/React typecheck、Vite build、diff 与 UTF-8 均通过，8 条 Hono 包导入全部落到 6 个真实目录入口，未触碰既有 dirty lockfile。
- [x] tokener_hono_exports（运行时模型标识未提供）验证：Hono/React typecheck、Vite build、pnpm why/list 与 6 文件 diff/UTF-8 均通过；8 条 `honoapp/...` 导入命中 6 个真实目录入口，3 个 factory client 均使用 `ReturnType`，package 清单无 `file:`/`link:` 或跨包相对声明。3000 上 `/#/tpl`、`/#/tpl/global`、项目/global source/status 均为 200；B-TPL-001 已解除，未执行 PUT 或 materialize。
- [x] indexer_global_status（运行时模型标识未提供）分析：已定位 `/tpl/global/status` 将含用户前缀的完整 `config.toml` 与托管片段直接比较导致的 dirty 误报，并给出兼容 ownership、首次迁移和项目模板状态的最小算法；用户打断后未进入实施，`output.ts` 未修改。
- [ ] 待分派 worker 处理：修复 global merged 文件的 status 判断，使 AGENTS/config 只检查托管内容是否正确且保留用户内容，不改变项目模板物化和完整文件 ownership 行为。
- [ ] 待分派 tokener 验证：验证 global status 不再误报 `config.toml`、用户配置和 13 项产物哈希不变、重复物化幂等，并回归项目/global source/status/materialize 与 Hono 类型检查。
- [x] indexer_agent_redefine（运行时模型标识未提供）分析：用户确认以项目现有三份职能为准并采用 `indexer`、`worker`、`tokener` 的 `xxxer` 名称；核对 `GlobalSource`、schema、render/output、项目根 `agents/`、用户级物化文件及 AGENTS/checklist 重复派工规则，确定先改唯一默认源、取消固定 PC 不需要的 compatibility、再重建两级工作者的最小范围；分析结论已交接给 worker 实施。
- [x] worker_redefine（运行时模型标识未提供）处理：已在唯一全局 source 保留 `indexer`、`worker`、`tokener` 及其当前模型，分别承接原 light worker、主 worker、reviewer/teacher 职能；移除 `legacy` 与固定三角色流水线重复要求，保留每项工作先确认三角色全局定义可用并按职责选择的规则。schema/output 已移除 `source.legacy` 强制与迁移访问；项目根旧 worker 定义已删除，用户级三份不直接改写，待通过既有全局 materialize 接口物化。
- [x] worker_redefine（运行时模型标识未提供）纠正：唯一全局 source 现将 `indexer` 映射为原 light worker 的轻量调查、检查和局部修改职责，`worker` 映射为原主力执行职责，`tokener` 映射为原 reviewer/teacher 的关键 review 与解除阻塞职责；模型保持 luna、terra、sol。
- [x] tokener_redefine（运行时模型标识未提供）验证：source/schema/render 断言确认 `indexer`=原 light worker、`worker`=原主力 worker、`tokener`=原 reviewer/teacher，模型为 luna/terra/sol；项目根 `agents/` 与 `.codex/agents/` 不存在，用户级仅有三份同名 TOML；通过 PUT `/tpl/global/source`、两次 POST `/tpl/global/materialize` 与 GET source/status 验证，14 个托管文件第二次物化前后字节、SHA-256、mtime 全不变，`legacy` 与固定三角色流水线均不存在。`pnpm --dir honoapp exec tsc --noEmit`、source/schema/render、`node scripts/docs-check.mjs`、`git diff --check` 通过；`pnpm docs:check` 因根 package 未声明该脚本不可用，`config.toml` dirty 为既有合并状态误报，另行台账项保留。
- [x] worker_mapping_fix（运行时模型标识未提供）处理：D-002 已确认按旧文件映射保留三份角色正文：`indexer=light_worker`、`worker=worker`、`tokener=reviewer_teacher`；全局总纲、Agents 兜底和 checklist 已改为按该映射选用角色，不构成固定流水线、不要求三者同时参与，`tokener` 默认不修改。验证：tokener 已独立完成 source schema/render、职责语义和项目级目录静态检查；global status/config 未完成台账项保持不动。
- [!] tokener_mapping_verify（运行时模型标识未提供）验证阻塞：已确认 VS Code 安装 `see7788.extends-codex-vscode`，但当前没有运行中的模板服务监听；按模板服务规则不猜端口、不代替插件启动，因此尚未执行最新 source 的 PUT、global materialize 和用户级 AGENTS/checklist 回读。源码角色映射、schema 与项目级工作者清理已完成，待用户通过插件启动服务后继续动态验证；不得将用户级旧产物误写为已同步。
- [x] parent（当前主 Codex / GPT-5）接收：新增低成本 `logger` 作为可审计工作流守门与记录角色；范围为全局 source、schema/render 兼容性与本项目台账，验收为 logger 仅维护全局通用的派工/中断/恢复规则且不修改业务。indexer_logger_impact（运行时模型标识未提供）分析：schema、render、output 与前端均由动态 agents 映射兼容，无需修改。worker_logger_implement（当前 Codex / GPT-5）实施：已在唯一全局 source 增加可选 logger，保持 `worker`、`indexer`、`tokener` 三角色必备规则不变，并在状态同步/收尾加入中断、外部条件或主动暂停时记录当前状态、最后事实与恢复条件，恢复时记录解除证据、重新派工并转回 `[~]` 的检查点。tokener_logger_verify（运行时模型标识未提供）验证：schema/render 自动生成低成本 `agents/logger.toml`，logger 规则无具体项目名称，打断/暂停/恢复/收尾检查点及三角色必备守卫均通过；Hono 类型、文档门禁、diff 与 UTF-8 检查通过。未启动模板服务或修改生成 `.codex` 产物；用户级物化仍由既有 `[!] tokener_mapping_verify` 跟踪。
- [x] indexer_parallel_workflow（运行时模型标识未提供）分析：schema、render 与 output 的动态 agent 映射不提供运行时派工能力，故只需扩充唯一全局 source 的 agentsMd/checklist 文案。worker_parallel_workflow（当前 Codex / GPT-5）处理：已加入同角色独立实例并行、exclusive ownership、依赖/合并验证、用户打断后兼容任务继续/冲突任务暂停重排与 conflict 提醒规则；logger 恢复流程已修正为 parent 重新派工、logger 只记录，且仅在已物化、运行时真实可创建时才可委派。tokener_parallel_workflow（运行时模型标识未提供）验证：并行与依赖边界、打断重排、logger 可用性 guard、三角色必备守卫、schema/render、Hono 类型、文档门禁、diff 与 UTF-8 均通过。未启动模板服务或物化 logger，运行时派工能力仍待服务启动后的独立验证。
- [x] 老板提出：优先修复已安装 VS Code 插件的 Zustand 持久化边界，现状不应写入用户级根目录；目标是随当前打开工作区保存，范围仅限 `vscode/` 插件及必要的公开配置，验收为不同工作区互不串扰且工作区根可定位持久化目录。`indexer_vscode_persistence`（运行时模型标识未提供）已证实服务端会写 `<Runtime.WORKSPACE_PATH>/.zustand/store.json`，但插件只取首个工作区且 CLI 再依赖 `cwd`，多根工作区或启动链路目录漂移会落错；方案为插件显式传递工作区根、服务端优先解析该参数并保留 cwd 回退。`worker_vscode_persistence`（运行时模型标识未提供）实施：插件优先取活动编辑器所属根目录（否则首个根），Windows/Unix 均显式传 `--workspace`，Hono 入口解析该参数且无参数仍回退 cwd。`tokener_vscode_persistence`（运行时模型标识未提供）验证：含空格路径解析为 `<workspace>/.zustand/store.json`，两侧 TypeScript 均通过。已重新打包并覆盖安装 `see7788.extends-codex-vscode@0.2.0`，安装目录产物含新参数与根目录解析；重载 VS Code 窗口后生效。
- [!] 老板提出：让 `logger` 成为可实际使用的低成本全局助手；parent 已启动可识别的本项目临时服务，并通过 `PUT /tpl/global/source`、`POST /tpl/global/materialize` 写入和物化当前 source。`tokener_logger_materialize`（运行时模型标识未提供）验证：`indexer`、`logger`、`worker`、`tokener` 四份用户级 TOML 均存在，logger 为 `gpt-5.6-luna`/`low` 且职责一致，`GET /tpl/global/status` 含 logger，二次物化 HTTP 200 且 logger 的字节、SHA-256、mtime 均不变；临时服务树已精确停止，3000 无监听。当前 Codex 运行时的可创建角色目录仍未公开 `logger`，不能虚报它已参与；解除条件：重载 Codex/VS Code 扩展宿主后确认运行时实际发现并可创建 logger。
- [ ] 老板纠正：VS Code 插件的实现范围必须锁定在 `vscode/`；插件只能引用、调用或在自身封装 `extends-codex`，不得为插件需求修改 `honoapp` 项目源码。此前 parent 为显式传递工作区路径改动了 `honoapp/src/index.ts`，并把入口重构为 `serviceStart(...)`，违反该边界且需后续恢复 `honoapp` 独立 CLI 使用；本轮只记录，不实施恢复。待分派 indexer 明确现有入口影响与只改 `vscode/` 的替代方案、worker 恢复/封装、tokener 验证 Hono 独立启动和插件持久化路径。
- [x] 老板提出：解释本轮物化后未看到工作区 Zustand 缓存。`indexer_zustand_absence`（运行时模型标识未提供）证实：`cwdPersist` 只在业务 store 的 `setItem` 时创建 `<工作区>/.zustand/store.json`，而本轮仅构造 store、启动服务并调用全局 source 的 PUT/materialize，没有任何项目 store action，因此未生成 `.zustand` 属正常的触发条件缺失，不是位置错误或物化失败。全局模板的持久化在 `C:\Users\diyya\.codex\.extends-codex-source.json`，物化输出在同一用户级 `.codex`，与项目 Zustand 分离；未为排查改动源码或生成伪缓存。
- [!] 老板报告：已安装 VS Code 扩展出现白屏，并怀疑 `honoapp` 变更范围过大。`indexer_vscode_white_screen`（运行时模型标识未提供）验证 VSIX 与安装目录的扩展入口一致且清单可解析；首个运行故障是插件启动链 `extends-codex restart → tsx watch → honoapp` 虽存活但当前无 HTTP 监听，3000/3001 均超时，故插件无法取得服务地址。parent 同时在扩展输出取得连续证据：Vite 在 `reactapp/node_modules/.vite-temp` 的 unlink 每约 3 秒触发 `tsx watch` 重启，服务刚监听即被重启，浏览器表现为白屏。当前诊断已完成，未改文件、未停止用户进程或回滚既有改动。待分派 worker 在不扩大 `honoapp` 改动的前提下修复开发服务监听循环，tokener 验证稳定监听、首页 HTTP 与扩展页面恢复。
- [x] 老板要求：先规划恢复 `honoapp` 的独立使用，再设计 VS Code 插件作为外部集成者的方式；不得把插件参数或生命周期协议写入 `honoapp` 入口。`indexer_hono_restore_plan`（运行时模型标识未提供）已确认不能直接回退旧单例实现，应保留当前 factories、恢复无参数 CLI/cwd 工作区解析；插件仅设置子进程 cwd 并调用公开命令，不传插件协议参数；插件改用无 watch 的 `start` 规避 Vite 临时文件触发重启。方案、回退边界与独立 CLI/插件验证项均已形成，本项未修改代码。
- [x] 老板要求：补充全局 Codex 约束，明确厌恶通过 `process` 传递业务或项目参数；无可替代的例外仅允许项目 `store.ts` 或 `index.*` 作为受限入口边界，并必须写明原因。`worker_process_parameter_rule`（运行时模型标识未提供）在全局 AGENTS 总纲与 scope skill 写入规则，并移除校验命令中的 `process.argv`；`tokener_process_parameter_rule`（运行时模型标识未提供）验证唯一边界、CLI argv、envMeta 类型化消费与失败标识无冲突，source schema/render、Hono 类型与 UTF-8 均通过。parent 通过 `PUT /tpl/global/source`、`POST /tpl/global/materialize` 物化，回读用户级 AGENTS 与 `scope-styleskill` 均含规则；受控服务树已精确停止，3000 无监听。
- [x] 老板报告：当前 `honoapp` 的主仓库和切片仓库疑似已被破坏，要求检查全局仓库约束是否不够强或被错误应用。`indexer_hono_store_violation`（运行时模型标识未提供）证实：主仓库虽然仍只组合切片/persist，但把完整 `Runtime` 透传给 `chat`/`tpl` 切片，`tpl` 又展开完整 Runtime 为模板 nodes，造成基础设施对象跨边界；切片 `chat/store.ts` 还直接读取/全量转发 `process.env`，`sse/hookReceive.ts` 在非 `store.ts/index.*` 读取 `process.argv`，均违反刚物化的 process 规则。根因是既有 zustand 规则未明确禁止主仓库成为运行时装配工厂、切片依赖 Runtime，且新规则未回查既有实现；不是 TypeScript 编译失败。未修改代码。
- [ ] 待分派 worker：恢复 `honoapp` 仓库边界。主仓库仅组合切片、persist/rehydrate；`index.*` 或唯一 `store.ts` 将外部进程输入转换为最小有类型配置，按切片最小需求传递，切片不得接收/展开 `Runtime`；清除切片直接读取或全量透传 `process` 的实现。验收：主/切片职责、模板 nodes、CLI/hook 参数和服务行为均回归，且不为 VS Code 插件新增 Hono 协议。
- [ ] 待分派 tokener：独立验证 `honoapp` 仓库边界恢复，检查所有 `process` 原始读取位置、Runtime 依赖图、主仓库/切片职责、持久化路径、CLI/hook/模板服务回归与 Hono 类型检查。
- [x] 老板要求：核查 `honoapp/src/tpl/render.ts` 是否只是 `output.ts` 的单消费者 helper。`indexer_render_ownership`（运行时模型标识未提供）通过全仓检索与 Codegraph 确认 `render.ts` 仅由 `output.ts` 消费、内部渲染函数均无独立状态、`agentFileRender` 为零消费者死导出；`filesRender` 链也只在 `CodexOutput` 内部使用。结论：应收纳为 `CodexOutput` 私有渲染实现并删除 `render.ts`，不应保留 helper 文件。
- [x] 老板要求：收纳 `render.ts`，并把“单消费者 helper 文件必须并入唯一宿主 class、仅内部使用的方法必须 private、零消费者导出必须删除”强化为全局硬约束。`worker_render_encapsulation`（运行时模型标识未提供）已将渲染逻辑收纳进 `CodexOutput` 私有方法、删除 `render.ts`、死导出与零消费者 API，并更新全局 source/tree；`tokener_render_encapsulation`（运行时模型标识未提供）验证 project/global schema 与非写入 `filesStatus()` 冒烟、调用图和公开方法边界均通过，Hono 类型通过。parent 补做 UTF-8/diff 检查，并通过 `PUT /tpl/global/source`、`POST /tpl/global/materialize` 物化；用户级 scope skill 已回读单宿主收纳/private/零消费者删除三条规则，受控服务树已停止且 3000 无监听。
- [!] indexer_hono_store_violation（运行时模型标识未提供）补充：当前项目 `.codex/AGENTS.md` 仅 49 bytes 且 UTF-8 语义损坏，未承载完整项目规则，可能导致已物化的全局约束无法在当前项目执行；不得手改产物。解除条件：模板服务稳定后通过正式项目 materialize 接口重新生成并严格回读 UTF-8/规则锚点。
- [x] 老板要求：分析 `output.ts/schema.ts` 的目录所有权、`tpl/global/store.ts` 绕过主仓库的问题，以及 `Runtime` 是否只应保存 `WORKSPACE_PATH`、`PORT` 两个根元数据。`indexer_output_schema_ownership`（运行时模型标识未提供）确认同一 `CodexOutput` 是用户级 `.codex` 与项目级 `.codex` 的唯一物化边界；`schema.ts` 的全部验证器是 source→output 共享契约，虽由 Output 全量校验，仍被 project/global store 的预校验和 public Tpl 类型使用，适合与 output 收敛为 `tpl/output/` 目录而非 class 私有。`indexer_runtime_store_boundary`（运行时模型标识未提供）确认 globalTpl 是未并入主 store 的第二根 store；Runtime 仅 `WORKSPACE_PATH`、`PORT` 为根元数据，`HOSTNAME` 是独立网络探测值，CODEX/Zustand/Hono/tsx 路径、origin 与 hook commands 均可派生，且 `ZUSTAND_PATH` 无消费者。此项仅完成分析，未移动目录或修改 store/Runtime。
- [x] 老板要求：修复被破坏的 `honoapp` 仓库。parent（当前主 Codex / GPT-5）已确认 user 级 `worker`、`indexer`、`tokener` 定义均可用；indexer（`/root/indexer_codex_env`，模型标识未提供）查实 Codex SDK 省略 `env` 时自行继承进程环境、传入 `apiKey` 时会注入 `CODEX_API_KEY`，worker（`/root/worker_hono_store_repair`，模型标识未提供）据此完成主仓库 runtime/globalTpl/chat/tpl 四 slice、global 路由工厂化、output/schema 目录收敛、根入口/typed hook 改造，并将 globalTpl 与 runtime 及 actions 排除在项目 persist/hydrate 外，恢复端口递增；`runtime.ts` 按老板要求作为孤立未运行文件保留，旧插件 `--workspace` 参数不再由入口解析。tokener（`/root/tokener_hono_store_verify`，模型标识未提供）独立验收：运行代码 `process` 只在 `index.ts`，四根切片与单一 `createStore` 均存在，globalTpl 无第二根 store，端口实际值贯穿监听/hook/物化/origin，`pnpm --dir honoapp exec tsc --noEmit`、`git diff --check -- honoapp/src`、`/tpl/source`、`/tpl/status`、`/tpl/global/source`、`/tpl/global/status` 只读 smoke 均通过。残余风险：为避免 materialize 写入，未做真实占用 3000 的完整启动，端口冲突行为已由完整静态调用链复核。
- [ ] 待分派 tokener：独立验证上述重构的 schema/output 公开入口、project/global 物化幂等、主/切片仓库图、三项 Runtime 元数据与派生值、CLI/hook/插件回归和 Hono 类型检查。
- [x] parent（当前主 Codex / GPT-5）处理：按老板纠正重定义 `logger` 为低成本监督者。parent 独占需求理解、可审计的工作流记录、`[?]` 状态标记与任务安排/重排；logger 仅依据已记录任务、实际 agent 状态和已证实事实，报告未完成、阻塞、中断未续排、冲突或依赖问题，不得写台账、改状态、派工、重排或参与业务。已同步 `honoapp/src/tpl/global/source.ts` 与用户级 `C:\Users\diyya\.codex\agents\logger.toml`；`pnpm --dir honoapp exec tsc --noEmit`、`git diff --check` 通过。当前会话运行时尚未暴露可创建的 logger，未将其记为实际参与。
- [x] parent（当前主 Codex / GPT-5）处理：老板补充指定 `logger` 负责任务状态。职责调整为 parent 独占需求理解、任务内容记录、派工与重排；logger 独占既有任务的 `[?]/[ ]/[~]/[!]/[x]` 状态标记及其事实依据，监督中断、阻塞、冲突和未续排并向 parent 报告，不得改写任务内容、责任人与 ownership。已同步全局 source 与用户级 logger 定义；待运行时实际可创建 logger 后验证并行写入 ownership。
- [x] parent（当前主 Codex / GPT-5）处理：老板确认 logger 的完成监督结论即为完成。派工规则已要求 parent 写清完成条件与验收证据；logger 确认全部满足后直接标记 `[x]`、汇报完成，parent 不重复 review，除非老板要求复核或证据冲突。已同步全局 source 与用户级 logger 定义。
- [x] parent（当前主 Codex / GPT-5）处理：老板要求压缩 logger 定义并明确 parent 职责。全局规则现明确 parent 负责需求、任务内容、范围、完成条件、验收证据、派工、重排与处理监督报告；logger 仅监督实际工作者、按真实状态更新既有任务、完成即标记 `[x]` 并汇报。已同步全局 source 与用户级 logger 定义。
- [x] parent（当前主 Codex / GPT-5）处理：老板确认整体线路为“老板 → parent 澄清至可派工 → logger 与具体工作者并行”。规则已明确 parent 派工后不介入执行细节、仅接收 logger 的异常或完成报告；logger 持续监督且不停止工作者，老板的新要求仍由 parent 先澄清。
- [x] 老板提出：安全整理全局 AI 要求。`indexer global_rules_classify`（运行时模型标识未提供）已只读完成 `agentsMd` 与旧 checklist 的唯一归属分类；为避免具体工作者读取 parent 私有内容，本轮由 parent 直接将 `agentsMd` 收敛为角色/技术分流，新建仅由 parent 加载的 `parent-workflow-styleskill`，迁入需求澄清、任务记录、文档/台账同步、工作者可用性、派工、等待、打断与重排；另将模板服务独立为按需 skill，`docStyle` 只保留 README/tree 公开写作格式，logger 与具体工作者定义限制为最小任务上下文。Hono TypeScript、source schema、临时物化及两个新 skill 校验已通过；`tokener routing_privacy_review`（运行时模型标识未提供）最终确认共享 AGENTS/logger 隐私问题及 symlink/二次复检问题均已解决，仅剩极小本机竞态风险。`worker stale_generated_cleanup`（运行时模型标识未提供，exclusive ownership：`honoapp/src/tpl/output/index.ts`）已完成精确清理并通过普通旧文件、外改阻断、未知保留、二次幂等、路径穿越、junction 与并发外改场景验证；Windows 文件 symlink 因权限未实测。`logger workflow_t221`（运行时模型标识未提供）已实际创建并监督本记录。最终 Hono TypeScript、source schema、9 个生成 skill quick_validate、隐私静态断言、隔离物化、git diff/UTF-8 验证均通过。
- [~] 老板提出：先通过正式模板服务把当前全局 source 更新并物化到用户级 `.codex`；随后重构可审计工作流为树形父子任务、收紧 logger/parent/docStyle/templateService 与具体工作者的最小读取范围。parent 负责当前顶级需求澄清与派工；待 logger 实际接管此行状态监督。验收：服务回读 source 与当前源码一致、用户级产物刷新且退役 checklist 不再存在；树形记录可按稳定节点 ID 和当前行内容定位，父子任务/并行 ownership/依赖可审计，具体工作者不加载 parent、logger、docStyle 或模板服务私有内容。阻塞事实（已解除）：parent 启动临时 `extends-codex start` 以正式接口物化时，启动前预检失败，错误为 `Global Codex file changed outside its source: C:\Users\diyya\.codex\agents\logger.toml`；当时没有服务监听、没有用户级文件被覆盖。解除条件（已满足）：parent 只读比较旧 state、当前 logger 与当前模板期望，得到老板授权的保留/迁移策略后再物化。物化成功证据：正式 PUT/POST 返回 200；用户级 AGENTS 已生成 15 行角色/技术分流，`logger-workflow` 与 `parent-workflow` skill 已存在，旧 checklist skill/state 已移除；当前 logger TOML 已含监督 parent 先建树节点的规则。整体树形台账与私有分流的源码验证尚在进行，故暂不标记完成。
- [~] T-043 老板提出（最新设计覆盖先前“直接修改 Markdown 折叠”的方向）：凡涉及文件的工作，logger 必须监督 parent 是否先建立任务记录并真实派工；`honoapp-vscode-plugin` 扩展的既有业务功能先停用，状态栏图标点击只打开抽屉，图标以灰/彩色状态表示当前工作区 Markdown 是否启用美化。默认只读取并美化工作区根的 `AGENTS.md`，抽屉允许老板修改目标 Markdown 文件名；预览可折叠任务树，且永不改写原始文件。验收：新规则已物化；扩展仅写入 `honoapp-vscode-plugin` 子项目，状态图标和抽屉真实可见，开关状态与预览一致，默认/自定义目标均只读。
	- [~] T-043.L logger `materialize_tree_workflow`：监督 parent 已先登记 T-043；核对本轮写入范围、真实委派和状态事实，若发现未记录实施、越界或未续排，向 parent 报告。当前事实：parent 已先登记 T-043；`T-043.W1` 已真实创建为只读 worker，旧“尚未创建”事实已被本次更新取代。
	- [x] T-043.W1 worker `/root/vscode_tree_entry`：只读定位状态栏图标、抽屉/webview、现有业务启动开关以及 Markdown 渲染入口；exclusive ownership：`vscode` 扩展只读分析，不得改文件，输出最小停用/替换边界、状态存放位置与验证方式。事实：只读报告已交付、未改文件。
	- [ ] T-043.W2 worker：在 `honoapp-vscode-plugin/src/index.ts` 停用既有服务启动/关闭业务，把状态栏项改为灰/彩 Markdown 美化状态并只打开抽屉；抽屉默认只读工作区根 `AGENTS.md`，允许输入工作区内相对 Markdown 名称，提供安全的折叠树预览，绝不写回 Markdown。exclusive ownership：`honoapp-vscode-plugin/src/index.ts`；验收：构建通过、工作区外路径被拒绝、服务命令不再由图标触发。
	- [ ] T-043.W2.R1 tokener：在 W2 完成后只读 review 状态/抽屉/路径边界与 Markdown 内容转义，确认没有遗留服务启动入口或 Webview 注入风险；不修改文件。
- [x] T-044 老板更正：新项目名称为 `todoapp-vscode-plugin`；现有 VS Code 插件项目名称为 `honoapp-vscode-plugin`。前者作为 Vite + React + Zustand 的浏览器承载入口；本轮目录/workspace 身份调整、todoapp 骨架与说明均已完成，不实现 workflow 接口、不修改 `honoapp` 业务源码。验收证据：两个新目录存在、旧目录不存在，workspace/包名/脚本/README 直接引用已同步；根 `pnpm install`、两个项目 build 和 `git diff --check` 均通过。
	- [x] T-044.L logger：已确认 parent 在实际路径迁移前登记 T-044；W1/W2 实例创建事实已记录，W3/W4 尚未真实创建。
	- [x] T-044.W1 worker `/root/todoapp_scaffold`：原路径骨架任务因老板改名而被 parent 中断；已产生内容由 T-044.W3 检查并迁移到 `todoapp-vscode-plugin/`，该中断已解除。
	- [x] T-044.W2 worker `/root/todoapp_readme`：未写入且错误报告工作者定义缺失；该阻塞已由 T-044.W5 的真实 README 创建与验证解除，不将该实例误记为文档实现者。
	- [x] T-044.W3 worker `/root/todoapp_project_rename`：两目录已精确迁移，workspace/包名/脚本/README 引用已同步；pnpm install 与两个项目 build 均 exit 0，git diff --check 通过。exclusive ownership：上述两目录、`pnpm-workspace.yaml`、相关包/README 与根 README；不得修改 `honoapp`、模板 source 或其他项目业务文件。
	- [x] T-044.W4 worker `/root/todoapp_project_readme`：运行时认证错误 `refresh token revoked`，未提供 README 交付证据，未修改文件；该运行时故障已由 T-044.W5 重排并解除。
	- [x] T-044.W5 indexer `/root/todoapp_readme_retry`：已创建并验证 `todoapp-vscode-plugin/README.md`；Node 严格 UTF-8、关键锚点与该文件的 `git diff --check` 通过。该文档只说明真实骨架、开发/构建入口及计划中的 workflow owner/React 消费关系，未假称接口已实现。
- [x] T-045 老板提出：在全局 Codex 模板中收紧 parent 写入权限、让 logger 监督 parent 是否越界，并将 tokener 收紧为强制只读反馈者。验收完成：parent 写入仅限 Markdown 与全局模板唯一源；logger 无越界且仅据真实证据监督；tokener 只读反馈及反馈→worker 子节点规则已正式物化。PUT/POST、哈希回读、typecheck、sourceSchema、diff 检查均通过。
	- [x] T-045.L logger：监督结论：parent 已先登记 T-045，实际写入仅涉及 README.md 与全局模板唯一源 `honoapp/src/tpl/global/source.ts`，无越界。正式 PUT/POST `/tpl/global/source`、`/tpl/global/materialize` 均返回 200；source SHA-256 与 GET status 的 persisted source 一致，生成的 parent/logger/tokener skill 文件均存在；Hono typecheck、sourceSchema 与 `git diff --check` 通过。tokener 强制只读、logger 无无意义提醒及反馈→worker 子节点闭环规则均已物化。
	- [x] T-045.P1 parent：仅修改 `honoapp/src/tpl/global/source.ts` 的 parent/logger/tokener 私有规则，并完成正式全局模板接口物化、哈希回读及 schema/typecheck 验证；`git diff --check` 通过。exclusive ownership：该唯一模板源与 T-045 状态记录。
- [~] T-046 老板提出：`todoapp-vscode-plugin` 不保留泛型 `TodoAppState.appTitle`，按既有对象目录/切片仓库风格建立真实 `src/todotree/`。验收：`todotree` 成为具体业务对象目录，拥有实际任务树节点与状态类型、同目录切片仓库；根 `src/store.ts` 只组合切片；React 入口只消费该对象，不使用假标题状态。
	- [x] worker `/root/todotree_store`：已实现 `todoapp-vscode-plugin/src/todotree/` 与对应主仓库组合，替换泛型 App 状态；exclusive ownership：`todoapp-vscode-plugin/src/**`。`pnpm --dir todoapp-vscode-plugin run build` 与限定 src diff/UTF-8 检查通过；未改 package、README、其他项目或加入持久化/API。
		- [x] tokener `/root/todotree_review`：只读审查完成。确认 `todotree` owner/切片根成员与主仓库边界正确，且无 `TodoAppState.appTitle` 残留；但发现 `nodesById/rootNodeIds` 仅为空类型骨架、没有创建/更新/关系维护 action，无法证明 ID、父子关系、标题与状态不变量；构建仅证明编译，不证明对象行为。
			- [x] parent：接收审查反馈并完成重排：在 `todotree` owner 内补最小 action，原子维护节点 key/ID、根/父子关系与状态，并要求针对性行为验证；不把空态计数当成真实任务树交付。
				- [x] worker `/root/todotree_actions`：已仅修改 `todoapp-vscode-plugin/src/todotree/store.ts`、`src/App.tsx` 与同目录 `store.test.ts`，实现并消费最小真实任务树 action；`pnpm exec tsx src/todotree/store.test.ts` 与 build 通过，覆盖 key/ID 一致、根/子关系、标题/状态更新、重复 ID 与缺失父节点拒绝。
					- [!] tokener `/root/todotree_actions_review`：老板新增“禁止测试性质文件”要求后被 parent 中断；不得基于 `store.test.ts` 继续复审。解除条件：先删除测试文件并改用真实构建/页面或接口验证。
						- [x] parent：接收老板纠正：`store.test.ts` 对老板无用，不保留任何测试性质文件；已安排 worker 删除，并改由真实构建和后续实际页面/接口行为验证。
							- [x] worker `/root/todotree_test_remove`：仅删除 `todoapp-vscode-plugin/src/todotree/store.test.ts`；确认无残留入口或引用。exclusive ownership：该文件。验收：文件不存在，`pnpm --dir todoapp-vscode-plugin run build` 通过。
	- [~] parent：接收老板类型纠正：任务节点状态必须覆盖待确认、待办、进行中、已完成、阻塞；节点必须有实际 `workerName` 字段，不能只有标题和两态 status。
		- [!] worker `/root/todotree_status_worker`：未修改文件即中止；其将用户级 `*.toml` 误按不存在的 `*.md` 路径检查，错误报告三个必需定义缺失。解除条件：已由 parent 核实 `C:\Users\diyya\.codex\agents\{worker,indexer,tokener}.toml` 均存在，重新委派。
			- [!] worker `/root/todotree_status_retry`：老板纠正数据结构为纯扁平关系后被 parent 中断，未改文件。旧实现同时维护 `parentId`、`childIds` 与 `rootNodeIds`，存在双写和一致性风险。解除条件：仅保留 `nodesById` 与节点 `parentId`，根节点和子节点均按 `parentId` 查询推导。
				- [!] worker `/root/todotree_flat_worker`：任务实例在返回结果前消失；目标文件中已出现纯扁平实现、完整状态和 `workerName` 改动，但缺少该实例的构建证据，不能标记完成。解除条件：由独立 worker 只读核验构建和限定 diff，再由 tokener 只读审查。
					- [!] worker：只读核验已被老板的数值枚举纠正取代；现有字符串 `status`、`workerName` 不能作为验收目标。解除条件：先完成数值领域字段改造。
	- [~] parent：接收老板数据表达纠正：节点的状态和工作者均保存明确数字，不保存展示文本；展示标题、标签与图标在 React 映射。暂定稳定编码为 `status`：`1 | 2 | 3 | 4 | 5`（待确认、待办、进行中、已完成、阻塞），`worker`：`1 | 2 | 3 | 4`（parent、worker、indexer、tokener）；logger 不进入业务节点。
		- [x] parent：已澄清老板意图：数字联合类型的成员数量由完整业务状态决定，不限制为四值；`status` 保留五种状态并编码为 `1 | 2 | 3 | 4 | 5`，`agent` 保持四种角色编码 `1 | 2 | 3 | 4`。
			- [!] worker `/root/todotree_numeric_rework`：老板指出当前工作区已有 `extends-zustand`，禁止继续手写通用仓库/action 轮子后被 parent 中断；不得基于自实现的泛型字段更新或切片样板继续验收。解除条件：先由 indexer 只读确认 `extends-zustand` 的真实公开 API 和适配边界。
				- [x] indexer `/root/extends_zustand_api_indexer`：只读调查完成。真实既有消费证明可复用 `extends-zustand/immerStateCreator` 切片工厂与 `extends-zustand/cwdPersist`；没有主仓库创建器或通用字段 action 的公开证据。`todoapp-vscode-plugin` 尚未声明 `extends-zustand: workspace:*`。同级真实包位于 `../extends-zustand`，不在本次允许只读范围内，因此未臆测根导出。未改文件、未创建测试或物化。
					- [x] parent：接收调查反馈并重排：复用已证实的 `immerStateCreator`，不臆测不存在的通用 action；保留任务树的 ID、扁平关系和数值编码等领域逻辑。下一 worker 只改 package、主仓库和 todotree 切片，不改页面。
		- [x] worker `/root/todotree_extends_zustand_worker`：worker 子工作已完成；仅修改 `todoapp-vscode-plugin/package.json`、`src/store.ts`、`src/todotree/store.ts`，以 `workspace:*` 声明并从 `extends-zustand/immerStateCreator` 复用切片工厂，保留纯扁平 `nodesById + id_parent` 及数值 `status`/`agent` 领域语义。真实 install 成功且依赖解析到 `extends-zustand link:../../extends-zustand`；集成 build 因 `App.tsx` 仍消费旧字段失败，App 不在该 worker ownership，故本叶节点阻塞，T-046 顶层不标完成。
			- [!] parent：老板纠正既定仓库结构：`todotree` 只能存储持久化数据，`todotreeActions` 才提供方法与不持久化数据；当前实现把 action 混入 `todotree`，因此取消原定 tokener 审查，先按现有范式重排。
				- [x] indexer `/root/zustand_object_root_indexer`：只读调查完成。现有范式均为 `{ object, objectActions }`，且持久化过滤严格排除顶层 `*Actions`；因此采用复数 `todotreeActions`，不能使用单数。`todotree` 最小持久化形状为 `{ nodesById }`；ID/父关系/数字字段是数据，方法/闭包/临时变量不得进入数据根。未改文件、未创建测试或物化。
					- [x] parent：接收调查反馈并重排：`src/store.ts` 只组合切片无需改动；下一 worker 仅重构 todotree 数据/Actions 分层并迁移 App 消费。数字到文字的映射放 todotree 数据定义，App 只显示文字；`nodeFieldSet` 有三处实际复用，不因“无意义 helper”规则删除。
						- [|] worker `/root/todotree_data_actions_worker`：老板将状态模型由五态纠正为九态后被 parent 中断；没有完成或构建证据，当前叶子不能验收。
							- [<] parent：接收老板的统一九态模型；节点 `status` 依次编码为待确认、待办、未派工、运行中、已反馈、已中断、已完成、阻塞、已取消。`agent`、实例名、模型和时间戳保留为节点元数据，不再另设 runtime 状态枚举。
					- [x] worker `/root/todotree_nine_status_worker`：仅修改 `todoapp-vscode-plugin/src/todotree/store.ts` 与 `src/App.tsx`，将切片收敛为 `{ todotree: { nodesById }, todotreeActions: { 数字到文字映射、nodeAdd、nodeTitleSet、nodeStatusSet、nodeAgentSet 及不持久化运行实现 } }`；保留纯扁平 `id_parent` 和数字九态 `status`/四角色 `agent`。映射定义在同一个 `store.ts` 默认导出切片中，App 仅从仓库消费文字，未改 root store、package、README、其他项目或创建测试。`pnpm --dir todoapp-vscode-plugin run build`、目标文件 UTF-8 完整性检查与 `git diff --check` 均通过；未使用 `parentId`、`childIds`、`rootNodeIds`，无阻塞。
					- [x] parent：老板取消路由 TSX 顶部 `Runtime`/`Agent`/`Status` 特例；改为将数字到文字的映射归入 todotree 数据定义，TSX 只消费映射结果；本轮只显示文字、不使用图标，颜色/图标如后续加入也只能是同一映射的附加展示字段。
						- [<] parent：老板发现当前没有可观察路由与对应 TSX 文件；T-046 暂不收尾。已补充 React Router/`routers` 规范，并重排为一个完整路由切片。
							- [>] worker：仅修改根 `package.json`、`todoapp-vscode-plugin/package.json`、`todoapp-vscode-plugin/src/App.tsx`、`todoapp-vscode-plugin/src/routers.tsx`，以及安装不可避免且基线安全时的 `pnpm-lock.yaml`。引入 React Router，定义 `routers`，为 todotree 提供实际 TSX 路由页面；根 `pnpm dev` 必须启动 todoapp 开发入口。不得修改 store、README、其他项目或创建测试。验收：根 `pnpm dev` 可启动，todoapp build 通过，路由页面可观察。
								- [<] parent：老板补充初始任务树根定义：前端按工作区盘符绝对路径隔离，Hash 路由通过 query 接收路径；任务树根标识就是该路径，顶级任务以它作为 `id_parent`，不再产生空根/随机根。
									- [>] worker：待路由依赖可解析后，修改 todotree store、根 store 与实际路由页面，使 `#/todotree?path=<编码后的盘符绝对路径>` 初始化/选择对应路径根；路径是浏览器 persist 与 UI 隔离键，顶级任务 `id_parent` 等于路径根。persist 只能保存该路径的任务树数据，必须排除 `todotreeActions`、文字映射和运行态。具体 ownership 在前一轮路由 build 阻塞解除后与其合并，避免重复派工。
- [~] T-048 老板提出：在 `todoapp-vscode-plugin` 完成前，建立供 React、parent 与 logger 共同操作的 Vite 本机工作流接口；浏览器 Zustand 主仓库按项目路径持久化 UI 状态；随后由 `honoapp-vscode-plugin` 作为 VS Code 安装入口启动/打开实际使用页面。验收：不引入 Hono；工作流事实与浏览器 UI persist 职责分离；接口与插件交接使用有类型显式输入，不依赖进程隐式参数。
	- [ ] indexer：只读定位 `todoapp-vscode-plugin` 的 Vite 开发入口、现有主/切片仓库及 `honoapp-vscode-plugin` 的启动/浏览器入口；输出最小接口、项目路径传递、持久化 key 与分阶段 ownership，禁止改文件。
	- [ ] worker：等待 indexer 结论和 T-046 复审通过后，实现 Vite 本机接口与工作流事实 owner；具体文件 ownership 由 parent 在派工时写入。
	- [ ] worker：等待接口稳定后，在主仓库加入以项目路径隔离的浏览器 UI persist；不得将工作流事实只存浏览器。
	- [ ] worker：等待页面接口可用后，将 `honoapp-vscode-plugin` 接成 VS Code 安装/启动入口并进行真实使用验证。
- [x] T-047 老板提出：进一步明确 parent 只能承担领导职责。验收：parent 的亲自操作被精确限制为对话理解、任务树内容/派工/重排、接收反馈及老板明确授权的全局模板规则维护；普通文档、源码、配置、测试、构建和运行实现一律建立子节点并委派具体工作者，不能以“小改动”为由代做。parent 写入仅涉及 README 任务树与 `honoapp/src/tpl/global/source.ts`；Hono typecheck、source schema 与 diff 检查通过；正式 PUT/POST materialize 均返回 200，source hash 与 GET persisted source hash 一致。
	- [x] parent：仅修改全局模板唯一源中的 parent 工作流规则并正式物化验证；exclusive ownership：`honoapp/src/tpl/global/source.ts` 与 T-047 任务树内容。证据：Hono typecheck/source schema/diff 通过；正式 PUT/POST materialize 200；source hash equals GET persisted source hash。
- [ ] T-049 老板提出：全局默认禁止新增测试性质文件，例如 `*.test.*`、`*.spec.*` 与 `__tests__/`；验证应使用真实构建、真实接口、真实页面或老板明确要求的验证入口。验收：待 `todoapp-vscode-plugin` 完成后，与“待补充 Codex 要求”中的其他规则统一复核、写入全局模板并物化；当前 `store.test.ts` 已由 T-046 的 worker 删除。
	- [x] parent：已撤回尚未物化的全局模板源改动，并整理到 README 的“待补充 Codex 要求”；本轮不修改全局模板、不调用物化。
	- [x] parent：老板补充“避免没有存在意义的单点调用参数”；已整理为参数/输入类型抽象门槛并写入“待补充 Codex 要求”，等待 `todoapp-vscode-plugin` 完成后统一复核、写入模板和物化。
	- [x] parent：老板补充阻塞闭环规则；已整理为“工作者阻塞报告完成、原目标保持阻塞、parent 新增待确认建议节点”的状态语义并写入“待补充 Codex 要求”，等待 `todoapp-vscode-plugin` 完成后统一复核、写入模板和物化。
	- [x] parent：补齐老板确认的第六个终态“已取消”，以及完整功能切片优先一个 worker、非固定多角色流水线的协作效率规则；已写入“待补充 Codex 要求”，等待全部待办完成后统一复核、写入模板和物化。
	- [x] parent：老板取消具体路由 TSX 的 `Runtime`、`Agent`、`Status` 固定顶部组件；已改为“数字到文字映射归数据定义、TSX 只消费”，本轮不使用图标，并写入“待补充 Codex 要求”，待全部待办完成后统一写入模板和物化。
	- [x] parent：老板补充 Zustand 对象目录的“同名持久化数据根 + 同名复数 Actions 根”结构；已写入“待补充 Codex 要求”，待全部待办完成后统一写入模板和物化。
