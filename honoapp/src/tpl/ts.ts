
type Tpl = { // 模板根对象；渲染 AGENTS.md、config.toml 和 skills
  nodes: Record<string, string | number>; // 模板变量表；key 非空；value 是非空字符串或有限数字；渲染时与运行时变量合并

  agentsMd: { // 渲染 `.codex/AGENTS.md`
    sections: Array<{ // AGENTS.md 同级章节；至少一个
      title?: string; // 章节标题；可选；非空；渲染为 `## <title>`
      text?: string; // 正文段落；可选；非空；适合一段完整说明
      items?: string[]; // 无序列表；可选；元素非空；适合并列规则、禁止项、无先后关系约束
      orderedItems?: string[]; // 有序列表；可选；元素非空；适合流程、排障步骤、必须按顺序执行的规则
      code?: { // Markdown 代码块；可选；适合命令、配置片段、协议格式或代码示例
        language: string; // 代码块语言；非空；例如 `ts`、`powershell`、`json`
        content: string; // 代码块内容；非空
      };
    }>;
  };

  configToml: { // 渲染 `.codex/config.toml`
    developerInstructions?: string[]; // Codex developer_instructions；可不存在；存在时至少一条非空字符串；渲染时用换行拼成 TOML 字符串
    features: { // Codex 功能开关
      hooks: boolean; // 是否启用 hooks；true 时 UserPromptSubmit 和 Stop 都必须至少一个 hook
    };
    hooks: { // Codex hooks 配置
      UserPromptSubmit: Array<{ // 用户提交 prompt 时触发；features.hooks 为 true 时不能为空
        type: "command"; // hook 类型；当前只允许 command
        command: string; // 要执行的命令；非空
        timeout: number; // 超时时间；正整数
      }>;
      Stop: Array<{ // assistant 停止输出时触发；features.hooks 为 true 时不能为空
        type: "command"; // hook 类型；当前只允许 command
        command: string; // 要执行的命令；非空
        timeout: number; // 超时时间；正整数
      }>;
    };
  };

  skills: Record<string, { // 渲染 `.codex/skills/<dir>/SKILL.md`；key 是 skill 目录名，非空且不能包含 `/` 或 `\`
    description: string; // skill 描述；非空；渲染到 frontmatter 的 description
    title: string; // skill 标题；非空；渲染为 `# <title>`
    intro?: string; // skill 引言；可选；非空；渲染在一级标题之后
    sections: Array<{ // skill 内部章节；至少一个；与 agentsMd.sections 不同，title 必填
      title: string; // 章节标题；非空
      text?: string; // 正文段落；可选；非空
      items?: string[]; // 无序列表；可选；元素非空
      orderedItems?: string[]; // 有序列表；可选；元素非空
      code?: { // Markdown 代码块；可选
        language: string; // 代码块语言；非空
        content: string; // 代码块内容；非空
      };
    }>;
  }>;
};
