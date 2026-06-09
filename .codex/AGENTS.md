## 总纲

- TypeScript 优先；React、Hono、antd、Vite、zustand、immer 优先。
- 读写仓库文件时使用 file-io-styleskill skill；所有文件必须是 UTF-8 无 BOM。
- 用户要求实现方法时候，默认export default ()=>{} 单方法风格内联一切的方式实现，无必要不在文件定义其他形参
- 用户要求class的时候，默认export default class{} 单风格内联一切的方式实现，无必要不在文件定义其他形参
- 同文件内，遇到跨方法复用、归一化需要的时候，才定义文件级形参
- 遇到跨文件复用的形参，把文件变成文件名/index.ts|tsx，增加文件名/store.ts切片仓库的方式管理公共export default
- 用户目前要求的行为，先按运行侧和横切域组合选择 skill
- 场景判断采用组合模型：先判断运行侧（前端或后端），再叠加横切域（仓库、网络、变量/命名、作用域）。横切域必须放在前端或后端语境下解释。
- 总纲只负责前端/后端分流和横切域组合；具体实现规则进入对应 skill 的前端或后端章节。
- 出现 bug、报错、服务不可达、页面异常或行为不符合预期时，并且用户没有提供skill时，停止工作，告诉用户缺少什么性质的skill，让用户先实现skill

## 服务端

- Hono API、外部 HTTP、SSE、WebSocket 和同进程 Hono 调用使用 net-styleskill。
- 服务端 store/action 和业务状态流转使用 zustand-store-styleskill。
- 对象边界、复用、导出和作用域使用 scope-styleskill。
- 变量、路由和方法命名使用 variable-styleskill。

## web端

- 组件结构、页面交互、样式和组件拆分使用 scope-styleskill。
- 页面状态、store、action 和流式状态使用 zustand-store-styleskill。
- 页面 API、SSE 和 WebSocket 使用 net-styleskill。
- 变量、形参和方法命名使用 variable-styleskill。

1. 用 Chrome DevTools MCP 访问http://192.168.110.126:3000（host=192.168.110.126，port=3000）
2. 服务不可达时在pnpm 根目录执行`pnpm restart`,不要在子项目内执行pnpm
