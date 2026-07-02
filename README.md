## 快速使用

如果你是从 GitHub 仓库开始使用这个项目，最省事的方式是把它当作一个可执行命令工具直接在项目脚本里调用。

前置条件：

- 已安装 Node.js 和 pnpm
- 已安装并配置好 Codex CLI

在你的项目的 package.json 里加入下面三条脚本：

```json
{
  "scripts": {
    "codexhono:dev": "pnpx --package github:see7788/codexhono codexhono dev",
    "codexhono:stop": "pnpx --package github:see7788/codexhono codexhono stop",
    "codexhono:restart": "pnpx --package github:see7788/codexhono codexhono restart"
  }
}
```

然后就可以这样使用：

```bash
pnpm codexhono:dev
pnpm codexhono:stop
pnpm codexhono:restart
```

## 源码说明

codexhono 是主要开发区，libs 是复用库。

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