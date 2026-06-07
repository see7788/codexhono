import { z } from "zod";

const commandHookSchema = z.object({
  type: z.literal("command"),
  command: z.string().min(1),
  timeout: z.number().int().positive(),
});
const markdownCodeSchema = z.object({
  language: z.string().min(1),
  content: z.string().min(1),
});
const sectionBaseSchema = z.object({
  title: z.string().min(1).optional(),
  text: z.string().min(1).optional(),
  items: z.array(z.string().min(1)).optional(),
  orderedItems: z.array(z.string().min(1)).optional(),
  code: markdownCodeSchema.optional(),
});
const sectionContentRefine = (section: z.infer<typeof sectionBaseSchema>, ctx: z.RefinementCtx) => {
  if (!section.text && !section.items?.length && !section.orderedItems?.length && !section.code) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "section must contain text, items, orderedItems, or code",
    });
  }
};
const sectionSchema = sectionBaseSchema.superRefine(sectionContentRefine);
const skillSchema = z.object({
  description: z.string().min(1),
  title: z.string().min(1),
  intro: z.string().min(1).optional(),
  sections: z.array(sectionBaseSchema.extend({
    title: z.string().min(1),
  }).superRefine(sectionContentRefine)).min(1),
});
export const tplSchema = z.object({
  nodes: z.record(z.string().min(1), z.union([z.string().min(1), z.number().finite()])),
  agentsMd: z.object({
    sections: z.array(sectionSchema).min(1),
  }),
  configToml: z.object({
    developerInstructions: z.array(z.string().min(1)).min(1).optional(),
    features: z.object({
      hooks: z.boolean(),
    }),
    hooks: z.object({
      UserPromptSubmit: z.array(commandHookSchema),
      Stop: z.array(commandHookSchema),
    }),
  }).superRefine((configToml, ctx) => {
    if (!configToml.features.hooks) {
      return;
    }
    if (!configToml.hooks.UserPromptSubmit.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hooks", "UserPromptSubmit"],
        message: "UserPromptSubmit hooks must not be empty when hooks are enabled",
      });
    }
    if (!configToml.hooks.Stop.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hooks", "Stop"],
        message: "Stop hooks must not be empty when hooks are enabled",
      });
    }
  }),
  skills: z.record(
    z.string().min(1).regex(/^[^/\\]+$/),
    skillSchema),
});
export type Tpl = z.infer<typeof tplSchema>
const nodes = {
  HOOK_USER_COMMAND: "HOOK_USER_COMMAND",
  HOOK_ASSISTANT_COMMAND: "HOOK_ASSISTANT_COMMAND",
  HOSTNAME: "HONOCODEX_HOSTNAME",
  PORT: "HONOCODEX_PORT",
  ORIGIN: "HONOCODEX_ORIGIN",
  fileIo: "file-io-styleskill",
  netStyle: "net-styleskill",
  scopeStyle: "scope-styleskill",
  variableStyle: "variable-styleskill",
  zustandStoreStyle: "zustand-store-styleskill",
} as const
const tpl: Tpl = {
  nodes,
  agentsMd: {
    sections: [
      {
        title: "总纲",
        items: [
          "TypeScript 优先；React、Hono、antd、Vite、zustand、immer 优先。",
          "默认不改动：用户没有明确要求的行为、样式、布局、文案、文件和抽象都保持原样；判断是否属于用户目标时，先按运行侧和横切域组合选择 skill。",
          "场景判断采用组合模型：先判断运行侧（前端或后端），再叠加横切域（仓库、网络、变量/命名、作用域）。横切域必须放在前端或后端语境下解释。",
          `引用 skill 时尽量指向章节标题，例如 ${nodes.netStyle}「前端网络 - 页面 API」、${nodes.zustandStoreStyle}「前端仓库」、${nodes.variableStyle}「前端变量」、${nodes.scopeStyle}「前端作用域」。`,
          `读写仓库文件时使用 ${nodes.fileIo} skill；所有文件必须是 UTF-8 无 BOM。`,
          "出现 bug、报错、服务不可达、页面异常或行为不符合预期时，先最小复现、收集证据并定位责任边界，再修改代码。",
          "总纲只负责前端/后端分流和横切域组合；具体实现规则进入对应 skill 的前端或后端章节。",
        ]
      },
      {
        title: "服务端",
        items: [
          `后端分流：Hono API、外部 HTTP、SSE、WebSocket 和同进程 Hono 调用使用 ${nodes.netStyle}；服务端 store/action 和业务状态流转使用 ${nodes.zustandStoreStyle}；对象边界、复用、导出和作用域使用 ${nodes.scopeStyle}；变量、路由和方法命名使用 ${nodes.variableStyle}。`,
        ]
      },
      {
        title: "web端",
        items: [
          `前端分流：组件结构、页面交互、样式和组件拆分使用 ${nodes.scopeStyle}；页面状态、store、action 和流式状态使用 ${nodes.zustandStoreStyle}；页面 API、SSE 和 WebSocket 使用 ${nodes.netStyle}；变量、形参和方法命名使用 ${nodes.variableStyle}。`,
        ],
        orderedItems: [
          `用 Chrome DevTools MCP 访问${nodes.ORIGIN}（host=${nodes.HOSTNAME}，port=${nodes.PORT}）`,
          "服务不可达时在pnpm 根目录执行`pnpm restart`,不要在子项目内执行pnpm",
        ],
      },
    ],
  },
  configToml: {
    features: {
      hooks: true,
    },
    hooks: {
      UserPromptSubmit: [
        {
          type: "command",
          command: nodes.HOOK_USER_COMMAND,
          timeout: 10,
        },
      ],
      Stop: [
        {
          type: "command",
          command: nodes.HOOK_ASSISTANT_COMMAND,
          timeout: 10,
        },
      ],
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
            "禁止为了包一层、传一遍或制造统一形式创建无复用形参。",
            "形参名使用调用方能理解的业务名，不用 `param`、`args`、`payload` 兜所有场景；事件对象、库回调等约定俗成名称除外。",
            "布尔值命名表达判断语义，例如 `isReady`、`hasError`、`canSubmit`；不要用需要反向理解的含糊名称。",
            "数组和集合命名表达元素领域，例如 `messages`、`skillDirs`；不要只写 `list`。",
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
      description: "涉及前端组件作用域、后端业务对象边界、复用归一化、拆分、导出和样式放置时使用。约束最小作用域、真实复用后抽象和前后端边界。",
      title: "作用域风格",
      sections: [
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
            "最小作用域、形参最小化：单点逻辑直接读当前作用域；真实复用后，才把差异提升为形参。",
            "复用归一化：真实重复才在最小共同作用域归一；禁止为了预判复用提前抽象。",
            "禁止创建只有一个变量、一个常量对象、一个短文案表、一个 re-export 或一对一 wrapper 的文件；这类文件属于虚假抽象，应内联到真实消费处或放在已有最小共同作用域。",
            "归一化放置顺序：单点消费内联到当前消费点；同一视图或路由私有内容放在该视图或路由目录；业务状态、业务参数、状态提示、协议字段和多 action 共用逻辑放进已有切片仓库或业务对象；只有跨业务真实复用且没有既有业务边界时才创建新模块。",
            "禁止无复用形参，禁止一对一 wrapper helper；命名使用 variable-style。",
            "能继承的类型不套娃；能由实际调用点自动推导的类型不手写、不导出。",
          ],
        },
        {
          title: "前端作用域",
          items: [
            "React 组件只负责渲染状态、绑定交互和触发仓库 action；禁止组件直接承载业务状态流转。",
            "路由入口只组合子路由、布局和共享挂载；视图逻辑进入对应路由目录，业务流转进入 zustand-store-style「前端仓库」。",
            "组件内只是简单派生数据或简单事件方法时，直接内联实现。",
            "组件内出现复用逻辑、局部流程或多个相关临时状态时，抽成组件附近的 useHook。",
            `复杂业务数据、长流程异步、订阅推送、流式返回和多 action 协作进入 ${nodes.zustandStoreStyle}「前端仓库」。`,
            "组件私有状态只保存纯 UI 临时态，例如弹窗开关、输入框草稿、hover、focus。",
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
            "路由入口不放视图样式；视图私有样式放对应路由目录，组件私有样式放组件内，第三方组件默认外观不改。",
            "样式采用内联写法，遵守满足要求即可的写法，不猜测方式加多余样式。",
            "禁止为了视觉延续、统一观感、显得更好看或个人审美，擅自给 antd 等第三方组件添加背景、hover、padding、边框、阴影、颜色等样式。",
            "用户要求默认组件或等价实现时，保留组件默认外观；只连接必要数据、事件和状态。",
          ],
        },
        {
          title: "后端作用域",
          items: [
            "后端路由入口只负责读取请求、校验输入、调用业务对象或 store action、返回响应；复杂业务流程不要堆在 route handler 里。",
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
          title: "导出边界",
          items: [
            "杜绝无外部调用的 export。",
            "页面、路由入口、私有组件文件默认使用 default export；只有跨文件实际共享的类型、schema、store 工厂、明确 API 才使用命名 export。",
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
            "仓库里优先围绕状态变量组织动作：状态变量保持清晰，动作只表达状态如何变化。",
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
    [nodes.fileIo]: {
      description: "读写仓库文件时使用。统一处理中文读取、apply_patch 写入、UTF-8 无 BOM、乱码判断和写后复查。",
      title: "文件读写规范",
      sections: [
        {
          title: "规则",
          items: [
            "没有放权时只能读写当前文件、读其他文件。",
            "ai截图、调试日志等临时文件，必须输出到根目录`.log/`下",
            "删除非你创建的文件必须问用户；创建文件前必须告诉用户，用户要求创建或拆分的不要重复询问。移动文件按创建加删除处理，必须说明来源和目标；删除不属于本次目标或非自己创建的文件前仍确认。",
            "所有仓库文件必须是 UTF-8 无 BOM。",
            "读取包含中文的规则、模板、Markdown 或配置文件时，先用 `rg` 定位，再用 Node `fs.readFileSync(path, \"utf8\")` 读取；不要用 PowerShell `Get-Content` 判断中文内容或编码。",
            "人工编辑优先用 `apply_patch`；确需脚本写入时必须显式 UTF-8 无 BOM。",
            "UTF-8 与 UTF-8 无 BOM 只差文件前三字节是否为 `EF BB BF`；若终端乱码，立即用 Node 检查 `bom` 和 `replacement`，确认后不要重复试错。",
            "只处理当前任务涉及的文件，不顺手批量改无关文件。",
          ],
        },
        {
          title: "读取和复查",
          code: {
            language: "powershell",
            content: [
              "node -e \"const fs=require('fs'); const b=fs.readFileSync(process.argv[1]); const text=b.toString('utf8'); console.log({ bom:b[0]===0xef&&b[1]===0xbb&&b[2]===0xbf, replacement:text.includes('\\\\uFFFD') }); console.log(text.slice(0,2000))\" $path",
            ].join("\n"),
          },
        },
        {
          title: "脚本写入",
          code: {
            language: "powershell",
            content: [
              "$encoding = [System.Text.UTF8Encoding]::new($false)",
              "[System.IO.File]::WriteAllText($path, $text, $encoding)",
            ].join("\n"),
          },
        },
      ],
    },
  },
};
export default tpl
