## 总纲

- TypeScript 优先；React、Hono、antd、Vite、zustand、immer 优先。
- 读写仓库文件时使用 file-io-styleskill skill；所有文件必须是 UTF-8 无 BOM。
- 先按运行侧和任务类型选择 skill；agentsMd 只保留任务分流、全局禁止项、全局阻塞项和跨 skill 优先级；能归入具体 skill 的实现细则必须写入对应 skill 的对应 section。
- 新增 agentsMd 规则前必须先判定：回答“什么时候启用哪个 skill”的放入 agentsMd；回答“启用后怎么做”的放入对应 skill；只扩展关键词、同义词或场景举例时合并到已有触发条件，禁止新增孤立条目。
- agentsMd 的 skill 路由只写“触发条件 + 目标 skill + 全局硬要求”；禁止在 agentsMd 展开完整流程、示例清单、局部命名规范、局部验证步骤或业务实现判断。
- 默认最小实现、内联优先、形参最小化；先实现后抽象；不要先猜测未来复用，不要预定义一堆常量、类型、helper、配置、壳文件。
- 任务拆解、进度状态和多阶段验证使用 checklist-styleskill；用户说 todolist、todo list、任务清单或清单时按 checklist 标准执行，状态标记使用 [ ]、[~]、[x]、[!]。
- 出现 bug、报错、服务不可达、页面异常或行为不符合预期时，先按已有 skill 判断；缺少必要规则导致无法稳定决策时，暂停处理并说明缺少哪类 skill。
- 遇到 TypeScript 类型错误时，禁止优先使用 `as`、`unknown as`、`any`、`skipLibCheck` 或假泛型压制错误；必须先用项目 tsconfig 复现，再检查依赖版本、workspace link、exports、paths、peerDependencies 和 TypeScript moduleResolution。
- VSCode 红线与 CLI 类型检查不一致时，不得直接归因为缓存；必须先完成可复现的解析链路排查，确认项目级 `tsc --noEmit`、必要时使用 `--traceResolution` 后，才说明 TS Server 缓存可能。

## 场景分流

- 先判断运行侧：React 页面使用前端章节，Hono/Electron main/Node 进程使用后端章节；横切域必须放在具体运行侧语境下解释。
- 代码库检索、调用关系、影响范围和代码库 MCP 选择使用 codebase-mcp-styleskill。
- 组件结构、页面交互、对象边界、复用、导出和作用域使用 scope-styleskill。
- Hono API、页面 API、外部 HTTP、SSE、WebSocket 和同进程 Hono 调用使用 net-styleskill。
- 前端/后端 store、action、业务状态流转、流式状态和订阅推送使用 zustand-store-styleskill。
- 变量、形参、对象方法、store action 和路由层级命名使用 variable-styleskill。
- README、项目说明和公开结构说明使用 doc-styleskill。
- 用户要求规则复盘、模板规则补丁、通用 AI 行为约束、合并到 source.ts 时进入模板规则复盘模式：用户只要求复盘或建议时只输出可合并到模板源的通用规则建议，不转入当前业务项目实现；用户明确要求修改模板源时，按规则落点修改 source.ts。
- 维护由模板生成的 .codex 规则时只修改 source.ts 等模板源；禁止建议直接修改 .codex 生成产物，除非用户明确要求临时修改生成结果。

## 运行约定

1. src/runtime.ts 是运行时配置，src/routers.ts 是路由汇总，src/index.ts 是入口；src/index.ts 只负责启动运行时。
2. pnpm workspace 项目的 dev、build、typecheck 和其他 scripts 命令入口必须统一定义在根 package.json；所有子项目 package.json 必须省略 scripts，除非用户明确要求该子项目作为独立包运行。该规则只约束 scripts，不禁止根 package.json 暴露真实 bin。
3. 开发 CLI 或工具包自身时，根 dev 必须通过 pnpm 直接运行该仓库的真实源码入口；禁止调用当前包发布后才提供的自身 bin。自身 bin 只用于下游项目或安装后的使用场景。
4. package.json 的 `type` 必须按运行产物决定：web 包、纯 TS lib 包和不直接被 Electron/Node 加载构建产物的根包默认使用 `"type": "module"`；禁止只为统一外观给所有包机械添加。
5. Electron main/preload、Node CLI、带 `main` 指向 out/*.js 的运行包，只有确认构建产物是 ESM 且 `__dirname`、`require`、CommonJS 入口等运行语义已同步迁移后，才允许添加 `"type": "module"`；否则保持 package 作用域默认 CommonJS 或改用 .cjs/.mjs 明确后缀。
6. 禁止为子项目随手增加无实际入口使用的 vite.config.ts、配置包、环境变量桥接文件、compat/adapter 或兼容套壳；web 子项目只有被真实运行入口直接消费时才允许新增 vite.config.ts、basePath 配置、host/port/origin 环境变量或 adapter/compat bridge；Hono 统一托管时路径来源回到 package.name 和 Hono 托管逻辑。
7. 重启 extends-codex 使用 `pnpm dlx github:see7788/extends-codex restart`。
8. 遇到可观察浏览器、查看上下文、页面观察等要求时，先检查 dev 命令是否带上 extends-codex；pnpm 项目必须在根 package.json 定义 dev 命令。
9. dev 未带上 extends-codex 时暂停处理，给出 dev 命令补全写法；等待 dev 重启并生成新的 .codex 后再继续。
10. dev 已带上 extends-codex 时，Chrome DevTools MCP 访问 HONOCODEX_ORIGIN（host=HONOCODEX_HOSTNAME，port=HONOCODEX_PORT）。
11. TypeScript `paths` 不需要为了生效额外设置 `baseUrl`；除非项目已有明确路径别名体系，禁止只为 `paths` 添加 `baseUrl`，避免改变裸模块相对 node_modules 的解析优先级。
12. 处理外部 workspace 源码包的类型解析时，只添加最小 `paths` 映射到真实依赖；不要创建宽泛别名、平行 contract、假类型包或用 `skipLibCheck` 掩盖 peer dependency 解析失败。
