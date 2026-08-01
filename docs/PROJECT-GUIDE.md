# 项目目录指南（Claude Code 标准流程）

本项目采用 projkit 标准项目结构（由 `/project-bootstrap` 初始化，母本在 projkit 仓库）。这份指南解释每个目录的用途、**什么时候**往里加东西、以及几个官方文档标注的坑。

核心原则（官方立场）：**配置从实际痛点里长出来，不预先设计**。空目录本身不占任何上下文，但过早填进去的内容会占——往任何目录加东西之前，先对照下表的「触发条件」。

## 目录一览

**全部标准目录都已预建并留空**——骨架可见有助于理解架构和协作分工，空目录本身零成本。往里加东西之前先对照「触发条件」列。

| 路径 | 用途 | 触发条件（什么时候往里加东西） |
|---|---|---|
| `AGENTS.md` | 项目说明的**唯一事实来源**：命令、约定、坑（签进 git）。Codex / Cursor / Gemini CLI 直接读，Claude Code 经 CLAUDE.md 软链读，每次会话自动注入 | agent 第二次犯同样的错 → 写一行进去 |
| `CLAUDE.md` | **AGENTS.md 的软链**（签进 git）——Claude Code 只认这个文件名 | 不单独维护——改就改 AGENTS.md，软链保证两边永远一致 |
| `CLAUDE.local.md` | 个人本地偏好（已 gitignore） | 有只属于你、不适合团队共享的偏好时 |
| `.claude/settings.json` | 团队共享设置：权限白名单、hooks 注册等（签进 git） | 同一个权限提示点过三次 → 加进 `permissions.allow`；某事必须每次自动发生 → 配 hook |
| `.claude/settings.local.json` | 个人设置覆盖（已 gitignore） | — |
| `.claude/rules/` | 路径作用域规则，Claude 碰到匹配文件时才加载 | 某类文件有跨位置的统一约束（如「API 层必须做输入校验」） |
| `.agents/skills/` | 共享 skill 的**真身**（SKILL.md 是开放标准，`.agents/skills/` 是 Codex / Cursor / Gemini CLI 等采用的通用目录） | 同一个 prompt 或流程手打/手贴第三遍 → 新共享 skill 放这里并建双软链（三个 spec-* skill 随样板预装，是唯一预填例外——方法论本身） |
| `.claude/skills/` | Claude Code 的 skill 发现目录，只放指向 `.agents/skills/` 的软链 | 不单独维护——随共享 skill 一起建链（真身直接放这里的情况极少：仅当 skill 深度绑定 CC 专属能力且确实不该被其他工具看到） |
| `.codex/skills/` | Codex 的 skill 发现目录，只放指向 `.agents/skills/` 的软链 | 不单独维护——随共享 skill 一起建链 |
| `.claude/agents/` | 自定义 subagent（独立上下文，只返回摘要） | 某类副任务总把主对话灌满之后不再引用的输出 |
| `.claude/commands/` | 自定义斜杠命令（**已并入 skills**，仍可用） | 基本不用建内容——skill 是超集，且支持配套文件与自动调用 |
| `.claude/hooks/` | hook 用的脚本文件（**注册在 settings.json 里**，不是放这就生效） | 配第一个 command 型 hook 时，脚本放这里，用 `${CLAUDE_PROJECT_DIR}/.claude/hooks/x.sh` 引用 |
| `.claude/output-styles/` | 输出风格（注入 system prompt） | 重大角色转变才需要；先确认内置的 Proactive / Explanatory / Learning 不够用 |
| `.claude/workflows/` | Dynamic Workflow 编排脚本 | 单次对话协调不过来的大规模并行任务（迁移、审计） |
| `.claude/agent-memory/<name>/` | subagent 的 `memory: project` 档，**可签进 git 团队共享** | 想让某个 subagent 跨会话积累经验、且这份经验值得团队共享时 |
| `.claude/agent-memory-local/<name>/` | subagent 的 `memory: local` 档（已 gitignore，故未预建） | 同上但不想进 git 时；由 CC 自动创建 |
| `.mcp.json` | 项目级 MCP 服务器声明（Claude Code 格式，仓库根目录，**签进 git**） | 团队都要连的外部服务（数据库、issue 系统、Figma） |
| `specs/` | 正式 SPEC（`/spec-design` 的产出；进行中另有 `<模块>.draft.md` 草稿，同样进 git，定稿即删） | 每个较大功能开工前经 `/spec-interview` → `/spec-design` 产出；需求变更后重跑同步 |
| `docs/` | 给人看的文档（含本文件；`ARCHITECTURE.md` 架构导读——全局图 + 分层导读 + 横切约定 + 决策索引，由首轮方案设计创建、结构变化时更新） | 随时 |
| `docs/prd/` | **外来输入区**：PRD、原型、外部架构设计等上游给的文档都放这（只读，不是事实来源——外部架构会被 `/spec-design 全局` 转译成标准 ARCHITECTURE.md 归档）；子目录 `解读/` 存访谈产出的**人话版 PRD**（`解读/<模块>.md`），随讲随写、随时可看 | 上游文档放根、解读归 `解读/`（由 `/spec-interview` 逐块生成），输入与产出不混放 |
| `docs/adr/` | 需求决策记录（**追加式**：每轮访谈一份新文件，旧的永不改写，决策史全程可追） | `/spec-interview` 每轮产出；人工要补记决策也放这 |

