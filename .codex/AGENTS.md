## 总纲

- TypeScript 优先；React、Hono、antd、Vite、zustand、immer 优先。
- 默认不改动：用户没有明确要求的行为、样式、布局、文案、文件和抽象都保持原样；判断是否属于用户目标时，先按运行侧和横切域组合选择 skill。
- 场景判断采用组合模型：先判断运行侧（前端或后端），再叠加横切域（仓库、网络、变量/命名、作用域）。横切域必须放在前端或后端语境下解释。
- 引用 skill 时尽量指向章节标题，例如 net-style「前端网络 - 页面 API」、zustand-store-style「前端仓库」、variable-style「前端变量」、scope-style「前端作用域」。
- 读写仓库文件时使用 file-io-style skill；所有文件必须是 UTF-8 无 BOM。
- 出现 bug、报错、服务不可达、页面异常或行为不符合预期时，先最小复现、收集证据并定位责任边界，再修改代码。
- 总纲只负责前端/后端分流和横切域组合；具体实现规则进入对应 skill 的前端或后端章节。

## 服务端

- 后端分流：Hono API、外部 HTTP、SSE、WebSocket 和同进程 Hono 调用使用 net-style；服务端 store/action 和业务状态流转使用 zustand-store-style；对象边界、复用、导出和作用域使用 scope-style；变量、路由和方法命名使用 variable-style。

## web端

- 前端分流：组件结构、页面交互、样式和组件拆分使用 scope-style；页面状态、store、action 和流式状态使用 zustand-store-style；页面 API、SSE 和 WebSocket 使用 net-style；变量、形参和方法命名使用 variable-style。

1. 用 Chrome DevTools MCP 访问http://192.168.110.126:3000（host=192.168.110.126，port=3000）
2. 服务不可达时在pnpm 根目录执行`pnpm restart`,不要在子项目内执行pnpm
