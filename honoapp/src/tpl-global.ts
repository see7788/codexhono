import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { tplGlobal_t } from "./tpl/source";

const nodes = {
  checklistStyle: "checklist-styleskill",
  codebaseMcpStyle: "codebase-mcp-styleskill",
  docStyle: "doc-styleskill",
  fileIo: "file-io-styleskill",
  netStyle: "net-styleskill",
  scopeStyle: "scope-styleskill",
  variableStyle: "variable-styleskill",
  zustandStoreStyle: "zustand-store-styleskill",
} as const
const source: tplGlobal_t = {
  nodes,
  agentsMd: {
    sections: [
      {
        title: "总纲",
        items: [
          "TypeScript 优先；React、Hono、antd、Vite、zustand、immer 优先。",
          `读写仓库文件时使用 ${nodes.fileIo} skill；所有文件必须是 UTF-8 无 BOM。`,
          "先按运行侧和任务类型选择 skill；总纲只保留全局硬规则，不在总纲展开具体实现细则。",
          `默认最小实现；抽象准入、内联与归一化放置统一按 ${nodes.scopeStyle} 执行。`,
          `任务拆解、进度状态和多阶段验证使用 ${nodes.checklistStyle}；用户说 todolist、todo list、任务清单或清单时按 checklist 标准执行，对外表达优先沿用用户说法，状态标记仍使用 [ ]、[~]、[x]、[!]。`,
          "出现 bug、报错、服务不可达、页面异常或行为不符合预期时，先按已有 skill 判断；缺少必要规则导致无法稳定决策时，暂停处理并说明缺少哪类 skill。"
        ],
      },
      {
        title: "场景分流",
        items: [
          "先判断运行侧：React 页面使用前端章节，Hono/Electron main/Node 进程使用后端章节；横切域必须放在具体运行侧语境下解释。",
          `代码库检索、调用关系、影响范围和代码库 MCP 选择使用 ${nodes.codebaseMcpStyle}。`,
          `组件结构、页面交互、对象边界、复用、导出和作用域使用 ${nodes.scopeStyle}。`,
          `Hono API、页面 API、外部 HTTP、SSE、WebSocket 和同进程 Hono 调用使用 ${nodes.netStyle}。`,
          `前端/后端 store、action、业务状态流转、流式状态和订阅推送使用 ${nodes.zustandStoreStyle}。`,
          `变量、形参、对象方法、store action 和路由层级命名使用 ${nodes.variableStyle}。`,
          `README、项目说明和公开结构说明使用 ${nodes.docStyle}。`
        ],
      },
      {
        title: "Git 自动执行权限",
        items: [
          "用户主要单人维护这些项目，AI 对当前任务和当前分支拥有长期 Git 高权限；有助于完成、验证、回退或发布当前任务的 Git 操作无需再次请求确认。",
          "唯一分支限制是禁止创建新分支、禁止切换到其他分支；所有实现、历史整理、同步和发布都在用户当前分支完成。",
          "AI 可以按任务需要自行执行 status、diff、log、reflog、fetch、pull、add、restore、commit、amend、revert、reset、cherry-pick、merge、rebase、push、tag 及远端 tag 同步，不把这些操作拆成逐次授权问题。",
          "允许整理或重写当前分支历史，并在确有需要时使用 force-with-lease；执行破坏性工作树或历史操作前必须记录本地与远端引用，并先创建可恢复的 commit 或 tag，禁止无恢复点丢失现有内容。",
          "长任务每到一个已真实验证通过且可独立回退的里程碑，自动提交并推送当前分支；发布、重大修复或重要回退点可以自行创建并推送语义 tag 或时间戳 tag，任务需要时也可以更新或删除本地与远端 tag。",
          "Git 高权限只覆盖当前任务相关改动；脏工作树中的无关用户改动必须保留并排除在任务提交外，不能借自动提交、rebase、reset 或 push 擅自改写无关内容。",
          "远端认证缺失、受保护分支拒绝、远端历史变化或冲突无法在不丢失内容的前提下自动处理时，才标记阻塞并报告证据；普通 commit、push、tag 和当前分支同步不再询问用户。",
        ],
      },
      {
        title: "对象边界红线",
        items: [
          "前后端项目中的领域对象默认由服务端生产者作为 owner 定义；若真实生产者不是服务端，必须在实现前明确生产者、生命周期与稳定 ID 契约。",
          "消费者层（页面、路由、组件、adapter）只能通过 ID、owner action 或只读视图 DTO 消费对象；禁止根据页面字段、请求参数或展示需要拼装、扩展、重命名领域对象。",
          "固定执行顺序：先建立服务端对象目录与切片仓库，再按当前页面的真实需要创建 action，最后实现对象路由与页面路由；禁止提前实现可能用得上的方法、类型或 DTO。",
          "页面功能目录与服务端对象目录保持对应；组合页面可以编排多个对象，但不得成为新的对象 owner，也不得把多个对象重新拼成消费侧领域模型。",
          "用户要求的任务一旦造成对象越界，必须先明确提醒并返回 `Boundary Check Failed`，说明越界点和建议归属；在边界修正前不得直接实现。",
        ],
      },
      {
        title: "个人 extends-* 工具库保护红线",
        items: [
          "`extends-*` 是用户个人长期维护、跨项目复用的独立工具库，不是当前消费项目的业务目录；当前项目只能按工具库已经存在的公开能力调用。",
          "当前项目的真实调用无法由工具库现有能力满足时，必须立即返回 `Library Boundary Decision Required`；在用户作出选择前，禁止在工具库或消费项目新增文件、接口、wrapper、adapter、compat 层，禁止修改接口参数或任何一侧的业务逻辑。",
          "只能先向用户并列提供“新增工具库能力”和“修改既有工具库能力”两种建议，分别说明归属、公开形态、复用价值、兼容影响、受影响消费者与验证方式；不得替用户默认选择，也不得用当前项目的临时绕行方案规避决策。",
          "用户明确选择新增、修改或放弃后，才按选择实施；只属于依赖安装、版本归一或物理解析来源的问题可以按 scope-style 的 pnpm 冲突规则处理，但一旦需要改变 API、参数或业务语义，必须重新进入用户决策。",
        ],
      },
      {
        title: "文本完整性红线",
        items: [
          "UTF-8 无 BOM、没有替换字符只代表字节格式可接受，不代表中文语义正确；错误解码后的乱码再次保存，仍可能是完全合法的 UTF-8。",
          `涉及中文、模板、规则、Markdown、配置或大文件时，写入前必须使用 ${nodes.fileIo} 建立基线并声明目标文件和允许变化的区域；基线未通过不得写入。`,
          "目标文件在建立基线后若被用户、编辑器或其他进程修改，基线立即失效；AI 必须停止并重新读取，不得把双方改动覆盖或拼接。",
          "禁止使用未明确编码的读取结果、终端显示、截图、聊天复制出的乱码作为写入源；禁止猜编码、批量转码、管道回写或凭记忆重建整文件。",
          "用户要求跳过基线、使用高风险整文件覆盖、边编辑同一目标边要求 AI 继续，或无法提供可信恢复源时，AI 必须拒绝写入并说明需要用户先完成什么。",
          "模板只修改唯一源文件并通过生成器更新产物；禁止为了快速修复直接改生成的 `.codex`，也禁止在源文件损坏时用简化版本替换。",
          "任一前置条件不满足时返回 `Text Integrity Check Failed`；写后验证和事故恢复只能作为兜底，不能替代修改前防护。",
        ],
      },
      {
        title: "运行约定",
        orderedItems: [
          "src/runtime.ts 是运行时配置，src/routers.ts 是路由汇总，src/index.ts 是入口；src/index.ts 只负责启动运行时。",
          "pnpm workspace 项目只允许根 package.json 定义 scripts 命令入口；具体子项目不写 scripts，除非用户明确要求该子项目独立运行。该规则只约束 scripts，不禁止根 package.json 暴露真实 bin。",
          "禁止为子项目随手增加无实际入口使用的 vite.config.ts、配置包、环境变量桥接文件、compat/adapter 或兼容套壳；需要 Vite 时由真实运行方托管和配置。",
          "重启 extends-codex 使用 `pnpm dlx github:see7788/extends-codex restart`。",
          "遇到可观察浏览器、查看上下文、页面观察等要求时，先检查 dev 命令是否带上 extends-codex；pnpm 项目必须在根 package.json 定义 dev 命令。",
          "dev 未带上 extends-codex 时暂停处理，给出 dev 命令补全写法；等待 dev 重启并生成新的 .codex 后再继续。",
          "dev 已带上 extends-codex 时，Chrome DevTools MCP 访问 HONOCODEX_ORIGIN（host=HONOCODEX_HOSTNAME，port=HONOCODEX_PORT）。"
        ],
      },
    ],
  },
  configToml: {
    shellEnvironmentPolicy: {
      inherit: "all",
      exclude: ["ELECTRON_RUN_AS_NODE"],
    },
    mcpServers: {
      "chrome-devtools": {
        args: ["chrome-devtools-mcp@latest"],
        command: "npx",
      },
      codegraph: {
        args: ["@colbymchenry/codegraph", "serve", "--mcp"],
        command: "npx",
      },
      node_repl: {
        args: [],
        command: "node_repl",
      },
    },
  },
  skills: {
    [nodes.variableStyle]: {
      description: "涉及变量、形参、对象方法、store action、路由层级或文件内命名时使用。约束语义命名、状态名在前、避免动词前置和无意义形参。",
      title: "变量命名风格",
      sections: [
        {
          title: "分流规则",
          items: [
            "前端组件、hook、props、UI 状态和前端 store action 命名使用「前端变量」。",
            "后端 route、handler、业务对象、schema、缓存、协议字段和后端 store action 命名使用「后端变量」。",
            "对象方法和仓库 action 命名使用「方法和 action」。",
            "本 skill 只处理变量、形参和命名语义；作用域拆分看 scope-style，状态流转看 zustand-store-style，网络协议看 net-style。",
          ],
        },
        {
          title: "通用命名",
          items: [
            "命名必须表达业务语义或状态语义，不用 `data`、`item`、`temp`、`value` 这类无法区分含义的泛名，除非作用域极小且含义唯一。",
            "形参最小化：单点逻辑直接读当前作用域；真实复用后，才把差异提升为形参。",
            "禁止为了包一层、传一遍、套壳或制造统一形式创建无复用形参。",
            "项目自定义函数、方法、构造器和 store action 需要两个及以上业务形参时，必须改为一个对象形参；对象形参类型优先内联，只有多个真实消费点时才允许命名 type/interface，禁止只为包参数新增 DTO。框架或第三方规定的回调签名、rest 参数除外。",
            "形参名使用调用方能理解的业务名，不用 `param`、`args`、`payload` 兜所有场景；事件对象、库回调等约定俗成名称除外。",
            "布尔值命名表达判断语义，例如 `isReady`、`hasError`、`canSubmit`；不要用需要反向理解的含糊名称。",
            "数组和集合命名表达元素领域，例如 `messages`、`skillDirs`；不要只写 `list`。",
            "命名长度与路径深度选择时，优先规则是保持命名短"
          ],
        },
        {
          title: "前端变量",
          items: [
            "前端组件、hook、props、局部状态和 store action 命名必须表达 UI 或业务状态语义，不用 `data`、`item`、`value` 兜底。",
            "布尔 UI 状态命名表达判断语义，例如 `isOpen`、`hasError`、`canSubmit`。",
            "数组和集合命名表达元素领域，例如 `messages`、`selectedIds`、`skillDirs`；不要只写 `list`。",
          ],
        },
        {
          title: "后端变量",
          items: [
            "后端 route、handler、业务对象、schema、缓存和协议字段命名必须表达领域语义，不用 `data`、`payload`、`result` 兜所有场景。",
            "路由路径、对象方法和 store action 的业务层级保持一致，避免把领域压扁成难读名称。",
            "第三方协议字段按对方协议保留；本项目内部变量和派生值按当前业务语义命名。",
          ],
        },
        {
          title: "方法和 action",
          items: [
            "对象方法和仓库 action 命名使用状态名在前、动作在后的方式，例如 `runtime.portNext()`、`dataSet`、`targetIdSet`、`itemAdd`、`itemDel`、`listReset`、`messageSend`、`responseReceive`。",
            "禁止动词前置命名，例如 `setData`、`setTargetId`、`addItem`、`deleteItem`。",
            "路径可以深、末端方法名尽量短；用对象层级表达领域，例如 `llm.openai.config()`、`agent.codexcli.chat()`。",
            "路由路径和仓库 action 的业务层级保持一致；例如 `chatActions.llm.openai.chat()` 对应 `/chat/llm/openai`，避免 `/llmopenai` 这类压扁命名。",
          ],
        },
      ],
    },
    [nodes.scopeStyle]: {
      description: "涉及前端组件作用域、后端业务对象边界、复用归一化、拆分、导出、样式放置、公共库依赖或 pnpm workspace 冲突时使用。约束最小作用域、真实复用后抽象、前后端边界与跨工作区依赖来源。",
      title: "作用域风格",
      sections: [
        {
          title: "对象边界与目录映射",
          items: [
            "先从生产者角度确认对象：谁创建、更新、销毁它，谁维护持久状态与稳定 ID；前后端项目默认以服务端对象目录作为 owner 边界。",
            "一个领域对象只有一个 owner；对象类型、schema、持久状态和本对象 action 在 owner 目录内收敛，不得在多个切片仓库或传输层重复建模。",
            "先实现 owner 的对象目录和切片仓库；action 只按当前已确认的页面或接口调用点创建，无真实调用点的未来方法、备用类型和预留 DTO 不得加入。",
            "对象暴露的服务端路由放在该对象目录内；页面路由或功能目录与服务端对象目录保持同名或明确映射，路由汇总层只组合，不拥有领域状态。",
            "消费者只允许通过稳定 ID、owner action 或只读视图 DTO 使用对象；禁止从页面字段、请求 contract 或组件状态反推并新建领域对象。",
            "消费者携带的 ID、URL 查询或恢复参数只允许在 owner 状态不存在时用于初始化；owner 已有对象或关系后，重连、恢复和页面状态不得覆盖它，关系变更必须调用 owner action。",
            "组合页面可以调用多个 owner 的 action 完成场景编排，但不得跨 owner 直接修改状态，也不得把组合结果升级为新的领域对象。",
          ],
        },
        {
          title: "分流规则",
          items: [
            "前端组件结构、页面交互、组件拆分、UI 临时态和样式放置使用「前端作用域」或「前端样式作用域」。",
            "后端 route handler、业务对象边界、实例复用、schema/cache 收敛使用「后端作用域」。",
            "抽象、复用、文件拆分和最小作用域先看「通用作用域」；跨文件导出和默认导出看「导出边界」。",
            "变量、形参和方法命名只引用 variable-style；业务状态流转只引用 zustand-store-style；网络协议只引用 net-style。",
          ],
        },
        {
          title: "通用作用域",
          items: [
            "任何常量、类型、函数、方法、class、组件、配置、DTO、wrapper、adapter 或文件，只有在存在多个真实消费点，或自身维护独立状态、生命周期、不变量时才允许定义；否则必须内联到真实消费点。改变 private/public、class/file 或目录位置不构成复用。",
            "具体实现前先做真实实现前置检查：确认真实输入、真实配置、真实调用路径、真实副作用和真实验证方式；缺任一关键条件时先阻塞并列缺项，不先写象征实现。",
            "真实实现：用户要求具体实现时，必须接入真实调用路径、真实配置、真实文件、真实命令或真实接口；禁止用 mock、stub、dummy、示例数据、空方法、只改状态的象征实现冒充完成。",
            "涉及真实外部系统的完整链路，必须按最早可观察边界逐级取证：调用入口 -> 操作实际提交 -> 生产者状态变化 -> 异步任务开始或结束 -> 原始响应 -> 本项目解析或持久化 -> 消费者显示；前一层未证实时，禁止修改后一层。",
            "自动操作第三方页面时，点击工具、切换模式、导航或其他可能重建页面的动作后，必须重新查询目标 DOM，再填写和提交；executeJavaScript、click 或事件派发成功只表示动作已执行，必须以生产者状态确实变化证明业务提交成功。",
            "缺少真实实现所需信息时暂停实现并列出缺项；涉及服务器、远端服务或账号能力时，缺少 IP、域名、端口、用户名、密码、token、密钥、路径、进程名、协议或启动命令中的任一必要项，都必须标记为阻塞，不写虚假实现。",
            "缺少真实信息时，只实现不依赖缺项且可验证的部分；依赖缺项的代码保持未实现或显式阻塞，不创建假配置、假返回、假进程控制或假网络调用。",
            "禁止用“逻辑跑通”替代真实可用；没有真实输入、真实副作用、真实返回或真实验证路径时，不能宣称已完成，只能说明当前是未接线、未验证或等待信息。",
            "归一化放置顺序：单点消费内联到当前消费点；同一视图或路由私有内容放在该视图或路由目录；业务状态、业务参数、状态提示、协议字段和多 action 共用逻辑放进已有切片仓库或业务对象；只有跨业务真实复用且没有既有业务边界时才创建新模块。",
            "能继承的类型不套娃；能由实际调用点自动推导的类型不手写、不导出。",
          ],
        },
        {
          title: "前端作用域",
          items: [
            "React 组件只负责渲染状态、绑定交互和触发仓库 action；禁止组件直接承载业务状态流转。",
            "React 项目必须使用 react-router-dom，并且必须存在 src/routers.tsx；禁止没有 routers.tsx 的单文件实现，禁止用自制 pathname 判断或条件渲染替代 React Router。",
            "src/routers.tsx 是唯一前端路由入口，只组合子路由、布局和共享挂载，并默认导出 router 或 routes 路由对象；无实际复用时直接 `export default createHashRouter([...])`，不要先定义 `const router` 再导出；禁止导出 `function Routers()` 这类组件式路由入口；视图逻辑进入对应路由目录，业务流转进入 zustand-store-style「前端仓库」。",
            "src/index.tsx 或 src/index.ts 只负责 createRoot、全局 Provider 和 RouterProvider 挂载；禁止在入口文件直接承载页面 JSX、业务状态、路由判断、页面切换逻辑、document.body/document.documentElement/rootElement 样式副作用。",
            "组件内只是简单派生数据或简单事件方法时，直接内联实现。",
            "组件内出现复用逻辑、局部流程或多个相关临时状态时，抽成组件附近的 useHook。",
            `复杂业务数据、长流程异步、订阅推送、流式返回和多 action 协作进入 ${nodes.zustandStoreStyle}「前端仓库」。`,
            "组件私有状态只保存纯 UI 临时态，例如弹窗开关、输入框草稿、hover、focus。",
            "百行以内组件只承载渲染、绑定交互和纯样式；复杂状态和方法进入主仓库对应私有方法或父级方法；禁止调用兄弟组件方法，出现兄弟方法依赖时提升状态到父级或主仓库。",
            "百行以上组件出现复杂派生形参时，收敛到组件私有 `useHook.ts`；私有 hook 禁止调用兄弟组件 hook，出现兄弟 hook 依赖时提升状态到父级或主仓库。",
            "组件私有 hook 的状态来源只能是自身作用域、主仓库对应私有方法或父级方法；禁止越过边界调用兄弟组件私有方法。",
            "组件拆分后保持默认导出风格；禁止为了私有组件使用 `export function Xxx` 或 `export const Xxx`。",
            "禁止为单调用点组件制造 props 透传；组件需要的数据优先在自身最小作用域读取仓库、hook 或上下文。",
            "单组件私有动作不要为了拆组件变成 props 传递；动作依赖的 hook/ref 应留在消费组件内，或移动到真正消费该动作的组件内。",
            `跨组件共享的按钮文案、接口标签、状态提示等显示名称必须在最小共同作用域归一；视图私有文案放视图目录或消费点，业务状态、请求和流式提示文案按 ${nodes.zustandStoreStyle} 放进切片仓库或业务对象。`,
            "React 中优先依赖组件 props、useMemo、useCallback、useAsyncFn、zustand store 等实际调用点推导类型。",
            "抽屉类交互优先使用项目统一的可调整尺寸 Drawer 组件；不要在页面里混用 antd 原生 Drawer 和本地临时实现。",
          ],
        },
        {
          title: "前端样式作用域",
          items: [
            "不要创建 CSS 文件.",
            "默认不写样式；只有用户明确要求、功能布局必需或修复明确视觉问题时才添加样式。",
            "路由入口不放视图样式；视图私有样式放对应路由目录，组件私有样式放组件内，第三方组件默认外观不改；页面需要修改 document.body、document.documentElement 或 rootElement 样式时，放对应页面组件 useEffect，并在卸载时恢复旧值。",
            "样式采用内联写法，遵守满足要求即可的写法，不猜测方式加多余样式。",
            "禁止为了视觉延续、统一观感、显得更好看或个人审美，擅自给 antd 等第三方组件添加背景、hover、padding、边框、阴影、颜色等样式。",
            "需要默认组件或等价实现时，保留组件默认外观；只连接必要数据、事件和状态。",
          ],
        },
        {
          title: "后端作用域",
          items: [
            "后端路由入口只负责读取请求、校验输入、调用业务对象或 store action、返回响应；复杂业务流程不要堆在 route handler 里。",
            "服务端模块按真实对象或真实子包建目录；只有被多个模块共同消费的对象才上提到更高目录。",
            "模块私有 schema、协议字段、派生值和辅助逻辑留在模块目录内；跨 route 共享的业务状态和动作收敛到同目录 store.ts。",
            "src/index.ts 是进程入口，src/routers.ts 是路由聚合入口；二者不是业务对象目录，不放业务 action、schema、缓存实例或页面专用工具。",
            "服务端约定 `src/runtime.ts` 是运行时配置，`src/routers.ts` 是路由汇总，`src/index.ts` 是入口；入口只启动运行时，不直接挂载业务模块、不手写子模块路径、不承载 Hono 业务接口。",
            "`src/routers.ts` 同时汇总业务 Hono router 和 Vite web 托管 router；业务模块目录的 `index.ts` 默认导出已经带 basePath 的完整 Hono router，routers.ts 统一 `.route(\"/\", xxxRouter)`。",
            "对象边界不是 class 形式要求，而是业务边界要求：状态、配置、缓存实例、schema、派生值和维护不变量的动作应收敛在同一个对象边界内。",
            "有状态实体优先封装为对象；状态字段、派生字段和维护不变量的方法必须收敛在同一个对象内。",
            "对象拥有的输入契约、schema、缓存和派生状态应一起收敛在对象内；禁止把单个对象私有的 schema 散落成文件级变量。",
            "禁止用外部过程函数通过传参修改对象状态，例如 `runtimePortSet(runtime.PORT + 1)`；应暴露 `runtime.portNext()`、`runtime.devInit()` 这类表达业务意图的对象方法。",
            "调用方不要读取对象内部状态后计算再写回；状态如何变化由对象方法负责，调用方只触发动作。",
            "能持久化的运行时实例应持久化，真正代表会话、上下文或记忆的对象按业务语义决定是否复用。",
            "是否有记忆由对象边界决定：client 可复用，thread、session、conversation 不复用则无记忆，复用则有记忆。",
            "不要把依赖 `this` 的实例方法裸返回；必须用闭包保持调用对象，例如 `prompt => thread.runStreamed(prompt)`。",
            "纯数据转换、无状态工具和单点逻辑不要为了面向对象强行造类；只有需要维护状态、不变量或多处行为协作时才使用对象。",
            `对象方法命名使用 ${nodes.variableStyle}。`,
          ],
        },
        {
          title: "个人 extends-* 工具库保护",
          items: [
            "识别到依赖名、workspace 路径或源码归属为 `extends-*` 时，先把它视为独立长期工具库；不得因为它与当前项目处于同一 workspace、可直接编辑或由当前项目唯一消费，就把它降级为业务私有代码。",
            "先只读核对工具库现有 exports、公开类型、调用契约和真实实现；当前调用不满足现有契约时返回 `Library Boundary Decision Required`，停止所有会改变工具库或消费项目结构、接口、参数和业务行为的写入。",
            "等待决策期间禁止新增文件、接口、类型、DTO、wrapper、adapter、compat 层或业务分支，禁止扩展参数、改变默认值、放宽类型、复制实现或在消费方重写同等逻辑；所谓最小改动、私有 helper 和临时兼容也不例外。",
            "“新增能力”建议必须说明能力应归属哪个工具库、拟新增的最小公开形态、为什么具有跨项目复用价值、现有消费者是否无感以及如何验证；没有跨项目复用价值时应明确建议不要进入工具库。",
            "“修改既有能力”建议必须指出目标接口、参数或行为的具体变化，说明兼容或 breaking 影响、已知消费点、迁移成本和验证范围；不得只用“更通用”概括影响。",
            "只有用户明确选择“新增”“修改”或“放弃/改需求”后才能继续；选择新增或修改只授权已说明的方案，不自动授权顺手整理其他工具库 API 或当前项目业务逻辑。",
            "依赖版本、peerDependencies、injected、lockfile 或解析路径问题若不改变公开 API 与业务语义，仍按下一节处理；诊断中一旦发现必须改变 API、参数或语义才能解决，立即停止并重新请求用户决策。",
          ],
        },
        {
          title: "pnpm 公共库与传递依赖冲突",
          items: [
            "本机 `F:/pro` 下存在多个独立 pnpm 根项目，它们会通过 `../extends-*` 共同消费相邻公共库；同一个公共库可能同时成为多个根 workspace 的成员。出现冲突时先确定当前发生问题的消费项目根，不把公共库目录现有的 node_modules 当作当前项目的可靠依赖环境。",
            "发现公共库与当前项目发生依赖、版本或类型冲突时，先在消费项目根执行 `pnpm why <包名> -r` 和 `pnpm list <包名> -r`，记录谁直接声明、谁经上游包引入、各处解析版本；禁止先修改业务泛型、复制框架类型或增加类型断言。",
            "先判断冲突依赖是否穿过公共库边界：公开参数、返回值、实例或导出类型包含 Hono router、Zustand StateCreator、React runtime/type、Vite plugin、TypeScript AST 等框架对象时，库和消费方必须共享兼容的依赖来源。",
            "穿过公共边界的框架依赖由消费项目决定具体运行版本；公共库使用 peerDependencies 声明兼容范围，并用 devDependencies 支持自身开发和类型检查，消费项目在 dependencies 中提供实际版本。",
            "完全留在公共库内部、没有类型或实例穿过边界的依赖由库自己的 dependencies 维护；不同库可以使用不同版本，不为了表面统一强制提升为 peer dependency。",
            "依赖里的依赖发生冲突时，先用 `pnpm why` 找到引入冲突版本的上游包并优先升级或调整上游；只有确认版本范围和运行行为兼容后才允许根项目使用 pnpm overrides 统一版本，版本明确不兼容时禁止强制覆盖。",
            "多个版本只有在类型、实例、全局状态和 singleton 都不跨包边界时才允许共存；Hono router、Zustand creator、React runtime 等对象跨边界时必须统一依赖来源，不能依靠 adapter、wrapper 或类型断言伪装兼容。",
            "相邻 `../extends-*` 公共库被多个 pnpm 根项目消费时，每个消费根都要独立检查 `injectWorkspacePackages` 或具体依赖的 injected 配置；配置属于消费项目，不依赖另一个根项目最后一次 pnpm install 碰巧留下的解析环境。",
            "package.json、lockfile 和 `pnpm why` 看起来一致但 TypeScript 仍报告同名类型不兼容，或错误路径同时出现两个 `F:/pro` 项目的 node_modules 时，才进一步从消费项目和公共库目录分别检查 `require.resolve`、realpath 与实际版本，确认是否仍从其他工作区解析。",
            "Hono router 不兼容、Zustand persist/immer mutator 不兼容和 setState producer 类型异常可能是同一个依赖来源冲突的不同下游表现；错误路径指向不同根项目时必须先解决依赖来源，禁止逐个修补这些泛型报错。",
            "禁止把 `as unknown as`、复制 Hono/Zustand 泛型、手改 node_modules、删除公共库 node_modules 或只统一 package.json 版本当作完成；这些操作没有证明消费方和公共库使用了稳定兼容的依赖环境。",
            "修复后必须从发生问题的消费项目根重新执行 `pnpm install`、`pnpm why/list -r` 和完整 typecheck/build；不能只以安装成功、单包类型检查或 package.json 版本一致判定完成。",
            "本机公共库修复还必须做交叉工作区复发验证：项目 A 验证通过后，在已纳入本次验证范围且同样消费该库的项目 B 执行 pnpm install，再不重装 A 直接返回运行 A 的 why/list 与完整 typecheck。A 再次失败说明依赖仍受最后安装的工作区影响，应升级为具体依赖 injected、构建产物、本地 tarball 或发布包隔离；未获授权操作项目 B 时必须明确保留该验证项，不能假装不会复发。",
          ],
          code: {
            language: "text",
            content: [
              "发现公共库冲突",
              "-> 在消费项目根运行 pnpm why/list，定位直接依赖和传递依赖",
              "-> 判断框架类型或实例是否穿过公共 API 边界",
              "   -> 穿过：peerDependencies + 消费项目具体版本",
              "   -> 不穿过：保留库内 dependencies，允许隔离多版本",
              "-> 传递依赖冲突：优先升级上游；确认兼容后才 overrides",
              "-> 多根 workspace 共同消费 ../extends-*：检查 injectWorkspacePackages / injected",
              "-> 常规信息一致仍报错：最后检查 require.resolve / realpath / 实际版本",
              "-> pnpm install -> why/list -> 完整 typecheck/build",
              "-> 到另一消费项目 install -> 不重装原项目 -> 回归 why/list 与 typecheck",
            ].join("\n"),
          },
        },
        {
          title: "导出边界",
          items: [
            "杜绝无外部调用的 export。",
            "页面、路由入口、私有组件文件默认使用 default export；只有跨文件实际共享的类型、schema、store 工厂、明确 API 才使用命名 export。",
            "禁止创建只包含 `export type ... from ...`、`export { ... } from ...` 或单纯转发 default 的文件；除非它是包级 public API 边界且有多个真实外部消费者。",
            "Hono 模块目录 index.ts 默认导出完整 router；store.ts 默认导出切片工厂；私有工具和私有类型不导出。",
            "lib 库导出只写最短 `exports`，不要写啰嗦的 `types/import` 配置。",
          ],
        },
      ],
    },
    [nodes.zustandStoreStyle]: {
      description: "涉及 zustand 主仓库、切片仓库工厂、store action、业务状态流转、流式状态或订阅推送时使用。",
      title: "Zustand Store 风格",
      sections: [
        {
          title: "分流规则",
          items: [
            "前端页面业务状态、请求状态、流式状态和组件触发 action 使用「前端仓库」+「Action」。",
            "后端跨路由状态、服务端切片、后台进度、流式事件和订阅推送使用「后端仓库」+「Action」。",
            "创建或调整主仓库使用「主仓库」；创建或调整切片工厂使用「切片工厂」。",
            "根成员命名、`${dir}` 和 `${dir}Actions` 边界使用「根成员」。",
            "变量命名叠加 variable-style；网络请求叠加 net-style；作用域、文案放置和导出边界叠加 scope-style。",
          ],
        },
        {
          title: "仓库模型",
          items: [
            "仓库由主仓库和切片仓库组成：主仓库负责组合和生命周期配置，切片仓库负责业务状态和 action。",
            "主仓库和切片仓库只通过切片工厂返回值合并；不要让主仓库反向了解切片内部实现。",
            "页面、路由和服务端跨文件调用只使用切片暴露的同目录根成员或 `${dir}Actions`。",
          ],
        },
        {
          title: "主仓库",
          items: [
            "主仓库只负责组合切片、配置 persist/immer、定义持久化和 rehydrate；不要在主仓库实现具体业务 action。",
            "主仓库不定义业务类型、业务常量、schema、工具函数或运行时对象；这些内容属于对应对象目录的切片仓库或对象边界。",
            "主仓库类型只表达切片并入关系；前端可用 `ReturnType<typeof createFile> & ReturnType<typeof createTpl>` 推导，服务端可按既有切片 `Store` 类型交叉并入。",
            "主仓库导入切片时只默认导入切片工厂；除项目既有服务端 `Store` 类型交叉并入外，不从切片导入私有类型、常量或工具函数。",
          ],
        },
        {
          title: "切片工厂",
          items: [
            "切片仓库使用 `immerStateCreator` 创建切片，并默认导出切片工厂。",
            "页面切片可写 `immerStateCreator<{ [sliceName]: Store }>(...)`，服务端切片可按既有 `{ dir, dirActions }` Store 边界声明。",
            "切片仓库私有类型在切片内部完成；除项目既有服务端 Store 类型外，不导出无外部消费的私有类型。",
            "切片一级根成员由同目录名和 `${dir}Actions` 组成；具体根成员命名和 action 边界按本 skill。",
          ],
        },
        {
          title: "前端仓库",
          items: [
            "前端页面业务状态、请求状态、流式状态、订阅推送和多 action 协作进入切片仓库。",
            "React 组件触发 action，action 负责请求、接收事件和写业务状态，组件只响应状态变化。",
            "页面切片优先使用单根成员承载状态和 action；复杂领域才按业务层级加深 actions 路径。",
            "路由所需形参和方法很多时，采用切片仓库合并后被主仓库引用的方式，不把大量路由参数堆进路由组件。",
            "遇到渲染所需的复杂的派生数据派生方法，采用增加文件名/useHook.ts风格，内部优先用useMemo，useRef,useCallBack,useAsyncFn实现组件专属hook,export default"
          ],
        },
        {
          title: "后端仓库",
          items: [
            "后端切片默认区分 `{ ${dir}, ${dir}Actions }`，数据、schema 配置放 `${dir}`，跨路由/跨文件调用的方法放 `${dir}Actions`。",
            "服务端跨文件调用只使用切片暴露的同目录根成员或 `${dir}Actions`，不越过仓库边界读写内部状态。",
            "后端长流程、订阅推送、流式事件和跨路由共享状态进入服务端仓库 action 或业务对象边界。",
          ],
        },
        {
          title: "根成员",
          items: [
            "切片数据根成员名必须与同目录名完全一致，例如 `chat/store.ts` 返回 `{ chat }`，`tpl/store.ts` 返回 `{ tpl }`，`file/store.ts` 返回 `{ file }`。",
            "切片跨文件方法根成员名使用同目录名加 `Actions`，例如 `chatActions`、`tplActions`；方法属于该根成员，不散落到主仓库或游离模块。",
            "页面简单切片可以把状态和 action 暂放同目录名根成员内；一旦需要区分数据和跨文件方法，按 `{ ${dir}, ${dir}Actions }` 收敛。",
            "服务端切片默认区分 `{ ${dir}, ${dir}Actions }`，数据、schema 配置放 `${dir}`，跨路由/跨文件调用的方法放 `${dir}Actions`。",
            "禁止用跨目录、功能前缀或长前缀命名根成员；根成员名只表达目录边界，不表达实现细节。",
            "跨文件使用的方法只能通过 `${dir}Actions` 或页面简单切片的同目录名根成员暴露；文件私有行为留在当前文件，不为了复用预先导出。",
            "action 很多时用对象路径加深度保持末端方法名短，例如 `agent.codexcli.chat()`、`llm.openai.config()`；不要为了避免冲突给方法加长前缀。",
            "页面切片优先使用单根成员承载状态和 action；服务端或复杂领域才按业务层级加深 actions 路径。",
          ],
        },
        {
          title: "Action",
          items: [
            "action 表达业务动作并与业务语义同名；不暴露 `stateGet`、`stateSet` 这类包一层的基础 API。",
            "仓库只暴露 React 会直接使用的状态和动作；内部工具、get 类方法留在 action 内部。",
            "所有对服务端发起请求、接收响应、处理错误、消费流式返回、订阅推送的逻辑都在仓库 action 内实现。",
            "页面交互按事件驱动状态实现：组件触发 action，仓库发起请求或接收事件，仓库更新状态，React 响应状态变化。",
            "同一类业务状态只能有一个写入口；多个来源影响同一状态时，先归一成事件，再在仓库 action 内处理。",
            "外部事件源、流式响应、订阅推送和后台进度统一进入仓库事件入口，并按事件增量更新状态。",
            "仓库里优先围绕状态变量组织动作：状态变量保持清晰，动作只表达状态如何变化。get() 读出的状态视为只读快照；写入必须进入 set() 的 immer draft；派生读取函数只返回派生值，禁止暗中修改 store。",
            `仓库 action、状态和路由层级命名使用 ${nodes.variableStyle}。`,
          ],
        },
        {
          title: "放置边界",
          items: [
            "业务参数、状态提示文案、协议字段、请求构造、流式状态和多个 action 共用的派生规则优先收敛在当前切片仓库或对应业务对象内；不要以没有位置为理由创建游离变量文件。",
            "纯视图私有文案不进入仓库，按 scope-style「前端作用域」放在消费点或视图目录。",
          ],
        },
        {
          title: "导出边界",
          items: [
            "私有仓库默认只保留一个 default export；不要把仓库文件写成常量、helper 和类型的工具模块。",
            "跨文件需要使用的行为通过切片根成员或 `${dir}Actions` 暴露，不通过额外命名导出暴露。",
            "不要为了主仓库拼接方便给切片工厂预设完整 AppStore 泛型；切片只描述自己的返回边界。",
          ],
        },
      ],
    },
    [nodes.netStyle]: {
      description: "处理 Hono 服务端接口、页面 API 调用、外部 HTTP、SSE、WebSocket 和同进程 Hono 调用时使用。统一网络边界、协议形态、状态入口和响应类型规则。",
      title: "网络调用风格",
      sections: [
        {
          title: "分流规则",
          items: [
            "前端页面请求本项目 Hono API 时按「前端网络 - 页面 API」规则。",
            "前端页面消费 SSE 或连接 WebSocket 时按「前端网络 - SSE/WebSocket」规则。",
            "后端实现 Hono 服务端接口时按「后端网络 - Hono API」规则。",
            "后端请求第三方或远端普通 HTTP API 时按「后端网络 - 外部 HTTP」规则。",
            "后端同进程复用 Hono 子路由时按「后端网络 - 同进程 Hono」规则。",
            "后端实现 SSE/WebSocket 或消费第三方 SSE/WebSocket 时按对应后端网络协议规则。",
            "纯业务逻辑复用优先仓库 action 或业务对象方法，不为复用请求形态绕过业务边界。",
          ],
        },
        {
          title: "后端网络 - Hono API",
          items: [
            "每个 Hono 模块目录的 index.ts 必须自己声明 `new Hono().basePath(\"/模块路径\")`，并默认导出完整 router。",
            "src/routers.ts 只导入各模块默认 router 并 `.route(\"/\", router)` 汇总；不要在 routers.ts 或 src/index.ts 手写模块内部路径。",
            "Vite web 项目托管到 Hono 时使用 web package.name 作为 basePath；不要手写 /admin、/user 这类与包名不一致的路径。",
            "所有 web 项目必须由 Hono 托管；托管根路径必须等于 web 项目的 package.name，例如 admin-web -> /admin-web、user-web -> /user-web。",
            "同一个 web 项目的 package.name、Hono 托管根路径、私有 API 根路径必须一致；私有 API 放在该 basePath 下的固定子路径，例如 /admin-web/api/...，禁止另建 /admin-api、/api/admin、/admin 这类不一致入口。",
            "web 项目的 package.name 必须是可直接作为 URL path segment 的非 scoped 名称；不接受 @scope/admin-web 这类不能直接等价为 basePath 的名称。",
            "同一个 web 项目的私有 API router 和 Vite 静态托管 router 使用同一个 basePath；API router 先挂载并使用 /basePath/api/... 子路径，Vite router 后挂载。",
            "Vite 静态托管 router 必须最后挂载，只处理静态资源和 SPA fallback；不得吞掉 API、SSE、WebSocket、POST、PUT、DELETE 等业务请求。",
            "src/routers.ts 挂载 Vite 项目时只读取 web 项目的 package.name 和项目 root；web 项目不暴露 host、port、origin、basePath 环境变量桥接；同一 Hono 进程托管多个 web 项目时，每个 Vite middleware 必须被 package basePath 硬隔离，只处理自己的 /package-name 和 /package-name/*，禁止第一个 SPA fallback 吞掉后续 web 项目。",
            "模块 router 的类型来自真实 Hono router；web 侧使用 `hc<typeof router>` 推导接口类型，禁止为 web 手搓 contract 或倒贴类型文件。",
            "路由路径按业务层级组织，避免把领域压扁成难读路径；路由和 action 层级命名使用 variable-style。",
            `handler 只负责读取请求、校验输入、调用业务对象或 store action、返回响应；复杂业务流程不要堆在 route handler 里，业务边界不存在时按 ${nodes.scopeStyle}「后端作用域」或 ${nodes.zustandStoreStyle}「后端仓库」建最小业务对象或 action。`,
            "服务端接口禁止 `ctx.json() as ...`；响应类型写在 `ctx.json<T>(...)` 的泛型参数里。",
            "普通无数据 JSON 响应写 `ctx.json(null, 200)`，无 body 响应用 `ctx.body(null, 204)`；流式、SSE 和 WebSocket 响应按对应协议规则。",
            "错误要明确 throw 或返回明确错误结构；禁止空 catch、静默兜底和隐藏失败原因的兼容逻辑。",
          ],
        },
        {
          title: "前端网络 - 页面 API",
          items: [
            "React 组件不直接请求服务端接口；页面交互触发 zustand action，action 负责请求和写业务状态。",
            `页面交互、组件职责和 UI 临时态使用 ${nodes.scopeStyle}「前端作用域」；业务状态流转使用 ${nodes.zustandStoreStyle}「前端仓库」。`,
            "页面请求本项目 Hono API 时优先使用项目统一的 Hono `hc` 客户端类型推导，不在组件里散写裸 `fetch`。",
            "页面 API 类型必须来自服务端真实导出的 Hono router 类型；不要在 web 项目或 contract 包里手写一份平行接口类型。",
            "web 项目被 Hono 托管后，前端不写 host、port、origin；API basePath 从 window.location.pathname 第一段读取，或在当前项目根路径内使用相对路径；window.location.pathname 只允许读取 Hono 托管 basePath，禁止用于前端页面路由判断、页面切换或条件渲染。",
            "同一个 web 项目的页面请求只访问该项目 basePath 下的私有 API，例如 /admin-web/api/...；禁止请求 /admin-api、/api/admin、硬编码 origin 或跨项目私有 API。",
            "页面不要直接请求第三方或远端 API；第三方 API 由服务端 Hono 接口封装，再由页面请求本项目 API。",
            "页面请求的 loading、error、data 等业务状态进入 store；组件只响应状态变化并触发 action。",
            "页面订阅 SSE 或 WebSocket 时，连接生命周期和消息处理进入 store action。",
          ],
        },
        {
          title: "后端网络 - 外部 HTTP",
          items: [
            "第三方或远端普通 HTTP API 使用 Hono `hc` 风格，禁止在业务代码里散写裸 `fetch`。",
            "第三方没有 Hono 类型时，创建最小 typed wrapper 模拟 hc 调用形态；响应类型在调用点内联，不为单点请求抽顶层 type/schema。",
            "分钟级或明确长耗时的外部异步任务，轮询间隔必须依据任务预期时长和第三方限流语义设置；禁止默认每秒轮询，任一时刻只保留一个进行中的轮询。",
            "429、503 等限流或临时故障必须在最小共同网络边界统一处理；优先遵守 Retry-After，否则使用有上限的退避和总超时，禁止直接判定为业务失败，也禁止各调用点重复实现重试。",
            "同进程 Hono 子路由复用不是外部 HTTP 调用，应使用 `app.request()`。",
            "单调用点响应类型内联写在临近 route 或 `ctx.json<T>(...)` 泛型里，禁止为了单点请求抽顶层 type/schema。",
            "服务端接口禁止 `ctx.json() as ...`；响应类型写进 `ctx.json<T>(...)` 泛型参数。",
          ],
        },
        {
          title: "后端网络 - 外部 HTTP 示例",
          code: {
            language: "ts",
            content: [
              "const route = new Hono().post(\"/chat/completions\", (ctx) => ctx.json<{",
              "  choices: { message?: { content?: string } }[];",
              "} | {",
              "  error: { code?: string; message: string; type?: string };",
              "}>({} as any));",
              "const response = await hc<typeof route>(\"https://api.example.com/v1\").chat.completions.$post({",
              "  json: input,",
              "});",
              "const body = await response.json();",
              "return ctx.json(body);",
            ].join("\n"),
          },
        },
        {
          title: "前端/后端网络 - SSE",
          items: [
            "SSE 不伪装成普通 JSON 请求；Hono 服务端按事件流输出，页面或服务端消费者使用 `EventSource` 或明确的流式 reader 消费。",
            "Hono 实现 SSE 接口时，route 只负责建立事件流、写事件和处理关闭；业务事件来源放在业务对象或 store action 边界内。",
            "SSE 数据进入仓库 action 的事件入口，由仓库按事件增量更新业务状态。",
            `SSE 数据写入业务状态时，前端使用 ${nodes.zustandStoreStyle}「前端仓库」，后端使用 ${nodes.zustandStoreStyle}「后端仓库」。`,
            "错误和关闭必须显式处理；至少关闭连接、清理订阅、释放 loading 或 streaming 状态、写入错误状态或错误事件，不要用空 catch 或静默兜底隐藏连接失败。",
          ],
        },
        {
          title: "前端网络 - SSE 示例",
          code: {
            language: "ts",
            content: [
              "const events = new EventSource(`${origin}/events`);",
              "events.addEventListener(\"message\", (event) => {",
              "  const data = JSON.parse(event.data) as { text: string };",
              "  messageReceive(data.text);",
              "});",
              "events.addEventListener(\"error\", () => {",
              "  events.close();",
              "});",
            ].join("\n"),
          },
        },
        {
          title: "前端/后端网络 - WebSocket",
          items: [
            "Hono 实现 WebSocket 接口时使用明确的 WebSocket 升级入口，不伪装成普通 HTTP JSON 接口。",
            "页面或服务端连接 WebSocket 时优先使用 Hono `hc` 的 `$ws()` 获取连接；第三方非 Hono WebSocket 按对方协议建立连接。",
            "WebSocket 消息进入仓库 action 的事件入口，由仓库分发到具体业务状态。",
            `WebSocket 消息写入业务状态时，前端使用 ${nodes.zustandStoreStyle}「前端仓库」，后端使用 ${nodes.zustandStoreStyle}「后端仓库」。`,
            "连接 open、message、error、close 行为必须显式表达，不写隐藏失败的兼容逻辑。",
          ],
        },
        {
          title: "前端/后端网络 - WebSocket 示例",
          code: {
            language: "ts",
            content: [
              "const route = new Hono().get(\"/ws\", upgradeWebSocket(() => ({",
              "  onMessage: () => undefined,",
              "})));",
              "const socket = hc<typeof route>(origin).ws.$ws();",
              "socket.addEventListener(\"open\", () => {",
              "  socket.send(JSON.stringify({ type: \"hello\" }));",
              "});",
              "socket.addEventListener(\"message\", (event) => {",
              "  const data = JSON.parse(String(event.data)) as { type: string };",
              "  messageReceive(data.type);",
              "});",
              "socket.addEventListener(\"error\", () => {",
              "  socket.close();",
              "});",
            ].join("\n"),
          },
        },
        {
          title: "后端网络 - 同进程 Hono",
          items: [
            "同进程 Hono 子路由复用优先 `app.request()`，不要绕到网络层。",
            "只在复用 HTTP 路由语义时使用同进程请求；纯业务逻辑复用优先仓库 action 或业务对象方法。",
            "响应透传时保持 `ctx.json<T>(...)` 类型约束，不使用 `ctx.json() as ...`。",
          ],
        },
        {
          title: "后端网络 - 同进程 Hono 示例",
          code: {
            language: "ts",
            content: [
              "const response = await codextplRouter.request(\"/tpl/source\");",
              "const body = await response.json();",
              "return ctx.json(body);",
            ].join("\n"),
          },
        },
      ],
    },
    [nodes.codebaseMcpStyle]: {
      description: "涉及代码库 MCP 选择、代码检索、调用关系、影响范围、仓库结构可视化和改代码前上下文获取时使用。",
      title: "代码库 MCP 使用风格",
      sections: [
        {
          title: "分流规则",
          items: [
            "默认使用 Codegraph 作为代码库主力 MCP；改代码前的源码定位、调用关系、调用路径和影响范围分析优先走 Codegraph。",
            "Graphifyy 不作为清晰源码地图主方案；用户要明确文件结构、具体方法、callers/callees 调用链时，优先使用 Codegraph 或 IDE 级源码阅读能力。",
            "Graphifyy 只作为项目级全局图谱体验工具；只在用户明确要看全局项目地图、模块关系、调用流图或可视化体验时触发。",
            "Graphifyy、RepoGraph 或其他图谱可视化工具只作为全局结构、模块关系和依赖地图的辅助，不作为日常改代码第一入口。",
            "安全审计、污点分析、跨函数数据流或漏洞路径分析才使用 codebadger、Joern CPG 这类安全/数据流工具。",
            "企业级多仓库全文搜索、跨仓库符号检索或代码平台级查询才考虑 Sourcegraph 类工具。",
          ],
        },
        {
          title: "加载和安装",
          items: [
            "Codegraph 由生成的 config.toml 的 mcpServers.codegraph 加载，命令为 npx @colbymchenry/codegraph serve --mcp；如果当前会话没有暴露 Codegraph 工具，说明 MCP 未加载或需要重启会话，不要假装已使用。",
            "Graphifyy 不是默认 MCP；CLI 缺失时使用 uv tool install graphifyy 安装，安装后会提供 graphify 和 graphify-mcp 命令。",
            "需要把 Graphifyy 作为 Codex skill 使用时，才执行 graphify install --platform codex；模板项目中不要手改 .codex 产物来安装 Graphifyy，应回到 source.ts 维护规则。",
          ],
        },
        {
          title: "Codegraph",
          items: [
            "遇到“这个函数怎么工作”“谁调用它”“改这里影响哪里”“从 A 怎么到 B”这类问题，先用 Codegraph 获取源码、调用路径和 blast radius。",
            "读取或编辑能命名的文件、函数、组件、store、route 或 action 前，先用 Codegraph 查询对应符号或路径。",
            "追踪流程时在一次 Codegraph 查询里同时写出关键端点名，例如入口 route、store action、渲染函数或目标方法。",
            "Codegraph 已返回的源码视为已读；不要为了重复确认再用普通 grep/read 走一遍，除非文件刚被编辑且索引明确提示过期。",
          ],
        },
        {
          title: "Graphifyy",
          items: [
            "用户说“项目地图”“可视化依赖关系”“调用关系图”“让我体验图谱”且接受全局图谱体验时，使用 Graphifyy 生成图谱，而不是只给文本说明。",
            "用户要求清晰源码地图、文件结构、具体方法、具体方法调用链、callers/callees 时，不把 Graphifyy 当主方案；改用 Codegraph 或建议 IDE call hierarchy。",
            "没有 LLM API key 且只需要源码结构时，优先运行 graphify . --code-only；需要文档、图片或语义抽取时，再按可用 API key 选择后端。",
            "常用可视化产物：graphify tree --graph graphify-out/graph.json --output graphify-out/GRAPH_TREE.html；graphify cluster-only . --no-label；graphify export callflow-html。",
            "生成后把 graphify-out/graph.html、graphify-out/GRAPH_TREE.html、graphify-out/*-callflow.html 作为用户可打开的体验入口说明清楚。",
          ],
        },
        {
          title: "验证边界",
          items: [
            "Codegraph 负责结构上下文，不替代真实验证；改完代码后仍用 TypeScript、测试、构建、接口响应或页面观察验证行为。",
            "rg 适合补充查找文本、配置、文档和 Codegraph 未覆盖内容；不要用 rg 重建 Codegraph 已经给出的调用关系。",
            "Graphifyy 只适合回答“仓库整体长什么样”“模块怎么连”“调用流如何可视化”的粗粒度问题；具体修改仍回到 Codegraph 和真实验证。",
          ],
        },
      ],
    },
    [nodes.checklistStyle]: {
      description: "涉及任务拆解、进度状态、阻塞同步和多阶段验证时使用。约束 checklist 触发条件、状态标记和完成表达。",
      title: "Checklist 任务状态",
      sections: [
        {
          title: "文本完整性验收",
          items: [
            "任务涉及中文、模板、规则、Markdown、配置、批量改写或整文件生成时，必须在动手前自动加入文本完整性 checklist，不等待用户额外提醒。",
            "写入前先列目标文件、允许变化的 section/行域和可信来源，再记录严格 UTF-8、BOM、替换字符、SHA-256、字节数、行数、语义锚点及 Git 状态；缺任一关键基线就标记 `[!]`。",
            "确认用户和其他进程没有同时编辑目标文件；基线后哈希、mtime 或 Git 状态变化时立即停止，重新建立基线后才能继续。",
            "高风险请求必须前置阻断：猜编码、批量转码、从终端乱码回写、无可信原文的整文件重建、用生成产物反向覆盖模板源，均不得执行。",
            "只有最小 patch、允许区域内 diff、语义锚点、解析器/schema 和严格编码检查全部通过，才可标记完成；意外大规模删改或无关 diff 必须标记 `[!]`。",
            "发生事故时先保留证据并寻找 Git、编辑器历史或会话日志中的最后可信版本；没有可信版本时保持阻塞，不得用 AI 记忆补写。",
          ],
        },
        {
          title: "抽象准入验收",
          items: [
            "逐个检查本轮新增定义；不能指出多个真实消费点，也不能说明其维护的独立状态、生命周期或不变量时，必须删除该定义并内联到真实消费点。",
          ],
        },
        {
          title: "对象边界验收",
          items: [
            "逐个对象确认 owner、生产者、生命周期、稳定 ID 与唯一切片仓库；任一项不明确时暂停实现。",
            "检查服务端对象目录、对象 store/action、对象路由、页面路由或功能目录是否保持一一对应或具有明确映射。",
            "逐个新增 action 核对当前真实调用点；没有当前需求和调用点的方法、类型、DTO 或兼容层一律删除，不为未来可能使用而保留。",
            "检查页面、路由、组件和 adapter 是否只消费 owner 能力，未凭展示字段、请求参数或局部状态新增对象语义。",
            "用户任务本身若要求跨越已确认的对象边界，将该项标记为 `[!]`，先向用户说明越界点、影响与正确归属；边界未修正前不写实现。",
          ],
        },
        {
          title: "触发规则",
          items: [
            "只要满足以下任一条件，必须自动拆 checklist：用户提问包含多个待解决点；预计会修改多个文件；属于批量改动；需要多阶段验证。",
            "触发 checklist 后，先列 checklist 再动手；执行中用户问进度、状态、做到哪了时，必须补充或同步当前 checklist 状态；用户说 todolist、todo list、任务清单或清单时按 checklist 标准执行，对外表达优先沿用用户说法。",
            "简单单点问答或单文件小改不强制使用 checklist。",
          ],
        },
        {
          title: "失败刹车",
          items: [
            "同一真实调用路径连续两次失败，或第二次仍不能明确失败边界时，必须停止重试和试探性 patch；列出每一层已证实与未证实事实，只允许在最早未证实边界增加最小诊断，禁止继续重复调用外部服务或修改下游实现。",
          ],
        },
        {
          title: "状态同步",
          items: [
            "checklist 只记录当前任务的关键目标、将修改的文件或阶段、必要验证项。",
            "触发 checklist 时，默认最后一项是“文档与源码对齐”；如果任务不涉及文档、公开说明或生成模板，同步状态时说明不需要文档变更。",
            "执行中按需同步 checklist 状态：`[ ]` 未开始，`[~]` 进行中，`[x]` 已完成，`[!]` 被阻塞。",
            "长任务每到一个已真实验证通过且可独立回退的里程碑，自动创建只包含该里程碑改动的 Git commit，并按 AGENTS.md「Git 自动执行权限」同步当前分支和有价值的 tag；不再为 commit、push、tag 等当前分支操作单独请求确认。",
            "只有 checklist 目标项都处理完并完成必要验证后，才使用“完成了”“已处理完”等收工表达；阻塞时明确卡在哪项和下一步需要什么。",
          ],
        },
        {
          title: "收尾检查",
          items: [
            "每轮工作收尾前必须检查本轮是否有被用户打断、中途暴露、计划中列出但未完成的事项。",
            "未完成事项能继续处理就继续处理；不能处理时记录到根目录 TODO.md，并写清阻塞原因、下一步动作和相关文件。",
            "用户批评实现虚假、不是用户习惯、过度工程化、单点调用、先猜测复用或不符合 .codex 时，先定位当前模板应修改的位置：`F:\\\\pro\\\\extends-codex\\\\honoapp\\\\src\\\\tpl\\\\source.ts` 的 agentsMd、对应 skill 名、section 标题；给出应新增或改写的具体规则，再继续修正当前代码。",
            "被批评后禁止只解释原因或只道歉；必须输出“应补约束位置 + 具体约束文本 + 当前代码修正动作”。",
            "收尾回复必须标注实现状态：已真实接线并验证、已接线未验证、未接线等待信息、被阻塞；禁止把未验证或未接线内容表述为完成。",
            "临时诊断 route、helper、日志和详细响应在创建时必须同时标记退出条件；事实确认后立即删除，除非能指出长期真实消费点，禁止以调试可能有用为由永久保留。",
            "如果项目已有明确 TODO 文件或任务规范，沿用既有规范；没有时使用根目录 TODO.md，不把未完成事项散落在回复里。",
          ],
        },
      ],
    },
    [nodes.docStyle]: {
      description: "编写 README、项目说明和公开结构说明时使用。约束项目功能、快速使用、tree 风格结构和公开入口能力说明。",
      title: "文档写作风格",
      sections: [
        {
          title: "README",
          orderedItems: [
            "第一段写项目功能和快速使用方法。先用简短自然语言说明项目解决什么问题、主要提供什么能力、适合什么场景；再给出最短可运行的使用命令、入口或调用方式。第一段不写长篇背景，不把实现细节放在使用方法前面。",
            "第二段写项目结构，并保持当前 README 的带连线 tree 风格。tree 先展示源码结构，再在关键文件节点下展开公开的主要方法、命令、接口或配置子节点；文件注释只概括该文件边界，具体能力写在子节点。内部临时文件、构建产物和没有公开能力的实现细节不进入 tree。",
          ],
        },
        {
          title: "tree 格式",
          items: [
            "项目结构必须写成 Markdown fenced code block 内的带连线 tree；必须使用 `├──`、`└──`、`│` 表达层级和同级关系。",
            "tree 必须按 `目录/文件 -> 对外方法/命令/接口/配置 -> 具体职责` 组织；清晰表达对象可以被怎样操作，不写散文式职责说明。",
            "禁止用普通缩进、无连线列表、Markdown `-` 列表或纯路径清单替代 tree；如果没有连线字符，视为没有遵守 doc-styleskill。",
            "目录节点以 `/` 结尾；文件节点写文件名和边界职责；文件下的公开方法、命令、接口或配置项继续作为子节点展开。",
            "同级节点必须保持纵向连线对齐；最后一个同级节点使用 `└──`，非最后一个同级节点使用 `├──`。",
          ],
          code: {
            language: "text",
            content: [
              "src/",
              "├── index.ts                 # 入口，只负责启动和组合",
              "├── routers.ts               # 路由汇总",
              "└── tpl/",
              "    ├── source.ts            # 模板源",
              "    │   ├── nodes            # 生成产物共享常量",
              "    │   └── tpl              # .codex 生成模板",
              "    └── store.ts             # 模板渲染",
              "        ├── codexRender()    # 调用../tpl/source.nodes渲染 .codex 文件集合",
              "        └── skillRender()    # 渲染单个 skill",
            ].join("\n"),
          },
        },
        {
          title: "结构说明",
          items: [
            "tree 以源码目录和文件为骨架，只展开关键公开入口；不要把普通实现细节、私有 helper 或调用过程写进 tree。",
            "对象目录名称本身就是边界；文档和代码都应围绕对象目录说明可调用方法和职责，避免重复解释已经由目录名表达的概念。",
            "文件节点只写边界职责；文件下的子节点写公开的主要方法、命令、接口或配置项，并说明它直接提供的能力。",
            "能力提供方只写提供什么，不写哪里消费了它；消费方如果依赖其他公开能力，才在自身子节点说明消费链路。",
            "子节点保持少量、主要、可维护；同类方法过多时合并为能力组，不把 README 写成完整 API 清单。",
          ],
        },
      ],
    },
    [nodes.fileIo]: {
      description: "读写仓库文件时使用。以前置准入、稳定基线、最小 patch 和语义完整性为主，写后检查与事故恢复只作兜底。",
      title: "文件读写规范",
      sections: [
        {
          title: "风险模型",
          items: [
            "编码正确与内容正确是两件事：乱码文本可以再次编码成严格合法的 UTF-8，无 BOM 和无 `U+FFFD` 都不能证明中文语义未损坏。",
            "最高风险链路是错误解码后整文件回写，例如 `Get-Content` 读取中文后交给 `Set-Content`；写入编码显式也无法修复读取阶段已经发生的损坏。",
            "终端字体、代码页和输出截断会制造假乱码或隐藏真实乱码；终端显示只能用于定位，不能作为内容真实性证据。",
            "模板、规则和长文件一旦整文件覆盖，语法检查可能仍通过但大量语义已经丢失；必须同时保护结构、锚点、规模和可信来源。",
          ],
        },
        {
          title: "修改前准入与基线",
          items: [
            "开始前明确目标文件、允许变化的 section/行域、预计增删规模和权威内容来源；未声明范围不得写入。",
            "记录目标文件 SHA-256、字节数、行数、严格 UTF-8 解码结果、BOM、替换字符、关键语义锚点、Git 状态与已有 diff；脏工作区以当前内容为用户基线，不得擅自还原。",
            "目标文件已乱码、严格 UTF-8 解码失败、关键锚点缺失、内容来源不明或读取结果被工具截断时，立即返回 `Text Integrity Check Failed`，禁止继续功能修改。",
            "用户必须在 AI 修改期间停止编辑同一目标文件；若文件哈希、mtime 或 Git 状态在基线后变化，AI 必须停止并告知基线失效，不能自动合并或覆盖。",
            "用户若要求跳过基线、猜编码、批量转码、从截图/终端乱码恢复、无可信来源整文件重写，AI 必须拒绝并要求提供 Git、编辑器历史或确认无误的原文。",
            "整文件重写只允许生成器输出或用户明确要求且存在完整权威源；写入前必须证明源内容未截断，并能在写后逐字或结构化对比。",
          ],
          code: {
            language: "powershell",
            content: [
              "node -e \"const fs=require('fs'),c=require('crypto'),{TextDecoder}=require('util');const b=fs.readFileSync(process.argv[1]);let valid=true;try{new TextDecoder('utf-8',{fatal:true}).decode(b)}catch{valid=false}const s=b.toString('utf8');console.log({bytes:b.length,lines:s.split(String.fromCharCode(10)).length,sha256:c.createHash('sha256').update(b).digest('hex'),utf8Valid:valid,bom:b.subarray(0,3).toString('hex')==='efbbbf',replacement:s.includes(String.fromCharCode(0xfffd))})\" $path",
              "git status --short -- $path",
              "git diff --numstat -- $path",
            ].join("\n"),
          },
        },
        {
          title: "安全读取",
          items: [
            "先用 `rg` 定位文件和锚点，再使用 Node `fs.readFileSync(path, \"utf8\")` 读取真实文件；严格有效性另用 `TextDecoder(\"utf-8\", { fatal: true })` 检查。",
            "包含非 ASCII 内容的规则、模板、Markdown、配置和源码禁止使用 PowerShell `Get-Content` 作为内容来源，即使显式指定 `-Encoding UTF8` 也不进入回写链路。",
            "禁止把终端打印结果、工具截断输出、截图 OCR、聊天复制文本或经过未知代码页的字符串作为整文件源。",
            "读取结果与 Git、编辑器或用户确认的语义锚点不一致时，按损坏处理，不尝试猜测哪一种编码能变回原文。",
          ],
        },
        {
          title: "安全写入",
          items: [
            "仓库文本人工修改只使用 `apply_patch`，并限制在基线声明的最小区域；patch 上下文不匹配时停止，不升级为整文件覆盖。",
            "禁止使用 `Set-Content`、`Out-File`、重定向、管道、字符串拼接脚本或跨 shell 转发来改写仓库文本；格式化器和受控生成器除外，但必须有真实入口和验证。",
            "禁止任何读取命令的输出直接进入写入命令；读取、判断、修改必须是三个可审计步骤。",
            "禁止为了修乱码执行自动转码、重复编码/解码试验或批量替换常见乱码字符；没有权威原文时保持阻塞。",
            "模板只改唯一源文件，生成产物通过真实生成器刷新；不得直接修补生成产物后反向覆盖源文件。",
            "没有放权时只能修改用户指定范围；删除非本轮创建的文件仍需确认。截图和调试日志只写根目录 `.log/`。",
          ],
        },
        {
          title: "写后验证（兜底）",
          items: [
            "重新执行严格 UTF-8、BOM、替换字符、SHA-256、字节数、行数和语义锚点检查，并确认目标未在写入期间被其他进程改变。",
            "运行 `git diff --check`、`git diff --numstat` 和限定文件 diff；局部改动出现整文件变化、意外大规模删除或无关区域变化时立即失败。",
            "模板、规则、配置和代码还必须运行其真实 parser、schema、类型检查或生成器；仅语法通过不能证明语义完整。",
            "写后检查只能发现漏网问题，不能为高风险读取或整文件写入提供事后免责。",
          ],
        },
        {
          title: "事故恢复（最后手段）",
          items: [
            "一旦怀疑乱码或异常删减，立刻停止所有写入和转码，返回 `Text Integrity Check Failed`；先记录当前哈希、大小、行数、Git diff 和时间戳。",
            "按 Git 提交/对象、VS Code Timeline/Local History、会话日志、用户确认原文的顺序寻找最后可信版本；终端乱码输出不是可信版本。",
            "恢复时以完整可信版本为主体，只重放经过确认的最小 patch；禁止从 AI 记忆写一个更短的“干净版本”替换原文件。",
            "恢复后必须证明主体与可信版本逐字一致或只有预期 diff，再运行编码、锚点、schema 和生成验证；无法证明时保持阻塞并请求用户决定。",
          ],
        },
      ],
    },
  },
};
export default class TplGlobal {
  private readonly source = source;