### 工具中立优先

开发不一定只用 Claude Code（还可能用 Codex、Cursor 等），本样板的总原则是：**凡存在跨工具开放标准的配置，真身一律放中立位置，各工具目录只放软链；没有中立标准的才留在工具专属目录。**

| 配置 | 跨工具标准 | 落点 |
|---|---|---|
| 项目说明 | ✅ AGENTS.md | 真身 `AGENTS.md`，`CLAUDE.md` 软链 |
| skill | ✅ SKILL.md 开放标准（agentskills.io，20+ 工具通用） | 真身 `.agents/skills/`，`.claude/skills/`、`.codex/skills/` 软链 |
| rules / hooks / settings / subagents / workflows / output-styles | ❌ 各家形态不同（Codex 对应 config.toml 等） | 留在 `.claude/`，等标准出现再迁 |
| MCP 服务器声明 | ❌ 各家自有格式（`.mcp.json` 是 Claude Code 的；Codex 在 config.toml 里配） | `.mcp.json` 留仓库根，其他工具各自另配 |
| `specs/`、`docs/` | 本就中立 | 原地 |

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

随样板预装的 `spec-design`（真身在 `.agents/skills/`）就是这个结构的活例子：`SKILL.md` + `reference.md` + `examples.md`，没有多余目录。等 SKILL.md 逼近 500 行、或出现需要执行的脚本时再拆新目录。

## 文档排版规范（所有方法论产出通用）

解读、ADR、SPEC、ARCHITECTURE、issue 正文——凡是写给人看的产出，落盘前过一遍这几条，不许一坨坨堆字：

1. **先结论后细节**：每节第一句就是该节结论，解释跟在后面。
2. **一段一件事**：每段不超过 4 行，超了就拆段或改列表。
3. **能列表不成段，能表格不列表**：三个以上并列项用列表；有维度可对比用表格。
4. **标题即导航**：##/### 两级为主，扫一遍标题就能定位内容；一节超过半屏必须再分小节。
5. **图优先于文字**：流程、结构、状态关系一律 Mermaid 图，文字只做图的补充说明。
6. **加粗要吝啬**：只给关键结论，一段最多一处——满页加粗等于没有加粗。
7. **留白**：标题、列表、代码块、图的前后空一行；话题切换用小节断开。
8. **人话优先**：不堆术语缩写，概念第一次出现给一句解释。

## 已知的坑（官方标注 + 样板注意，模版已避开的也列出）

1. **四个目录里不要放 README**（`rules/`、`agents/`、`commands/`、`output-styles/`）——每个 `.md` 都会被当成生效配置，详见上文「为什么目录预建、文件不预建」。
2. **`.claude/settings.json` 只从启动 claude 的那个目录加载**，不像 CLAUDE.md 会逐级向上继承。从子目录启动时，根目录的 settings 完全不生效。
3. **AGENTS.md / CLAUDE.md 是建议不是强制**。写多少个「YOU MUST」都不保证遵守；「必须每次发生」的事（lint、拦截危险命令）要配成 hook（写在 settings.json 里，可以直接让 Claude 帮你写）。
4. **issue 和进度管理不在本仓库目录里**——用 GitHub Issues + `gh` CLI。进度的事实来源是 issue 看板和 PR 状态，不是任何人的 Claude Code 会话。
5. **auto memory（Claude 自己积累的经验）是机器本地的**，不进 git、不跨机器。要团队共享的知识必须显式写进 AGENTS.md 或 rules。
6. **像养护代码一样养护配置**：AGENTS.md 指定 owner、改动走 PR review、每 3-6 个月修剪一次（重大模型发布后感觉性能进入平台期时也该修剪）。
7. **样板里有软链，Windows 成员要额外一步**：`CLAUDE.md → AGENTS.md`，加上 `.claude/skills/`、`.codex/skills/` 下**每个**共享 skill 各一条（指向 `../../.agents/skills/<名字>`）——数量随共享 skill 增加而增长，核对时以 `find . -type l` 的实际输出为准，别数清单。需要 `git config core.symlinks true` 且系统开启开发者模式，否则 checkout 出来的软链是只含目标路径一行文字的普通文件，工具读到的就是这行字。搞不定时退化方案：换成真实拷贝，并约定只改真身（AGENTS.md / `.agents/skills/` 下的文件）、改后手动同步。

