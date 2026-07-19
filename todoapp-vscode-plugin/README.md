# todoapp-vscode-plugin

`todoapp-vscode-plugin` 是一个以 Vite + React + Zustand 为基础的浏览器承载骨架，用于先承载 Todo App 的页面入口与最小状态。当前可以启动开发服务器、执行类型检查并构建静态产物；workflow 对象、业务 API 和持久化仍未实现。

## 开发与构建

在仓库根目录执行：

```bash
pnpm --filter todoapp-vscode-plugin dev
pnpm --filter todoapp-vscode-plugin typecheck
pnpm --filter todoapp-vscode-plugin build
```

`dev` 启动 Vite 开发服务器；`typecheck` 执行 TypeScript 检查；`build` 先检查类型，再生成 Vite 生产构建。浏览器入口是 `index.html`，页面由 `src/main.tsx` 挂载。

## 当前结构

```text
todoapp-vscode-plugin/
├── index.html                 # 浏览器文档入口，提供 root 挂载点
├── package.json               # dev、typecheck、build 脚本及 React/Zustand 依赖
├── vite.config.ts             # Vite React 插件配置
└── src/
	├── main.tsx                 # React 启动入口，将 App 挂载到 index.html 的 root
	├── App.tsx                  # 页面壳，读取 store 的 appTitle 并渲染标题
	├── store.ts                 # Zustand 状态入口，目前仅提供 appTitle
	└── vite-env.d.ts            # Vite 的 TypeScript 环境声明
```

## 下一阶段计划（尚未实现）

```text
workflow 对象与状态模型
├── owner: workflow/state worker
├── consumer: src/store.ts -> src/App.tsx
└── 交付: 定义 Todo、步骤和状态转换；接入后再由 UI 消费可观察状态
workflow API
├── owner: API/integration worker
├── consumer: src/store.ts（调用方）与 src/App.tsx（状态展示）
└── 交付: 约定请求/响应与错误边界；当前不存在可调用接口
持久化
├── owner: persistence worker
├── consumer: workflow 状态层；页面通过 src/store.ts 间接消费
└── 交付: 选择浏览器存储适配器并恢复/写入 workflow；当前没有持久化实现
```

上述 owner 与消费关系是后续拆分约束，不代表这些能力已经存在。
