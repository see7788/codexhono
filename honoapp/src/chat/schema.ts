// Source: https://developers.openai.com/codex/config-schema.json
import { z } from "zod"

// Codex CLI 常用命令：
// - `codex [PROMPT]`：打开交互式 CLI，可带初始 prompt。
// - `codex exec [PROMPT|-]`：非交互执行；`-` 表示从 stdin 读取输入。
// - `codex review`：非交互 code review。
// - `codex login/logout`：登录管理。
// - `codex mcp`：管理外部 MCP server。
// - `codex plugin`：管理 Codex plugins。
// - `codex mcp-server`：把 Codex 启成 MCP server，使用 stdio。
// - `codex app-server` / `codex exec-server`：实验性服务端入口。
// - `codex app`：启动 Codex desktop app。
// - `codex resume` / `codex fork`：恢复或 fork 之前的交互会话。
// - `codex cloud`：实验性 Codex Cloud 任务。
// - `codex completion`：生成 shell completion。
// - `codex update`：更新 CLI。
// - `codex sandbox`：用 Codex sandbox 跑命令。
// - `codex debug`：调试工具。
// - `codex apply`：应用 Codex 最近生成的 diff。
// - `codex features`：查看或开关 feature flags。
// codex [PROMPT]                 打开交互式 CLI，可带初始 prompt
// codex exec [PROMPT|-]          非交互执行，- 表示从 stdin 读输入
// codex review                   非交互 code review
// codex login/logout             登录管理
// codex mcp                      管理外部 MCP server
// codex plugin                   管理 Codex plugins
// codex mcp-server               把 Codex 启成 MCP server，stdio
// codex app-server               实验性 app server
// codex exec-server              实验性 standalone exec-server
// codex app                      启动 Codex desktop app
// codex resume                   恢复之前的交互会话
// codex fork                     fork 之前的交互会话
// codex cloud                    实验性 Codex Cloud 任务
// codex completion               shell completion
// codex update                   更新 CLI
// codex sandbox                  用 Codex sandbox 跑命令
// codex debug                    调试工具
// codex apply                    应用 Codex 最近生成的 diff
// codex features                 查看/开关 feature flags

// 这些字段基本对应 `codex exec -` 的 CLI 参数；服务端会把 `prompt` 写入 stdin，
// 其余字段会转换成对应命令行参数。
// 字段速览：
// - prompt：本次要交给 Codex CLI 的问题正文。
// - model/profile：指定模型，或指定 config.toml 里的 profile。
// - sandbox/cd/addDir：控制沙箱模式、工作目录和额外可访问目录。
// - image：传给模型的图片文件路径。
// - config：覆盖 config.toml 配置，最终转换成 `--config key=value`。
// - enable/disable：开启或关闭指定 feature。
// - oss/localProvider：使用本地开源模型模式和本地模型提供方。
// - skipGitRepoCheck：跳过 git 仓库检查。
// - ephemeral：本次调用结束后不保存会话。
// - ignoreUserConfig/ignoreRules：忽略用户级配置或 AGENTS.md 规则。
// - outputSchema：指定结构化输出 schema 文件。
// - color/json：控制终端颜色和 JSON Lines 输出。
// - outputLastMessage：把最后一条回复写入指定文件。
// - bypass：绕过审批和沙箱。
export const codexCliSchema = z.object({
  // 本次要交给 Codex CLI 的问题正文，服务端会通过 stdin 传给 `codex exec -`
  prompt: z.string(),
  // 指定本次调用使用的模型
  model: z.string().optional(),
  // 使用 config.toml 里的 profile
  profile: z.string().optional(),
  // 指定沙箱模式
  sandbox: z.enum(["read-only", "workspace-write", "danger-full-access"]).optional(),
  // 指定 Codex CLI 的工作目录
  cd: z.string().optional(),
  // 额外加入可读写的目录
  addDir: z.array(z.string()).optional(),
  // 传给模型的图片文件路径
  image: z.array(z.string()).optional(),
  // 覆盖 config.toml 配置，最终转换成 `--config key=value`
  config: z.record(z.string(), z.string()).optional(),
  // 开启指定 feature
  enable: z.array(z.string()).optional(),
  // 关闭指定 feature
  disable: z.array(z.string()).optional(),
  // 使用本地开源模型模式
  oss: z.boolean().optional(),
  // 本地模型提供方
  localProvider: z.enum(["lmstudio", "ollama"]).optional(),
  // 跳过 git 仓库检查
  skipGitRepoCheck: z.boolean().optional(),
  // 本次调用结束后不保存会话
  ephemeral: z.boolean().optional(),
  // 忽略用户级配置
  ignoreUserConfig: z.boolean().optional(),
  // 忽略 AGENTS.md 规则
  ignoreRules: z.boolean().optional(),
  // 指定结构化输出 schema 文件
  outputSchema: z.string().optional(),
  // 指定终端颜色输出策略
  color: z.enum(["always", "never", "auto"]).optional(),
  // 使用 JSON Lines 输出
  json: z.boolean().optional(),
  // 把最后一条回复写入指定文件
  outputLastMessage: z.string().optional(),
  // 绕过审批和沙箱
  bypass: z.boolean().optional(),
}).strict();

