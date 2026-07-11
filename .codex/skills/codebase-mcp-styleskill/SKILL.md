---
name: "codebase-mcp-styleskill"
description: "涉及代码库 MCP 选择、代码检索、调用关系、影响范围、仓库结构可视化和改代码前上下文获取时使用。"
---

# 代码库 MCP 使用风格


## 分流规则

- 默认使用 Codegraph 作为代码库主力 MCP；改代码前的源码定位、调用关系、调用路径和影响范围分析优先走 Codegraph。
- Graphifyy 不作为清晰源码地图主方案；用户要明确文件结构、具体方法、callers/callees 调用链时，优先使用 Codegraph 或 IDE 级源码阅读能力。
- Graphifyy 只作为项目级全局图谱体验工具；只在用户明确要看全局项目地图、模块关系、调用流图或可视化体验时触发。
- Graphifyy、RepoGraph 或其他图谱可视化工具只作为全局结构、模块关系和依赖地图的辅助，不作为日常改代码第一入口。
- 安全审计、污点分析、跨函数数据流或漏洞路径分析才使用 codebadger、Joern CPG 这类安全/数据流工具。
- 企业级多仓库全文搜索、跨仓库符号检索或代码平台级查询才考虑 Sourcegraph 类工具。

## 加载和安装

- Codegraph 由生成的 config.toml 的 mcpServers.codegraph 加载，命令为 npx @colbymchenry/codegraph serve --mcp；如果当前会话没有暴露 Codegraph 工具，说明 MCP 未加载或需要重启会话，不要假装已使用。
- Graphifyy 不是默认 MCP；CLI 缺失时使用 uv tool install graphifyy 安装，安装后会提供 graphify 和 graphify-mcp 命令。
- 需要把 Graphifyy 作为 Codex skill 使用时，才执行 graphify install --platform codex；模板项目中不要手改生成产物来安装 Graphifyy，应回到模板源维护规则。

## Codegraph

- 遇到“这个函数怎么工作”“谁调用它”“改这里影响哪里”“从 A 怎么到 B”这类问题，先用 Codegraph 获取源码、调用路径和 blast radius。
- 读取或编辑能命名的文件、函数、组件、store、route 或 action 前，先用 Codegraph 查询对应符号或路径。
- 追踪流程时在一次 Codegraph 查询里同时写出关键端点名，例如入口 route、store action、渲染函数或目标方法。
- Codegraph 已返回的源码视为已读；不要为了重复确认再用普通 grep/read 走一遍，除非文件刚被编辑且索引明确提示过期。

## Graphifyy

- 用户说“项目地图”“可视化依赖关系”“调用关系图”“让我体验图谱”且接受全局图谱体验时，使用 Graphifyy 生成图谱，而不是只给文本说明。
- 用户要求清晰源码地图、文件结构、具体方法、具体方法调用链、callers/callees 时，不把 Graphifyy 当主方案；改用 Codegraph 或建议 IDE call hierarchy。
- 没有 LLM API key 且只需要源码结构时，优先运行 graphify . --code-only；需要文档、图片或语义抽取时，再按可用 API key 选择后端。
- 常用可视化产物：graphify tree --graph graphify-out/graph.json --output graphify-out/GRAPH_TREE.html；graphify cluster-only . --no-label；graphify export callflow-html。
- 生成后把 graphify-out/graph.html、graphify-out/GRAPH_TREE.html、graphify-out/*-callflow.html 作为用户可打开的体验入口说明清楚。

## 验证边界

- Codegraph 负责结构上下文，不替代真实验证；改完代码后仍用 TypeScript、测试、构建、接口响应或页面观察验证行为。
- rg 适合补充查找文本、配置、文档和 Codegraph 未覆盖内容；不要用 rg 重建 Codegraph 已经给出的调用关系。
- Graphifyy 只适合回答“仓库整体长什么样”“模块怎么连”“调用流如何可视化”的粗粒度问题；具体修改仍回到 Codegraph 和真实验证。
- 判断 workspace 包、运行依赖或托管工具未使用时，禁止只依据当前仓库没有直接 import；必须同时检查外部 workspace package.json、运行时托管链、peer/workspace 依赖、构建配置和启动入口。删除前先记录完整依赖链，删除后必须执行 pnpm install、typecheck 和真实 dev 启动验证，任一运行链未验证时不得判定为无用依赖。