## 初始化之后：从骨架到第一个 PR

PRD 和原型通常是**渐进式**的——不必等全部想清楚才开工，也不要替没想清楚的部分编需求。节奏是一个循环：

1. 拿到完整 PRD → **先全局后模块**：`/spec-interview 全局`（吃透全貌，产出人话版解读 + 需求决策 ADR）→ `/spec-design 全局`（整体架构 + **模块划分** → ARCHITECTURE.md）→ 对每个模块：按需 `/spec-interview <模块>`（需求没聊透才跑）→ `/spec-design <模块>`（模块方案 → SPEC）→ `/spec-issues <模块>`（拆 GitHub issues——**什么时候拆都行**）。未定的进「未决问题」和「不在范围内」，留给下一轮。
2. 进入下面的标准开发循环，把这批 issue 做完。
3. PRD 又完善一块 → 回到 1。

一次性把 SPEC 写全，只是这个循环恰好跑一圈的特例。`/project-bootstrap` 时做过访谈和设计的，第一圈已经走完，直接从 2 开始；当时跳过了的，从 1 开始。三个 spec-* 是跨工具共享的 skill（真身在 `.agents/skills/`）：Claude Code 中用 `/spec-interview` 等斜杠调用，Codex 中用 `$spec-interview` 等（或在 `/skills` 列表里选）——本文写斜杠命令时同理换算；它们只接受显式调用，agent 不会自作主张启动。

三环各自独立断点：**每个 skill 的草稿 = 它正式产物文件名的 `.md` 换成 `.draft.md`**（如 `specs/订单.draft.md`），随写随落盘、**进 git**（同一工作树换会话随时能接；提交并推送后，换人、换机器也能接力）；产物转正即删草稿。环与环之间只靠产物文件衔接：ADR 更新了，设计要不要跟进由你决定（重跑 `/spec-design`）；没有 SPEC 就跑 `/spec-issues` 会被提示先设计——**访谈完不想设计、设计完不想拆 issue，都可以停，回来接着跑对应的 skill 就行**。需求决策 ADR 追加式保留全部历史；issue 执行状态只看 GitHub、本地不记进度。架构导读住 `docs/ARCHITECTURE.md`（全局图 + 分层导读 + 横切约定 + 关键决策索引；首轮设计拍板后创建，只在结构或全局约定变化时更新，「为什么」一律住 ADR）；SPEC 里另有本轮模块图。

projkit 母本升级后（问题库补充、同步规则改进），可以刷新本项目的三个 spec-* skill 和本文件。project-bootstrap skill 只存在于 projkit 仓库、不随样板分发，所以要**在 projkit 的 checkout 里开会话**，跑 `/project-bootstrap <本项目路径>`（Codex 中 `$project-bootstrap`）——刷新只碰方法论文件，AGENTS.md、settings、specs、issues 都不动，覆盖前会展示 diff。

**需求变更按触及层级分流**：只动单模块内部 → 直接重跑该模块的三环；触及全局（新增/删模块、改边界、横切约定变动）→ 先 `/spec-interview 全局` + `/spec-design 全局`（更新架构导读，**波及清单**写进跨模块 ADR），再只对被点名的模块重走模块轮，没被点名的零改动。两条路最后都靠 `/spec-issues` 存量同步收口——issue 是 mini-spec，SPEC 变了它就过期了，该改就改、该关就关（带原因）；已完成部分的变更开新 issue，不重开旧的。

事实来源分工不要混：`docs/adr/` 是「决策史」（追加式），`specs/` 是「当前意图」（版本演进靠 git，不在文件里记变更日志），issue 看板是「执行状态」，PRD 原文只是访谈的输入。

## 标准开发循环（每个 issue 走一遍）

（本节按 Claude Code 的操作描述；Codex 等其他工具用等价物——Plan Mode ≈ 只读探索/计划模式，`/code-review` ≈ `/review`，`/clear` ≈ 新开会话。）

1. 认领 issue：`gh issue view <编号>`
2. **Explore**：Plan Mode（Shift+Tab）下只读探索相关代码
3. **Plan**：让 Claude 写实施计划；能用一句话说清的 diff 直接跳过规划
4. **Implement**：实现后跑测试/lint 验证，要求 Claude 出示证据（测试输出、命令返回），不接受口头「完成了」
5. **Commit + PR**：描述性 commit，`/code-review` 审查后合并
6. 卫生习惯：无关任务之间 `/clear`；同一问题纠正两次还不对就 `/clear` 重开，用吸收了教训的更好 prompt 重来