// `~/.codex/config.toml` 解析后的基础配置 schema。
// 下面保留官方英文 describe，中文注释用于快速判断字段用途：
// - agents/apps/tools/tui/windows/audio/realtime/debug/otel：各功能模块的配置集合。
// - model/model_provider/model_providers/model_*：模型、provider、上下文窗口、推理和输出控制。
// - approval_policy/permissions/sandbox_*：命令审批、权限 profile 和沙箱策略。
// - features：集中式 feature flags；优先使用它而不是旧的分散开关。
// - hooks：Codex 生命周期 hooks 配置，是 HonoCodex 观察通道的关键入口。
// - mcp_servers/mcp_oauth_*：MCP server 定义和 OAuth 回调/凭据配置。
// - plugins/marketplaces/skills：Codex 插件、市场和技能的用户级配置。
// - instructions/developer_instructions/compact_prompt/model_instructions_file：注入模型的指令和压缩提示。
// - history/memories/sqlite_home/log_dir：历史、记忆、本地状态和日志存储。
// - include_*：控制是否注入 apps/environment/permissions 等内置上下文块。
// - project_*：项目根识别、AGENTS.md fallback 和项目文档读取限制。
export const codexConfigSchema = z.object({ 
/**Agent-related settings (thread limits, etc.).*/
"agents": z.any().describe("Agent-related settings (thread limits, etc.).").optional(), 
/**
* Whether the model may request a login shell for shell-based tools. Default to `true`
* 
* If `true`, the model may request a login shell (`login = true`), and omitting `login` defaults to using a login shell. If `false`, the model can never use a login shell: `login = true` requests are rejected, and omitting `login` defaults to a non-login shell.
*/
"allow_login_shell": z.boolean().describe("Whether the model may request a login shell for shell-based tools. Default to `true`\n\nIf `true`, the model may request a login shell (`login = true`), and omitting `login` defaults to using a login shell. If `false`, the model can never use a login shell: `login = true` requests are rejected, and omitting `login` defaults to a non-login shell.").default(true), 
/**When `false`, disables analytics across Codex product surfaces in this machine. Defaults to `true`.*/
"analytics": z.any().describe("When `false`, disables analytics across Codex product surfaces in this machine. Defaults to `true`.").optional(), 
/**Default approval policy for executing commands.*/
"approval_policy": z.any().describe("Default approval policy for executing commands.").optional(), 
/**Configures who approval requests are routed to for review once they have been escalated. This does not disable separate safety checks such as ARC.*/
"approvals_reviewer": z.any().describe("Configures who approval requests are routed to for review once they have been escalated. This does not disable separate safety checks such as ARC.").optional(), 
/**Settings for app-specific controls.*/
"apps": z.any().describe("Settings for app-specific controls.").default(null), 
/**Machine-local realtime audio device preferences used by realtime voice.*/
"audio": z.any().describe("Machine-local realtime audio device preferences used by realtime voice.").default(null), 
/**Optional policy instructions for the guardian auto-reviewer.*/
"auto_review": z.any().describe("Optional policy instructions for the guardian auto-reviewer.").default(null), 
/**Maximum poll window for background terminal output (`write_stdin`), in milliseconds. Default: `300000` (5 minutes).*/
"background_terminal_max_timeout": z.number().int().gte(0).describe("Maximum poll window for background terminal output (`write_stdin`), in milliseconds. Default: `300000` (5 minutes).").optional(), 
/**Base URL for requests to ChatGPT (as opposed to the OpenAI API).*/
"chatgpt_base_url": z.string().describe("Base URL for requests to ChatGPT (as opposed to the OpenAI API).").optional(), 
/**When `true`, checks for Codex updates on startup and surfaces update prompts. Set to `false` only if your Codex updates are centrally managed. Defaults to `true`.*/
"check_for_update_on_startup": z.boolean().describe("When `true`, checks for Codex updates on startup and surfaces update prompts. Set to `false` only if your Codex updates are centrally managed. Defaults to `true`.").optional(), 
/**Preferred backend for storing CLI auth credentials. file (default): Use a file in the Codex home directory. keyring: Use an OS-specific keyring service. auto: Use the keyring if available, otherwise use a file.*/
"cli_auth_credentials_store": z.any().describe("Preferred backend for storing CLI auth credentials. file (default): Use a file in the Codex home directory. keyring: Use an OS-specific keyring service. auto: Use the keyring if available, otherwise use a file.").default(null), 
/**
* Optional commit attribution text for commit message co-author trailers. This top-level setting only takes effect when `[features].codex_git_commit` is enabled.
* 
* When enabled and unset, Codex uses `Codex <noreply@openai.com>`. Set to an empty string to disable automatic commit attribution.
*/
"commit_attribution": z.string().describe("Optional commit attribution text for commit message co-author trailers. This top-level setting only takes effect when `[features].codex_git_commit` is enabled.\n\nWhen enabled and unset, Codex uses `Codex <noreply@openai.com>`. Set to an empty string to disable automatic commit attribution.").optional(), 
/**Compact prompt used for history compaction.*/
"compact_prompt": z.string().describe("Compact prompt used for history compaction.").optional(), 
/**Debugging and reproducibility settings.*/
"debug": z.any().describe("Debugging and reproducibility settings.").optional(), 
/**Default permissions profile to apply. Names starting with `:` refer to built-in profiles; other names are resolved from the `[permissions]` table.*/
"default_permissions": z.string().describe("Default permissions profile to apply. Names starting with `:` refer to built-in profiles; other names are resolved from the `[permissions]` table.").optional(), 
/**Developer instructions inserted as a `developer` role message.*/
"developer_instructions": z.string().nullable().describe("Developer instructions inserted as a `developer` role message.").default(null), 
/**When true, disables burst-paste detection for typed input entirely. All characters are inserted as they are received, and no buffering or placeholder replacement will occur for fast keypress bursts.*/
"disable_paste_burst": z.boolean().describe("When true, disables burst-paste detection for typed input entirely. All characters are inserted as they are received, and no buffering or placeholder replacement will occur for fast keypress bursts.").optional(), "experimental_compact_prompt_file": z.any().optional(), 
/**Experimental / do not use. Replaces the built-in realtime start instructions inserted into developer messages when realtime becomes active.*/
"experimental_realtime_start_instructions": z.string().describe("Experimental / do not use. Replaces the built-in realtime start instructions inserted into developer messages when realtime becomes active.").optional(), 
/**Experimental / do not use. Overrides only the realtime conversation websocket transport instructions (the `Op::RealtimeConversation` `/ws` session.update instructions) without changing normal prompts.*/
"experimental_realtime_ws_backend_prompt": z.string().describe("Experimental / do not use. Overrides only the realtime conversation websocket transport instructions (the `Op::RealtimeConversation` `/ws` session.update instructions) without changing normal prompts.").optional(), 
/**Experimental / do not use. Overrides only the realtime conversation websocket transport base URL (the `Op::RealtimeConversation` `/v1/realtime` connection) without changing normal provider HTTP requests.*/
"experimental_realtime_ws_base_url": z.string().describe("Experimental / do not use. Overrides only the realtime conversation websocket transport base URL (the `Op::RealtimeConversation` `/v1/realtime` connection) without changing normal provider HTTP requests.").optional(), 
/**Experimental / do not use. Selects the realtime websocket model/snapshot used for the `Op::RealtimeConversation` connection.*/
"experimental_realtime_ws_model": z.string().describe("Experimental / do not use. Selects the realtime websocket model/snapshot used for the `Op::RealtimeConversation` connection.").optional(), 
/**Experimental / do not use. Replaces the synthesized realtime startup context appended to websocket session instructions. An empty string disables startup context injection entirely.*/
"experimental_realtime_ws_startup_context": z.string().describe("Experimental / do not use. Replaces the synthesized realtime startup context appended to websocket session instructions. An empty string disables startup context injection entirely.").optional(), 
/**Experimental / do not use. When set, app-server fetches thread-scoped config from a remote service at this endpoint.*/
"experimental_thread_config_endpoint": z.string().describe("Experimental / do not use. When set, app-server fetches thread-scoped config from a remote service at this endpoint.").optional(), 
/**Experimental / do not use. Selects the thread store implementation.*/
"experimental_thread_store": z.any().describe("Experimental / do not use. Selects the thread store implementation.").optional(), "experimental_use_freeform_apply_patch": z.boolean().optional(), "experimental_use_unified_exec_tool": z.boolean().optional(), 
/**Centralized feature flags (new). Prefer this over individual toggles.*/
"features": z.object({ "apply_patch_freeform": z.boolean().optional(), "apply_patch_streaming_events": z.boolean().optional(), "apps": z.boolean().optional(), "apps_mcp_path_override": z.any().optional(), "auth_elicitation": z.boolean().optional(), "browser_use": z.boolean().optional(), "browser_use_external": z.boolean().optional(), "builtin_mcp": z.boolean().optional(), "child_agents_md": z.boolean().optional(), "chronicle": z.boolean().optional(), "code_mode": z.boolean().optional(), "code_mode_only": z.boolean().optional(), "codex_git_commit": z.boolean().optional(), "codex_hooks": z.boolean().optional(), "collab": z.boolean().optional(), "collaboration_modes": z.boolean().optional(), "computer_use": z.boolean().optional(), "connectors": z.boolean().optional(), "default_mode_request_user_input": z.boolean().optional(), "elevated_windows_sandbox": z.boolean().optional(), "enable_experimental_windows_sandbox": z.boolean().optional(), "enable_fanout": z.boolean().optional(), "enable_mcp_apps": z.boolean().optional(), "enable_request_compression": z.boolean().optional(), "exec_permission_approvals": z.boolean().optional(), "experimental_use_freeform_apply_patch": z.boolean().optional(), "experimental_use_unified_exec_tool": z.boolean().optional(), "experimental_windows_sandbox": z.boolean().optional(), "external_migration": z.boolean().optional(), "fast_mode": z.boolean().optional(), "goals": z.boolean().optional(), "guardian_approval": z.boolean().optional(), "hooks": z.boolean().optional(), "image_detail_original": z.boolean().optional(), "image_generation": z.boolean().optional(), "in_app_browser": z.boolean().optional(), "include_apply_patch_tool": z.boolean().optional(), "js_repl": z.boolean().optional(), "js_repl_tools_only": z.boolean().optional(), "memories": z.boolean().optional(), "memory_tool": z.boolean().optional(), "multi_agent": z.boolean().optional(), "multi_agent_v2": z.any().optional(), "personality": z.boolean().optional(), "plugin_hooks": z.boolean().optional(), "plugins": z.boolean().optional(), "prevent_idle_sleep": z.boolean().optional(), "realtime_conversation": z.boolean().optional(), "remote_compaction_v2": z.boolean().optional(), "remote_control": z.boolean().optional(), "remote_models": z.boolean().optional(), "remote_plugin": z.boolean().optional(), "request_permissions": z.boolean().optional(), "request_permissions_tool": z.boolean().optional(), "request_rule": z.boolean().optional(), "responses_websocket_response_processed": z.boolean().optional(), "responses_websockets": z.boolean().optional(), "responses_websockets_v2": z.boolean().optional(), "runtime_metrics": z.boolean().optional(), "search_tool": z.boolean().optional(), "shell_snapshot": z.boolean().optional(), "shell_tool": z.boolean().optional(), "shell_zsh_fork": z.boolean().optional(), "skill_env_var_dependency_prompt": z.boolean().optional(), "skill_mcp_dependency_install": z.boolean().optional(), "sqlite": z.boolean().optional(), "steer": z.boolean().optional(), "telepathy": z.boolean().optional(), "terminal_resize_reflow": z.boolean().optional(), "tool_call_mcp_elicitation": z.boolean().optional(), "tool_search": z.boolean().optional(), "tool_search_always_defer_mcp_tools": z.boolean().optional(), "tool_suggest": z.boolean().optional(), "tui_app_server": z.boolean().optional(), "unavailable_dummy_tools": z.boolean().optional(), "undo": z.boolean().optional(), "unified_exec": z.boolean().optional(), "use_legacy_landlock": z.boolean().optional(), "use_linux_sandbox_bwrap": z.boolean().optional(), "web_search": z.boolean().optional(), "web_search_cached": z.boolean().optional(), "web_search_request": z.boolean().optional(), "workspace_dependencies": z.boolean().optional(), "workspace_owner_usage_nudge": z.boolean().optional() }).strict().nullable().describe("Centralized feature flags (new). Prefer this over individual toggles.").default(null), 
/**When `false`, disables feedback collection across Codex product surfaces. Defaults to `true`.*/
"feedback": z.any().describe("When `false`, disables feedback collection across Codex product surfaces. Defaults to `true`.").optional(), 
/**Optional URI-based file opener. If set, citations to files in the model output will be hyperlinked using the specified URI scheme.*/
"file_opener": z.any().describe("Optional URI-based file opener. If set, citations to files in the model output will be hyperlinked using the specified URI scheme.").optional(), 
/**When set, restricts ChatGPT login to a specific workspace identifier.*/
"forced_chatgpt_workspace_id": z.string().nullable().describe("When set, restricts ChatGPT login to a specific workspace identifier.").default(null), 
/**When set, restricts the login mechanism users may use.*/
"forced_login_method": z.any().describe("When set, restricts the login mechanism users may use.").default(null), 
/**Compatibility-only settings retained so legacy `ghost_snapshot` config still loads.*/
"ghost_snapshot": z.any().describe("Compatibility-only settings retained so legacy `ghost_snapshot` config still loads.").default(null), 
/**When set to `true`, `AgentReasoning` events will be hidden from the UI/output. Defaults to `false`.*/
"hide_agent_reasoning": z.boolean().describe("When set to `true`, `AgentReasoning` events will be hidden from the UI/output. Defaults to `false`.").default(false), 
/**Settings that govern if and what will be written to `~/.codex/history.jsonl`.*/
"history": z.any().describe("Settings that govern if and what will be written to `~/.codex/history.jsonl`.").default({"max_bytes":null,"persistence":"save-all"}), 
/**Lifecycle hooks configured inline in TOML plus user-level overrides.*/
"hooks": z.any().describe("Lifecycle hooks configured inline in TOML plus user-level overrides.").optional(), 
/**Whether to inject the `<apps_instructions>` developer block.*/
"include_apps_instructions": z.boolean().describe("Whether to inject the `<apps_instructions>` developer block.").optional(), 
/**Whether to inject the `<environment_context>` user block.*/
"include_environment_context": z.boolean().describe("Whether to inject the `<environment_context>` user block.").optional(), 
/**Whether to inject the `<permissions instructions>` developer block.*/
"include_permissions_instructions": z.boolean().describe("Whether to inject the `<permissions instructions>` developer block.").optional(), 
/**System instructions.*/
"instructions": z.string().describe("System instructions.").optional(), 
/**Directory where Codex writes log files, for example `codex-tui.log`. Defaults to `$CODEX_HOME/log`.*/
"log_dir": z.any().describe("Directory where Codex writes log files, for example `codex-tui.log`. Defaults to `$CODEX_HOME/log`.").optional(), 
/**User-level marketplace entries keyed by marketplace name.*/
"marketplaces": z.record(z.string(), z.any()).describe("User-level marketplace entries keyed by marketplace name.").default({}), 
/**Optional fixed port for the local HTTP callback server used during MCP OAuth login. When unset, Codex will bind to an ephemeral port chosen by the OS.*/
"mcp_oauth_callback_port": z.number().int().gte(0).describe("Optional fixed port for the local HTTP callback server used during MCP OAuth login. When unset, Codex will bind to an ephemeral port chosen by the OS.").optional(), 
/**Optional redirect URI to use during MCP OAuth login. When set, this URI is used in the OAuth authorization request instead of the local listener address. The local callback listener still binds to 127.0.0.1 (using `mcp_oauth_callback_port` when provided).*/
"mcp_oauth_callback_url": z.string().describe("Optional redirect URI to use during MCP OAuth login. When set, this URI is used in the OAuth authorization request instead of the local listener address. The local callback listener still binds to 127.0.0.1 (using `mcp_oauth_callback_port` when provided).").optional(), 
/**Preferred backend for storing MCP OAuth credentials. keyring: Use an OS-specific keyring service. https://github.com/openai/codex/blob/main/codex-rs/rmcp-client/src/oauth.rs#L2 file: Use a file in the Codex home directory. auto (default): Use the OS-specific keyring service if available, otherwise use a file.*/
"mcp_oauth_credentials_store": z.any().describe("Preferred backend for storing MCP OAuth credentials. keyring: Use an OS-specific keyring service. https://github.com/openai/codex/blob/main/codex-rs/rmcp-client/src/oauth.rs#L2 file: Use a file in the Codex home directory. auto (default): Use the OS-specific keyring service if available, otherwise use a file.").default(null), 
/**Definition for MCP servers that Codex can reach out to for tool calls.*/
"mcp_servers": z.record(z.string(), z.any()).describe("Definition for MCP servers that Codex can reach out to for tool calls.").default({}), 
/**Memories subsystem settings.*/
"memories": z.any().describe("Memories subsystem settings.").optional(), 
/**Optional override of model selection.*/
"model": z.string().describe("Optional override of model selection.").optional(), 
/**Token usage threshold triggering auto-compaction of conversation history.*/
"model_auto_compact_token_limit": z.number().int().describe("Token usage threshold triggering auto-compaction of conversation history.").optional(), 
/**Optional path to a JSON model catalog (applied on startup only). Per-thread `config` overrides are accepted but do not reapply this (no-ops).*/
"model_catalog_json": z.any().describe("Optional path to a JSON model catalog (applied on startup only). Per-thread `config` overrides are accepted but do not reapply this (no-ops).").optional(), 
/**Size of the context window for the model, in tokens.*/
"model_context_window": z.number().int().describe("Size of the context window for the model, in tokens.").optional(), 
/**Optional path to a file containing model instructions that will override the built-in instructions for the selected model. Users are STRONGLY DISCOURAGED from using this field, as deviating from the instructions sanctioned by Codex will likely degrade model performance.*/
"model_instructions_file": z.any().describe("Optional path to a file containing model instructions that will override the built-in instructions for the selected model. Users are STRONGLY DISCOURAGED from using this field, as deviating from the instructions sanctioned by Codex will likely degrade model performance.").optional(), 
/**Provider to use from the model_providers map.*/
"model_provider": z.string().describe("Provider to use from the model_providers map.").optional(), 
/**User-defined provider entries that extend the built-in list. Built-in IDs cannot be overridden.*/
"model_providers": z.record(z.string(), z.any()).describe("User-defined provider entries that extend the built-in list. Built-in IDs cannot be overridden.").default({}), "model_reasoning_effort": z.any().optional(), "model_reasoning_summary": z.any().optional(), 
/**Override to force-enable reasoning summaries for the configured model.*/
"model_supports_reasoning_summaries": z.boolean().describe("Override to force-enable reasoning summaries for the configured model.").optional(), 
/**Optional verbosity control for GPT-5 models (Responses API `text.verbosity`).*/
"model_verbosity": z.any().describe("Optional verbosity control for GPT-5 models (Responses API `text.verbosity`).").optional(), 
/**Collection of in-product notices (different from notifications) See [`crate::types::Notice`] for more details*/
"notice": z.any().describe("Collection of in-product notices (different from notifications) See [`crate::types::Notice`] for more details").optional(), 
/**Optional external command to spawn for end-user notifications.*/
"notify": z.array(z.string()).nullable().describe("Optional external command to spawn for end-user notifications.").default(null), 
/**Base URL override for the built-in `openai` model provider.*/
"openai_base_url": z.string().describe("Base URL override for the built-in `openai` model provider.").optional(), 
/**Preferred OSS provider for local models, e.g. "lmstudio" or "ollama".*/
"oss_provider": z.string().describe("Preferred OSS provider for local models, e.g. \"lmstudio\" or \"ollama\".").optional(), 
/**OTEL configuration.*/
"otel": z.any().describe("OTEL configuration.").optional(), 
/**Named permissions profiles.*/
"permissions": z.any().describe("Named permissions profiles.").default(null), 
/**Optionally specify a personality for the model*/
"personality": z.any().describe("Optionally specify a personality for the model").optional(), "plan_mode_reasoning_effort": z.any().optional(), 
/**User-level plugin config entries keyed by plugin name.*/
"plugins": z.record(z.string(), z.any()).describe("User-level plugin config entries keyed by plugin name.").default({}), 
/**Profile to use from the `profiles` map.*/
"profile": z.string().describe("Profile to use from the `profiles` map.").optional(), 
/**Named profiles to facilitate switching between different configurations.*/
"profiles": z.record(z.string(), z.any()).describe("Named profiles to facilitate switching between different configurations.").default({}), 
/**Ordered list of fallback filenames to look for when AGENTS.md is missing.*/
"project_doc_fallback_filenames": z.array(z.string()).describe("Ordered list of fallback filenames to look for when AGENTS.md is missing.").default([]), 
/**Maximum number of bytes to include from an AGENTS.md project doc file.*/
"project_doc_max_bytes": z.number().int().gte(0).describe("Maximum number of bytes to include from an AGENTS.md project doc file.").default(32768), 
/**Markers used to detect the project root when searching parent directories for `.codex` folders. Defaults to [".git"] when unset.*/
"project_root_markers": z.array(z.string()).nullable().describe("Markers used to detect the project root when searching parent directories for `.codex` folders. Defaults to [\".git\"] when unset.").default(null), "projects": z.record(z.string(), z.any()).optional(), 
/**Experimental / do not use. Realtime websocket session selection. `version` controls v1/v2 and `type` controls conversational/transcription.*/
"realtime": z.any().describe("Experimental / do not use. Realtime websocket session selection. `version` controls v1/v2 and `type` controls conversational/transcription.").default(null), 
/**Review model override used by the `/review` feature.*/
"review_model": z.string().describe("Review model override used by the `/review` feature.").optional(), 
/**Sandbox mode to use.*/
"sandbox_mode": z.any().describe("Sandbox mode to use.").optional(), 
/**Sandbox configuration to apply if `sandbox` is `WorkspaceWrite`.*/
"sandbox_workspace_write": z.any().describe("Sandbox configuration to apply if `sandbox` is `WorkspaceWrite`.").optional(), 
/**Optional explicit service tier preference for new turns (`fast` or `flex`).*/
"service_tier": z.any().describe("Optional explicit service tier preference for new turns (`fast` or `flex`).").optional(), "shell_environment_policy": z.any().default({"exclude":null,"experimental_use_profile":null,"ignore_default_excludes":null,"include_only":null,"inherit":null,"set":null}), 
/**When set to `true`, `AgentReasoningRawContentEvent` events will be shown in the UI/output. Defaults to `false`.*/
"show_raw_agent_reasoning": z.boolean().describe("When set to `true`, `AgentReasoningRawContentEvent` events will be shown in the UI/output. Defaults to `false`.").optional(), 
/**User-level skill config entries keyed by SKILL.md path.*/
"skills": z.any().describe("User-level skill config entries keyed by SKILL.md path.").optional(), 
/**Directory where Codex stores the SQLite state DB. Defaults to `$CODEX_SQLITE_HOME` when set. Otherwise uses `$CODEX_HOME`.*/
"sqlite_home": z.any().describe("Directory where Codex stores the SQLite state DB. Defaults to `$CODEX_SQLITE_HOME` when set. Otherwise uses `$CODEX_HOME`.").optional(), 
/**Suppress warnings about unstable (under development) features.*/
"suppress_unstable_features_warning": z.boolean().describe("Suppress warnings about unstable (under development) features.").optional(), 
/**Token budget applied when storing tool/function outputs in the context manager.*/
"tool_output_token_limit": z.number().int().gte(0).describe("Token budget applied when storing tool/function outputs in the context manager.").optional(), 
/**Additional discoverable tools that can be suggested for installation.*/
"tool_suggest": z.any().describe("Additional discoverable tools that can be suggested for installation.").optional(), 
/**Nested tools section for feature toggles*/
"tools": z.any().describe("Nested tools section for feature toggles").optional(), 
/**Collection of settings that are specific to the TUI.*/
"tui": z.any().describe("Collection of settings that are specific to the TUI.").optional(), 
/**Controls the web search tool mode: disabled, cached, or live.*/
"web_search": z.any().describe("Controls the web search tool mode: disabled, cached, or live.").optional(), 
/**Windows-specific configuration.*/
"windows": z.any().describe("Windows-specific configuration.").default(null), 
/**Tracks whether the Windows onboarding screen has been acknowledged.*/
"windows_wsl_setup_acknowledged": z.boolean().describe("Tracks whether the Windows onboarding screen has been acknowledged.").optional(), 
/**Optional absolute path to patched zsh used by zsh-exec-bridge-backed shell execution.*/
"zsh_path": z.any().describe("Optional absolute path to patched zsh used by zsh-exec-bridge-backed shell execution.").optional() }).strict().describe("Base config deserialized from ~/.codex/config.toml.")
export type CodexConfig = z.infer<typeof codexConfigSchema>