  sync() {
    const configPath = join(process.env.CODEX_HOME ?? join(homedir(), ".codex"), "config.toml");
    const config = existsSync(configPath) ? readFileSync(configPath, "utf8") : "";
    const newline = config.includes("\r\n") ? "\r\n" : "\n";
    const lines = config.split(/\r?\n/);
    const tableStart = lines.findIndex(line => line.trim() === "[shell_environment_policy]");
    const policy = this.source.configToml.shellEnvironmentPolicy;

    if (tableStart === -1) {
      const separator = config && !config.endsWith("\n") ? newline : "";
      const prefix = config && config.trim() ? newline : "";
      const content = [
        "[shell_environment_policy]",
        `inherit = ${JSON.stringify(policy.inherit)}`,
        `exclude = ${JSON.stringify(policy.exclude)}`,
        "",
      ].join(newline);
      mkdirSync(dirname(configPath), { recursive: true });
      writeFileSync(configPath, `${config}${separator}${prefix}${content}`, "utf8");
      return;
    }

    const tableEndOffset = lines.slice(tableStart + 1).findIndex(line => /^\s*\[/.test(line));
    const tableEnd = tableEndOffset === -1 ? lines.length : tableStart + 1 + tableEndOffset;
    const inheritIndex = lines.slice(tableStart + 1, tableEnd)
      .findIndex(line => /^\s*inherit\s*=/.test(line));
    const inheritLine = `inherit = ${JSON.stringify(policy.inherit)}`;

    if (inheritIndex === -1) {
      lines.splice(tableStart + 1, 0, inheritLine);
    } else {
      lines[tableStart + 1 + inheritIndex] = inheritLine;
    }

    const currentTableEnd = tableEnd + (inheritIndex === -1 ? 1 : 0);
    const currentExcludeIndex = lines.slice(tableStart + 1, currentTableEnd)
      .findIndex(line => /^\s*exclude\s*=/.test(line));
    if (currentExcludeIndex === -1) {
      lines.splice(tableStart + 2, 0, `exclude = ${JSON.stringify(policy.exclude)}`);
    } else {
      const lineIndex = tableStart + 1 + currentExcludeIndex;
      const existing = [...lines[lineIndex]!.matchAll(/"((?:\\.|[^"\\])*)"/g)]
        .map(match => JSON.parse(`"${match[1]}"`) as string);
      lines[lineIndex] = `exclude = ${JSON.stringify([...new Set([...existing, ...policy.exclude])])}`;
    }

    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, lines.join(newline), "utf8");
  }
}
