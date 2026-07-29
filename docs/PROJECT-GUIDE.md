# 项目目录指南（Claude Code 标准流程）

本项目采用 projkit 标准项目结构（由 `/project-bootstrap` 初始化，母本在 projkit 仓库）。这份指南解释每个目录的用途、**什么时候**往里加东西、以及几个官方文档标注的坑。

核心原则（官方立场）：**配置从实际痛点里长出来，不预先设计**。空目录本身不占任何上下文，但过早填进去的内容会占——往任何目录加东西之前，先对照下表的「触发条件」。

## 目录一览

**全部标准目录都已预建并留空**——骨架可见有助于理解架构和协作分工，空目录本身零成本。往里加东西之前先对照「触发条件」列。

| 路径 | 用途 | 触发条件（什么时候往里加东西） |
|---|---|---|
| `CLAUDE.md` | 每次会话自动注入的项目说明：命令、约定、坑（签进 git） | Claude 第二次犯同样的错 → 写一行进去 |
| `CLAUDE.local.md` | 个人本地偏好（已 gitignore） | 有只属于你、不适合团队共享的偏好时 |
| `.claude/settings.json` | 团队共享设置：权限白名单、hooks 注册等（签进 git） | 同一个权限提示点过三次 → 加进 `permissions.allow`；某事必须每次自动发生 → 配 hook |
| `.claude/settings.local.json` | 个人设置覆盖（已 gitignore） | — |
| `.claude/rules/` | 路径作用域规则，Claude 碰到匹配文件时才加载 | 某类文件有跨位置的统一约束（如「API 层必须做输入校验」） |
| `.claude/skills/` | 可复用的多步骤流程，调用时才加载全文 | 同一个 prompt 或流程手打/手贴第三遍（`feature-spec` 随样板预装，是唯一例外——它属于方法论本身） |
| `.claude/agents/` | 自定义 subagent（独立上下文，只返回摘要） | 某类副任务总把主对话灌满之后不再引用的输出 |
| `.claude/commands/` | 自定义斜杠命令（**已并入 skills**，仍可用） | 基本不用建内容——skill 是超集，且支持配套文件与自动调用 |
| `.claude/hooks/` | hook 用的脚本文件（**注册在 settings.json 里**，不是放这就生效） | 配第一个 command 型 hook 时，脚本放这里，用 `${CLAUDE_PROJECT_DIR}/.claude/hooks/x.sh` 引用 |
| `.claude/output-styles/` | 输出风格（注入 system prompt） | 重大角色转变才需要；先确认内置的 Proactive / Explanatory / Learning 不够用 |
| `.claude/workflows/` | Dynamic Workflow 编排脚本 | 单次对话协调不过来的大规模并行任务（迁移、审计） |
| `.claude/agent-memory/<name>/` | subagent 的 `memory: project` 档，**可签进 git 团队共享** | 想让某个 subagent 跨会话积累经验、且这份经验值得团队共享时 |
| `.claude/agent-memory-local/<name>/` | subagent 的 `memory: local` 档（已 gitignore，故未预建） | 同上但不想进 git 时；由 CC 自动创建 |
| `.mcp.json` | 项目级 MCP 服务器声明（仓库根目录，**签进 git**） | 团队都要连的外部服务（数据库、issue 系统、Figma） |
| `specs/` | SPEC 文件（PRD 访谈的产出） | 每个较大功能开工前跑 `/feature-spec` 产出；PRD 变更后也用它同步 |
| `docs/` | 给人看的文档（含本文件） | 随时 |

### 为什么目录预建、文件不预建

**目录空着零成本，文件空着有成本，某些位置还有害。**

`rules/`、`agents/`、`commands/`、`output-styles/` 这四个目录有**扫描语义**——里面的每个 `.md` 都会被当成一份**生效的配置**读取：

| 目录 | 放一个 README.md 进去会怎样 |
|---|---|
| `rules/` | 不带 `paths:` 的 .md 变成**无条件规则**，每次会话全程加载 |
| `agents/` | 变成一个 subagent 定义，出现在 Agent 工具的可选类型里 |
| `commands/` | 变成一个 `/README` 斜杠命令 |
| `output-styles/` | 变成一个可选的输出风格 |

所以这些目录只放 `.gitkeep`（不是 `.md`，不会被扫描）。要写说明就写在本文件里——你现在读的就是。

`.claude/hooks/` 和 `.claude/skills/` 不在此列：hooks 靠 settings.json 注册、目录里放什么都不自动生效；skills 要求 `<名字>/SKILL.md` 的子目录形式，散落的 .md 不构成 skill。

### skill 内部结构：按需生长，没有固定目录名

一个 skill 只有 `SKILL.md` 是**必需**的，其余全部可选。官方给的示例结构：

```
<skill-name>/
├── SKILL.md      ← 必需：概览 + 导航（保持 500 行以内）
├── reference.md  ← 详细参考，需要时才加载
├── examples.md   ← 成品示例，需要时才加载
└── scripts/      ← 供执行的脚本，不进上下文
```

⚠️ **这是示例不是规约**——官方自带的 dataviz skill 用的是 `references/palette.md`，连官方自己都没统一。别人 skill 里的 `agent/`、`preference/` 之类目录同理，是作者自己的组织方式。

判断标准只有三条，与目录名无关：

1. `SKILL.md` 是否在 500 行以内（官方唯一硬指标）
2. **配套文件是否从 SKILL.md 里被引用过**——没引用等于 Claude 不知道它存在，建了也白建
3. 拆出去的内容是否真的实现了延迟加载

随样板预装的 `feature-spec` 就是这个结构的活例子：`SKILL.md` + `reference.md` + `examples.md`，没有多余目录。等 SKILL.md 逼近 500 行、或出现需要执行的脚本时再拆新目录。

## 官方标注的坑（模版已避开 / 使用时注意）

1. **四个目录里不要放 README**（`rules/`、`agents/`、`commands/`、`output-styles/`）——每个 `.md` 都会被当成生效配置，详见上文「为什么目录预建、文件不预建」。
2. **`.claude/settings.json` 只从启动 claude 的那个目录加载**，不像 CLAUDE.md 会逐级向上继承。从子目录启动时，根目录的 settings 完全不生效。
3. **CLAUDE.md 是建议不是强制**。写多少个「YOU MUST」都不保证遵守；「必须每次发生」的事（lint、拦截危险命令）要配成 hook（写在 settings.json 里，可以直接让 Claude 帮你写）。
4. **issue 和进度管理不在本仓库目录里**——用 GitHub Issues + `gh` CLI。进度的事实来源是 issue 看板和 PR 状态，不是任何人的 Claude Code 会话。
5. **auto memory（Claude 自己积累的经验）是机器本地的**，不进 git、不跨机器。要团队共享的知识必须显式写进 CLAUDE.md 或 rules。
6. **像养护代码一样养护配置**：CLAUDE.md 指定 owner、改动走 PR review、每 3-6 个月修剪一次（重大模型发布后感觉性能进入平台期时也该修剪）。

## 初始化之后：从骨架到第一个 PR

PRD 和原型通常是**渐进式**的——不必等全部想清楚才开工，也不要替没想清楚的部分编需求。节奏是一个循环：

1. PRD / 原型想清楚一块 → 在项目里跑 `/feature-spec <模块>`：增量访谈 → `specs/<模块>.md` 定稿 → 拆成 GitHub issues。未定的部分显式写进 SPEC 的「不在范围内」，留给下一轮。
2. 进入下面的标准开发循环，把这批 issue 做完。
3. PRD 又完善一块 → 回到 1。

一次性把 SPEC 写全，只是这个循环恰好跑一圈的特例。`/project-bootstrap` 时做过 SPEC 访谈的，第一圈已经走完，直接从 2 开始；当时跳过了的，从 1 开始。

**PRD 改到已定稿的模块**时，同样跑 `/feature-spec`：先更新 SPEC，再对照未完成的 issue——issue 是 mini-spec，SPEC 变了它就过期了，该改就改、该关就关；已完成部分的变更开新 issue，不重开旧的。

三个事实来源不要混：`specs/` 是「当前意图」（版本演进靠 git，不在文件里记变更日志），issue 看板是「执行状态」，PRD 原文只是访谈的输入。

## 标准开发循环（每个 issue 走一遍）

1. 认领 issue：`gh issue view <编号>`
2. **Explore**：Plan Mode（Shift+Tab）下只读探索相关代码
3. **Plan**：让 Claude 写实施计划；能用一句话说清的 diff 直接跳过规划
4. **Implement**：实现后跑测试/lint 验证，要求 Claude 出示证据（测试输出、命令返回），不接受口头「完成了」
5. **Commit + PR**：描述性 commit，`/code-review` 审查后合并
6. 卫生习惯：无关任务之间 `/clear`；同一问题纠正两次还不对就 `/clear` 重开，用吸收了教训的更好 prompt 重来
