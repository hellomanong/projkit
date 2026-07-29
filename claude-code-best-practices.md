# Claude Code 官方标准工程实践指南

> 整理自 Anthropic 官方文档与官方博客，**2026-07-25 完成第三至五轮逐页抓取核实，全部 20 个来源已逐页核实完毕**（其间发现**两篇官方博客本身已过时**，详见文末核实记录与博客来源定位表）。**每个章节标题后标注了主要出处缩写**（对照表见文末来源），正文中的 ⚠️ 是警示标记——标注易踩坑、近期已变更或与流传说法相悖的条目。
>
> 关键溯源结论：业界流传最广的博客《Claude Code Best Practices》（anthropic.com/engineering）现已 **308 永久重定向**至 `code.claude.com/docs/en/best-practices`（实测状态码确为 308）——博客已正式并入官方文档并由 Anthropic 持续维护。想要「最官方」的唯一权威来源就是这份文档。
>
> **读者注意**：Claude Code 迭代很快，本文出现的版本号、默认值、快捷键都可能变。凡是标了具体版本号（如 v2.1.154+）或「默认如何」的地方，落地前请对照当前版本文档复核一次——本文第一章讲的「过时配置有害」同样适用于本文自身。

---

<!-- ========== 给 AI 读者的导航块（人类读者可跳过） ========== -->

> **本文档约 730 行 / 约 33k tokens。不必全文读取。**
> 先读本块判断需要哪一章，再用 `Read` 的 `offset` / `limit` 定向读取。
> 行号会因编辑漂移——若对不上，用「章节」列的标题 grep 校正。

| 要回答的问题 | 章节 | 起始行 |
|---|---|---|
| harness 由哪几层构成、自建配置会不会限制 CC | 一 | 79 |
| CLAUDE.md / rules / skill / subagent / hook 该用哪个 | 二 | 166 |
| hook 真的「确定性」吗、成本真的为零吗 | 2.1.1 | 192 |
| 多来源同名冲突如何解析（各机制规则不同） | 2.4 | 242 |
| 单任务循环、何时该规划、何时直接干 | 三 | 272 |
| 如何让产出可验证而非「看起来完成了」 | 3.3 | 295 |
| CLAUDE.md 怎么写、auto memory 是什么 | 四 | 330 |
| 多人协作、issue 管理、GitHub Actions | 五 | 425 |
| 组织级能强制什么、治理怎么做 | 5.6 | 473 |
| PRD → SPEC → issue → 交付的完整流程 | 六 | 559 |
| workflows / teams / checkpoints / routines | 七 | 573 |
| 出问题了，是不是踩了已知的坑 | 九 | 638 |
| 某条结论的出处、可信度、核实历史 | 来源 | 658 |

> **易变性警告**：凡标了版本号（`v2.1.x`）或「默认如何」的条目都可能已变，
> 以 `code.claude.com/docs` 为准。**已知两篇官方博客本身已过时**——
> Steering 博客的 subagent 嵌套层数、large-codebases 博客的 `.claudeignore`。
> 博客与文档的分工及各自时效性，见「博客来源各自的定位」（685 行）。

<!-- ========== 导航块结束 ========== -->

## 〇、缘起：本文要回答的问题

### A. 机制认知

1. CC 的 harness 由哪几层构成？我在项目里写的 CLAUDE.md / agents / hooks / skills，落在哪一层，与 harness 本体是什么关系？　→ 第一章
2. 各扩展点的**加载时机、上下文成本、确定性强度**分别如何？选型依据是什么？　→ 第二章
3. 同一机制在 managed / user / project / plugin 多层都定义时，**冲突如何解析**？　→ 2.4
4. 过度配置的代价是什么？有没有**可观测的判断标准**——我怎么知道配置正在拖累 Claude？　→ 一、四

### B. 单人工作流

5. 官方验证过的单任务循环是什么？何时该规划、何时直接干？　→ 3.1
6. 如何让产出**可验证**而不是「看起来完成了」？验证有哪几档，各自的兜底边界在哪？　→ 3.3
7. 长会话的上下文如何管理——clear / compact / rewind / branch / subagent 各自适用什么场景？　→ 3.4

### C. 团队协作

8. 一份 PRD + 原型，如何变成可分配、可验收的工作单元？　→ 3.2、六
9. 多人协作时**进度的事实来源**放在哪？CC 的会话级工具（task list、checkpoint）能否承担项目管理职能？　→ 五、六
10. 团队配置如何共享、评审、演进？谁是 owner？　→ 5.1、5.6

### D. 规模化与治理

11. 大型代码库 / monorepo 有哪些专项配置陷阱？　→ 5.7
12. 新能力（workflows / agent teams / agent view / routines）各自的**规模门槛**是什么？　→ 七
13. 组织层面能强制什么、不能强制什么？成本与合规怎么管？　→ 5.6

### E. 元问题

14. 「官方标准流程」是否存在？如果官方立场是渐进生长，那**第一天该配什么、第 N 个痛点该加什么**？　→ 2.5、十

> **第 14 问的答案先在这里给出：不存在，且刻意不存在。** 官方从未定义「标准项目结构」，反而多处警告不要预先搭框架——配置应当从实际痛点里长出来（见 2.5 渐进式添加原则）。本文能给的「标准」，是**各机制的选型依据**和**添加时机的判断标准**，不是一套开箱即用的目录模板。

---

**术语澄清（贯穿全文）**：CLAUDE.md、`.claude/agents/`、hooks、skills、rules **不是「你自己的一套 harness」**，而是 CC 这个 harness 官方开放的**扩展点（extension points）**，运行在它**之内**而非与之并列。真正意义上的「自建 harness」是用 Claude Agent SDK 自己实现 agent loop，不在本文范围内。这个区分决定了第 4 问的答案形态：机制上不存在「限制」，代价只有**上下文预算**和**确定性**两项——详见第一章。

---

## 一、核心问题：项目里的自建配置（agents / hooks / skills / rules）会限制 CC 吗？　`[bp] [steer] [large-blog] [dw]`

### 先看清 harness 的分层：你能碰的只有一层

「会不会限制」这个问题之所以难答，是因为多数人不清楚自己写的配置落在哪里。CC 作为 harness 的完整分层：

```
┌─ 入口层     CLI / IDE 扩展 / Desktop / Web / GitHub Actions / Agent SDK
├─ Agent Loop 推理 → 工具调用 → 结果回灌 → 再推理，直到收敛
├─ 工具层     Read/Edit/Write/Bash/Grep/Glob/WebFetch/Agent/Skill/Task*/LSP …
├─ 上下文层   CLAUDE.md 注入 · 自动压缩 · /clear · /compact · checkpoint · auto memory
├─ 权限层     permission modes · auto mode 分类器 · sandbox · permissions.allow/deny · hooks 拦截
├─ 编排层     subagents · fork · Agent Teams · Dynamic Workflows · 后台任务
├─ 扩展层 ★   CLAUDE.md · rules · skills · commands · hooks · MCP · plugins · output styles
└─ 会话层     persistence · resume/continue · /branch · rewind · transcript
```

**★ 扩展层是你唯一能写的一层。** 其余七层是 CC 自身实现，你既改不了也不需要改。所以把 CLAUDE.md / hooks / skills 这些配置称作「自己的一套 harness」并不准确——它们**运行在 CC 的 harness 之内**，是它主动开放的插槽，不是与之并列的第二套系统。

**但「自建 harness」这个概念在官方语境里确实存在，只是所指不同**——它指的是**编排层**，不是扩展层。Dynamic Workflows 博客的原话：

> 「Claude 现在可以**当场写出它自己的 harness**，为手头这个任务量身定制。」
>
> 在 Claude Code 之上构建**定制 harness**（custom harnesses on top of Claude Code）——用于研究、安全分析、代码审查——才能达到峰值性能。

所以准确的区分是：

| 说法 | 对应什么 | 是不是「自建 harness」 |
|------|---------|---------------------|
| 写 CLAUDE.md / rules / skills / hooks | **扩展层**——给已有 harness 填插槽 | ❌ 不是。是配置 |
| 写 Dynamic Workflow 脚本编排 subagent | **编排层**——为特定任务定制编排框架 | ✅ 官方认可的「自建 harness」 |
| 用 Claude Agent SDK 自己实现 agent loop | 完全脱离 CC 另起炉灶 | ✅ 但已不在本文范围 |

这个区分决定了「会不会限制 CC」的答案形态：**填插槽的代价只有上下文预算和确定性**（本章后半部分）；**定制编排的代价是协调成本**（官方原话：「并行与专门化必须挣回它们的协调成本」，见第七章）。两者是不同性质的取舍，不能混为一谈。

对应的磁盘布局：

```
~/.claude/                          # 用户级
├── CLAUDE.md                       # 个人全局指令
├── settings.json
├── rules/  agents/  skills/  commands/  output-styles/
├── agent-memory/<name>/            # subagent memory: user 档
└── projects/<project>/memory/      # auto memory（按仓库，machine-local，不进 git）
    └── MEMORY.md                   # 索引，硬限 200 行 / 25KB

<repo>/
├── CLAUDE.md                       # 或 .claude/CLAUDE.md，两者皆可
├── CLAUDE.local.md                 # 加 .gitignore
└── .claude/
    ├── settings.json               # 签进 git ／ settings.local.json 个人覆盖
    ├── rules/  agents/  skills/  commands/  output-styles/  workflows/
    ├── agent-memory/<name>/        # memory: project 档，可签 git 团队共享
    └── agent-memory-local/<name>/  # memory: local 档，加 .gitignore

组织级托管（四层优先级见 5.6）
macOS   /Library/Application Support/ClaudeCode/
Linux   /etc/claude-code/
Windows C:\Program Files\ClaudeCode\
```

### 结论：机制本身不会，用法不当才会

1. **这些机制是官方设计的一等公民**，不是和 CC 对抗的第二套系统。`.claude/agents/`、hooks、skills、slash commands、rules 都是官方文档专门定义的扩展点，用对了是在放大 CC。
2. **但官方明确警告过度配置有害**，原话多处出现：
   - 「如果你的 CLAUDE.md 太长，Claude 会忽略掉一半，因为重要规则被淹没在噪音里。修复：无情地精简。」（best-practices「常见失败模式」之 *The over-specified CLAUDE.md*）
   - 「臃肿的 CLAUDE.md 会导致 Claude 忽略你真正的指令！」判断标准：对每一行问「删掉它 Claude 会犯错吗？不会就删。」
   - 「每加一个功能都消耗一部分上下文。太多不仅占满窗口，还会引入噪音让 Claude 变得不那么有效。」
3. **膨胀不是纪律问题，是结构问题**——Steering 博客给出了因果解释，这是全文最该记住的一句：

   > 「在共享仓库里，CLAUDE.md 会像任何**无主的配置文件**一样生长：每个团队都往里追加自己的指令，而没有任何东西被删掉。这个代价在规模上会复利叠加。」
   >
   > 「每一行都会加载进**每一个**工程师的**每一次**会话，不管跟他的任务有没有关系。这既消耗 token，又稀释了那些真正重要的指令的遵从度。」

   所以「定期精简」治标；治本是**给文件指定 owner**，并让团队专属内容下沉到 path-scoped rules、流程性内容下沉到 skills——从结构上断掉「只增不减」的默认路径。

4. **过时的配置同样有害**：官方要求「预计每 3-6 个月进行一次有意义的配置审查——随着模型演进，过时的指令可能反而限制模型能力」。为老模型写的绕路指令，新模型可能本不需要。⚠️ 原文还有个更实用的**第二触发条件**，本文旧版漏了：「**每当重大模型发布之后感觉性能进入平台期时，也值得做一次审查**」——不必死等 3 个月。
5. **官方的解法不是「不建」，而是把配置当代码养护**：指定 owner、改动走 PR review、定期修剪、观察 Claude 行为是否真的因配置改变而改变。

### 底层原理：一切最佳实践都基于一个约束

> 「Claude 的上下文窗口填满得很快，且性能随填充而下降。上下文窗口是最需要管理的资源。」

每个扩展机制的差别，本质是**上下文成本**与**确定性**的权衡。配置卫生（把内容放到成本最低的正确层）就是不限制 CC 的方法。

---

## 二、扩展机制选型：什么场景用什么　`[feat] [steer] [sub] [mem] [os]`

### 2.1 官方机制对照表

| 机制 | 加载时机 | 上下文成本 | 最佳用途 |
|------|---------|-----------|---------|
| **CLAUDE.md（根目录）** | 会话启动，全程保留，压缩后重读 | 高 | 构建命令、目录结构、代码约定、团队规范（「always do X」类规则） |
| **CLAUDE.md（子目录）** | 读取该目录文件时按需加载 | 低 | 特定子目录的约定 |
| **Rules（`.claude/rules/`）** | 会话启动或匹配 `paths:` glob 时 | 中 | 跨多个位置的交叉约束（如「API 处理器必须用 Zod 验证输入」） |
| **Skills（`.claude/skills/`）** | 启动时只加载名称/描述，调用时加载全文 | 低 | 可复用的多步骤流程（部署清单、发布流程、审查流程） |
| **Subagents（`.claude/agents/`）** | 通过 Agent 工具调用，独立上下文，只返回摘要 | 低 | 会产生大量输出、主对话之后不会再引用的副任务；并行任务 |
| **Hooks** | 生命周期事件触发，配置存在于上下文之外 | 最低（但**不是零**，见下） | 必须每次确定性发生的事（lint、通知、拦截命令、`PreCompact` 备份会话历史） |
| **MCP** | 会话启动只加载**工具名**，完整 JSON schema 延迟到实际调用时 | 低（tool search 默认开启，闲置工具几乎不占用） | 连接外部服务（issue 系统、数据库、Figma） |
| **Code intelligence（LSP）** | 编辑后自动、查符号时按需 | **可能为负** | 类型化语言、grep 慢或不精确的大仓。官方原话：「符号查找常常替代整篇文件读取，净上下文占用反而下降」——**唯一一个可能让上下文变少的扩展**。装插件后生效：`/plugin install typescript-lsp@claude-plugins-official` |
| **Artifact** | 按需发布，产物不回灌上下文 | 低 | 把会话产出发布成私有可交互网页（事故时间线、审查报告），适合「看的比读终端文本清楚」的输出 |
| **Plugins** | 安装后持续可用 | — | 把一套配置打包分发到多个仓库/团队；skill 带命名空间（`/my-plugin:review`）避免冲突 |
| **Output Styles（`.claude/output-styles/`）** | 会话启动注入 system prompt；**改动需 `/clear` 或新会话才生效** | 高 | 重大角色转变（代码助手→通用助手）。**官方警告**：默认会丢弃范围化变更、安全处理等内置软件工程指令（除非设 `keep-coding-instructions: true`）；先看内置的 Proactive / Explanatory / Learning 是否够用。⚠️ 独立的 `/output-style` 命令 **v2.1.73 废弃、v2.1.91 已移除**，改用 `/config` 或直接写 `outputStyle` 设置。仅作用于主对话，subagent 用自己的 system prompt（fork 除外） |
| **系统提示追加（`--append-system-prompt`）** | CLI 标志传入，仅该次调用生效 | 中（首次请求后被 prompt caching 缓存） | 编码标准、输出格式；只追加不替换角色，比自定义输出风格安全。⚠️ **有明显边际递减**——官方原话：「你用这种方式给的指令越多，Claude 遵守得越不严格，尤其当其中有相互矛盾的内容时」。非交互模式另有 `--append-subagent-system-prompt`（v2.1.205+）可追加到每个 subagent |

**压缩（compaction）行为差异**——长会话触发自动压缩时各机制的存活情况：

- 根目录 CLAUDE.md 压缩后会被重读（官方用词是 **memoized**：会话内读一次并缓存，压缩时清缓存重读），「不会跨长会话丢失或降级」；子目录 CLAUDE.md 和路径作用域 rules 压缩后丢失，直到该目录再次被触及
- 已调用的 skills 在共享预算内重注入；调用了多个时，最旧的优先丢弃
- hooks 完全绕过压缩（配置存在于上下文之外）；subagent 只有最终摘要进入主对话
- output styles 与 `--append-system-prompt` **从不被压缩**（它们在 system prompt 里）；后者在会话首次请求后被 prompt caching 缓存

### 2.1.1 关于 hooks 的两个常见误解（据 Steering 博客修正）

**误解一：「hook 的上下文成本是零」**——大部分情况是，但**阻塞类 hook 的 stderr 会进入主上下文**，因为要让 Claude 知道自己为什么被拒。其余 hook 除非配置里显式返回输出，否则不进上下文。

**误解二：「hook 都是确定性的」**——**触发**永远是确定性的，但**执行体不一定**。官方把 hook 分成五类：

| 类型 | 执行体 | 确定性 |
|------|-------|--------|
| `command` | 本地命令 | ✅ 完全确定 |
| `http` | HTTP 端点 | ✅ 完全确定 |
| `mcp_tool` | MCP 工具调用 | ✅ 完全确定 |
| `prompt` | **独立上下文里的模型调用** | ⚠️ 依赖模型判断 |
| `agent` | **独立上下文里的 subagent** | ⚠️ 依赖模型判断 |

原文：「All hooks are deterministically triggered. The first three execute deterministically while the latter two, prompt and agent, use Claude's judgment rather than a set of rules to determine the output.」

所以「要硬约束就用 hook」这句话要**限定为 command / http / mcp_tool 三类**。想用 `prompt` / `agent` 类 hook 做安全护栏，等于把判断权又交回给了模型。

**hook 可注册在三处**：`settings.json`、托管策略设置、以及 **skill / agent 的 frontmatter**（后者常被忽略——skill 可以自带 hook）。

### 2.2 subagent 与 fork 的行为默认值（易踩坑，且近期变过）

- **默认不允许嵌套**：subagent 不能再 spawn subagent，你让它「派人去做」它会自己做完返回一份摘要。要开启需显式设 `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`（值为想要的层数）。⚠️ v2.1.172–v2.1.216 期间曾**默认可嵌套、最多 5 层且不可调**，网上大量资料仍按旧行为描述——**其中包括 Anthropic 自家的 Steering 博客**，该文至今仍写着「subagents can nest up to five levels deep」。这是本文第一章「过时配置有害」最好的现场标本：**连一手来源都会过时，且过时的是官方博客而非文档**。以 `code.claude.com/docs` 为准，博客只当设计意图的参考
- **默认后台运行**（v2.1.198+）：Claude 只在需要立刻拿结果时才放前台。后台 subagent 的内置工具集**比前台小**——官方完整白名单只有 `Read`、`Grep`、`Glob`、`Bash`、`PowerShell`、`Edit`、`Write`、`NotebookEdit`、`WebFetch`、`WebSearch`、`TodoWrite`、`Skill`、`ToolSearch`、`EnterWorktree`、`ExitWorktree`、`Monitor`、`TaskStop`、`SendMessage`、`Artifact`（MCP 工具全部保留），其余内置工具即使写进 `tools` 字段也会被移除且**不报错**。同一份定义在前后台可能解析出不同工具。权限提示会冒泡到主会话（v2.1.186+，此前后台 subagent 会直接自动拒绝）。`Ctrl+B` 可把运行中任务转后台
- **fork 是上面两条的例外**：fork 继承父会话的**完整工具池和 system prompt**，同时跳过「移除 Agent 工具」和「后台工具集裁剪」两道过滤。skill 加 `context: fork` 即可在 subagent 里跑；v2.1.218 起 forked skill **默认后台**，设 `background: false` 转前台（前台 fork 的文件编辑会被 checkpoint 追踪，后台的不会——见第七章）

**subagent frontmatter 全字段**（常被低估的可配置面）：`name`（必填，文件名不必与之一致）、`description`（必填）、`tools`、`disallowedTools`、`model`、`permissionMode`、`mcpServers`、`hooks`、`maxTurns`、`skills`、`initialPrompt`、`memory`、`effort`、`background`、`isolation`、`color`；system prompt 写在 markdown 正文里，不是 frontmatter 字段。其中 `skills:` 列出的 skill 会在启动时**全文预加载**进它的上下文（不是按需）；`Agent(agent_type)` 语法可在主 agent（`claude --agent`）的 `tools` 里限定它只能派出哪几类 subagent。

**三个实用细节**：

- Claude 可以帮你写 hook：直接说「写一个每次文件编辑后跑 eslint 的 hook」「写一个阻止写入 migrations 目录的 hook」；`/hooks` 查看已配置项
- skill 的 frontmatter 加 `disable-model-invocation: true`，可让带副作用的流程（部署、发版）只允许手动 `/名字` 触发，Claude 不会自动调用，且**上下文成本降到零**（描述都不加载）
- 对**别人写的** skill（插件带的、团队共享的），不改它的文件也能隐藏：在设置里配 `skillOverrides`

### 2.3 常见误用与纠正（据 features-overview 与 Steering 博客整理）

| 误用 | 纠正 |
|------|------|
| 在 CLAUDE.md 写「每次 X 后总是做 Y」 | 用 **hook**——CLAUDE.md 是建议性的，hook 是确定性的 |
| 在 CLAUDE.md 写「永远不要做 X」当硬约束 | 用 **PreToolUse hook（exit code 2 拦截）** 或管理员托管设置；prompt 无法实现硬约束 |
| 30 行流程步骤写进 CLAUDE.md | 放 **skill**，仅调用时加载 |
| API 专属规则全局加载 | 用 **rules + `paths:` 作用域**，无关工作时不加载 |
| 个人偏好写进项目级配置 | 放用户级 `~/.claude/CLAUDE.md` 或 gitignore 掉的 `CLAUDE.local.md` |
| 不带 `paths` 的 rule | 官方原话：「无作用域的 rule 与把内容写进 CLAUDE.md **机制上完全等价**——永远加载，永远消耗 token」 |
| 可复用的专业知识塞进 CLAUDE.md | 该进 **skill**。CLAUDE.md 只放 Claude **需要一直持有**的事实（构建命令、monorepo 布局、团队约定） |
| 同一会话里既探索又编辑 | 探索交给 **subagent** 隔离，主会话留给编辑——这是 large-codebases 博客列的 subagent 头号误解 |
| 以为 LSP 装了就自动生效 | **要装对应语言的 code intelligence 插件**才激活，不是默认能力 |
| 基础配置没做好就先接 MCP | 官方列为 MCP 头号误解：「在基础工作之前构建 MCP 连接」。先把 CLAUDE.md、测试命令、权限理顺 |
| 好用的配置只留在自己机器上 | 打包成 **plugin** 分发。官方原话是让好配置「保持部落化（tribal）」是一种浪费 |

### 2.4 多来源同名冲突：各机制的解析规则不一样

同一个机制可以在 managed / user / project / plugin 多处定义。**它们的冲突解析规则互不相同**，这是配置分层里最容易想当然的地方——不要以为都跟 CLAUDE.md 一样叠加。

| 机制 | 冲突行为 | 优先级顺序 |
|------|---------|-----------|
| **CLAUDE.md** | **叠加**（所有层级的内容同时进入上下文） | 无覆盖概念；指令冲突时 Claude 自行裁量，通常更具体的胜出 |
| **Skills** | **按名覆盖**，只有一个定义生效 | managed > user > project（插件 skill 带命名空间，不参与冲突） |
| **Subagents** | **按名覆盖** | managed > CLI 标志 > project > user > plugin |
| **MCP servers** | **按名覆盖** | local > project > user |
| **Hooks** | **合并**，所有来源的 hook 都会触发 | 无优先级，全部执行 |

两个补充细节：

- **project subagent 从当前工作目录逐级向上发现**，沿途每个 `.claude/agents/` 都会被扫描；v2.1.178 起同名时**离工作目录最近的胜出**。但**同一目录内**（含子文件夹）同名，只加载其中一个且由文件系统读取顺序决定——没有文档化的优先级，属于要避免的状态。`/doctor`（v2.1.205+）会报告同目录重名并建议改名
- **设置项（settings.json）的合并规则见 5.6**：数组类设置跨来源合并，但有两个例外是替换

### 2.5 渐进式添加原则（官方推荐的配置成长路径）

**配置从实际痛点里长出来，不是预先设计出来的**——「先搭一套豪华 harness 再开工」恰恰是官方不推荐的做法：

1. Claude 第二次犯同样的错 → 写进 CLAUDE.md
2. 同一个 prompt 反复手打 → 存成 skill
3. 同一套多步骤流程反复粘贴 → 做成 skill
4. 某个副任务总把主对话灌满不再引用的输出 → 用 subagent
5. 某件事必须每次自动发生、不需要 Claude 判断 → 写 hook
6. 第二个仓库也要用同一套配置 → 打包成 plugin

---

## 三、官方标准工作流　`[bp]`

### 3.1 单任务标准循环：Explore → Plan → Code → Commit

官方明确写明「在 Anthropic 内部团队和各类代码库中验证有效」的四阶段：

1. **Explore**：进 Plan Mode（`Shift+Tab`），只读探索代码，不做修改
2. **Plan**：让 Claude 写详细实施计划，`Ctrl+G` 可在编辑器里直接改计划
3. **Implement**：退出 Plan Mode 编码，对照计划验证
4. **Commit**：描述性 commit + 开 PR

**何时跳过规划**（官方原话）：「如果你能用一句话描述这个 diff，就跳过 plan。」规划最有价值的场景：方案不确定、改动跨多文件、不熟悉这段代码。改错字、加日志、重命名直接让 Claude 做。

### 3.2 从需求到 SPEC：「Let Claude interview you」

对较大功能，官方推荐的流程（等价于 spec-driven development，官方没有用这个名字）：

> 「我想构建 [功能简述]。用 AskUserQuestion 工具详细采访我。问技术实现、UI/UX、边界情况、顾虑和权衡。不要问显而易见的问题，深挖我可能没考虑到的难点。持续采访直到覆盖所有方面，然后把完整 spec 写到 SPEC.md。」

- SPEC 写完后**开一个全新 session 去执行**——新会话上下文干净、完全聚焦实现
- 好 spec 的三个特征：**写明涉及的文件和接口、写明什么不在范围内、以一个端到端验证步骤收尾**
- 官方强调：「把 spec 写精确所花的时间，比盯着实现过程更值。」

### 3.3 验证：给 Claude 一个能跑的检查

> 「给 Claude 一个它能运行的检查：测试、构建、截图对比。这是你能走开的会话和必须盯着的会话的区别。」

没有检查时「看起来完成了」是唯一信号，你就成了人肉验证环。验证强度四档（从轻到重）：

1. **单条 prompt 内**：要求实现后跑测试并迭代到通过
2. **跨会话**：设为 `/goal` 条件，每轮后独立评估器复查
3. **确定性门禁**：Stop hook 跑检查脚本，不通过就阻止本轮结束。⚠️ **但它不是绝对门禁**——官方明确：**连续被阻塞 8 次后，Claude Code 会覆盖该 hook 强行结束本轮**。设计无人值守流程时必须把这个上限算进去，别假设「不通过就永远不停」
4. **第二意见**：独立 subagent / `/code-review` / workflow 用新上下文对抗式复核

配套要求：让 Claude **出示证据**（测试输出、跑过的命令及返回、截图），而不是口头宣称成功。

### 3.4 提示词与上下文管理要点

- **具体化 prompt**：指明文件、场景、约束、参照的既有模式；描述症状+可能位置+「修好」的标准（如「先写一个失败测试复现，再修」）
- **用 `@` 引用文件、直接贴图、给 URL、管道喂数据**（`cat error.log | claude`）
- **尽早纠偏**：`Esc` 打断、`/rewind` 回退；同一问题纠正两次还不对 → `/clear` 重开，用吸收了教训的更好 prompt 重来——「干净会话+好 prompt 几乎总是胜过积累了失败尝试的长会话」
- **无关任务之间 `/clear`**；调查类任务用 subagent 隔离，避免灌满主上下文
- **新人上手**：像问资深工程师一样直接问代码库问题（「logging 怎么工作的？」「如何新增一个 API endpoint？」「333 行为什么调 `foo()` 不调 `bar()`？」）——官方认可的 onboarding 工作流，无需特殊 prompt，可显著缩短上手时间、减少对老工程师的打扰
- **精细压缩控制**：`/compact <指令>` 定向压缩（如 `/compact Focus on the API changes`）；`Esc+Esc` / `/rewind` 选中某条消息后可「Summarize from here / up to here」做局部压缩；还可在 CLAUDE.md 里声明压缩时必须保留的内容（如「压缩时始终保留已修改文件清单和测试命令」）
- **旁路问题用 `/btw`**：答案显示在可关闭浮层里，不进入对话历史、不占上下文
- **会话即分支**：`/rename` 给会话起描述性名字（如 `oauth-migration`），`claude --continue` 继续最近会话、`claude --resume` 从列表挑选——跨多天的任务不必重新解释上下文
- **真正要「分叉」用 `/branch`**，别用 summarize：官方明确区分两者——summarize 留在**同一会话内**压缩上下文；想**保留原会话完整不动、另起一路试别的方案**，用 `/branch` 或 `claude --continue --fork-session`。这是长任务里被低估的一招：主线不必为一次实验性尝试付出污染代价

### 3.5 权限配置：减少打断的三档方式

默认对可能修改系统的动作逐一请求批准——安全但繁琐（官方原话：「第十次批准之后你其实已经不在审查了，只是在点下一步」）。官方给出三档：

1. **Auto mode**：独立分类器审查命令，只拦截可疑动作（权限升级、未知基础设施、恶意内容驱动）——适合方向可信、不想逐步点击的任务
2. **权限白名单**：`/permissions` 允许确定安全的具体命令（如 `npm run lint`、`git commit`）；常用文档域名也可加白
3. **Sandbox**：`/sandbox` 开 OS 级隔离，限制文件系统和网络访问，让 Claude 在边界内自由工作

---

## 四、CLAUDE.md 与记忆系统　`[mem] [bp]`

**定位**：Claude 每次会话开始读取的特殊文件，提供「无法从代码推断的持久上下文」。

**必须先理解它的性质**：CLAUDE.md 的内容是**作为 system prompt 之后的一条用户消息**注入的，不是 system prompt 本身。官方原话——「Claude 读它并尝试遵守，但**没有严格遵守的保证**，指令含糊或互相冲突时尤其如此」。所以：

- 它是**上下文，不是强制配置**。要无论 Claude 怎么判断都必须阻止某个动作，只能用 **PreToolUse hook**（exit code 2）或托管设置，写多少个「YOU MUST」都不算数
- 多个 CLAUDE.md 之间**指令冲突时 Claude 可能任选其一**，所以要定期检查根目录、子目录、`.claude/rules/` 之间有没有互相打架的规则
- 「Claude 不听话」的排查顺序：`/context` 确认文件加载了 → 确认文件位置在加载路径上 → 把指令写具体（「用 2 空格缩进」而非「格式化好代码」）→ 找冲突指令 → 还不行说明文件太长，规则被淹没了

### 分层结构

按加载顺序从宽到窄（越靠后越贴近当前工作目录，因而在上下文里越靠后被读到）：

| 层级 | 路径 | 用途 | 共享方式 |
|------|------|------|---------|
| 组织级托管 | macOS：`/Library/Application Support/ClaudeCode/CLAUDE.md`<br>Linux/WSL：`/etc/claude-code/CLAUDE.md`<br>Windows：`C:\Program Files\ClaudeCode\CLAUDE.md` | 组织强制规则 | IT 用 MDM/组策略/Ansible 分发，**用户不可用 `claudeMdExcludes` 排除** |
| 用户级 | `~/.claude/CLAUDE.md` | 个人所有项目偏好 | 仅自己 |
| 项目级 | `./CLAUDE.md` **或 `./.claude/CLAUDE.md`**（两者皆可） | 团队共享项目约定 | **签进 git** |
| 本地级 | `./CLAUDE.local.md` | 个人项目内偏好 | 加 `.gitignore` |
| 子目录级 | `./sub/CLAUDE.md` | 该目录局部约定 | 按需加载，目录 owner 维护 |

组织级还有一条不用铺文件的路子：在 `managed-settings.json` 里直接写 `claudeMd` 字段内联内容（只在 managed/policy 层生效，写在用户/项目层无效）。官方对两者的分工说得很清楚——**技术性强制用 managed settings（`permissions.deny`、`sandbox.enabled`），行为性引导才用 managed CLAUDE.md**，因为前者由客户端强制执行，后者只是塑造行为、不是硬执行层。

**加载与合并规则**：Claude 从当前工作目录逐级向上walk，沿途每个 `CLAUDE.md` 和 `CLAUDE.local.md` 全部**拼接**进上下文（不是互相覆盖），顺序从文件系统根到工作目录；同一目录内 `CLAUDE.local.md` 排在 `CLAUDE.md` 之后。工作目录**以下**的子目录文件不在启动时加载，等 Claude 读到那个目录的文件时才进来。压缩后：**根 CLAUDE.md 会从磁盘重读并重新注入**，子目录 CLAUDE.md 不会自动重注入，要等下次触及该目录。

### 内容取舍（据官方 best-practices 表逐行翻译）

| ✅ 应包含 | ❌ 应排除 |
|----------|----------|
| Claude 猜不到的 Bash 命令 | 读代码就能推出的信息 |
| 与默认不同的代码风格 | 标准语言惯例 |
| 测试指令与首选 test runner | 详细 API 文档（应链接而非复制） |
| 仓库礼仪（分支命名、PR 约定） | 经常变化的信息 |
| 项目特有架构决策 | 长篇解释和教程 |
| 开发环境的坑（必需的环境变量） | **逐文件描述代码库** |
| 常见陷阱、非显而易见的行为 | 「写干净代码」这类自明道理 |

❌ 里「逐文件描述代码库」最值得单独拎出来：它是 CLAUDE.md 臃肿的头号来源，也是 `/doctor` 瘦身检查首先要砍的东西（见下）。

### 写法要点

- **目标控制在 200 行以内**，超出的内容移到 path-scoped rules 或 skills。注意官方用词是「target under 200 lines」——**CLAUDE.md 不会因超长被截断**（「loaded in full regardless of length」），只是更长＝更费上下文＋遵从度下降。真正有硬截断的是 auto memory 的 `MEMORY.md`（见下节），两个 200 别混
- `/init` 生成初始版本；已有 CLAUDE.md 时它会提改进建议而非覆盖。⚠️ **迁移范围有讲究**：默认只读 Cursor 规则（`.cursor/rules/`、`.cursorrules`）和 Copilot 规则（`.github/copilot-instructions.md`）。**`AGENTS.md` 默认不读**——官方明确「Claude Code reads `CLAUDE.md`, **not** `AGENTS.md`」。已有 AGENTS.md 的仓库要么建一个 `CLAUDE.md` 写 `@AGENTS.md` 导入（还能在下面追加 Claude 专属指令），要么 `ln -s AGENTS.md CLAUDE.md`；设 `CLAUDE_CODE_NEW_INIT=1` 后 `/init` 才会读 AGENTS.md、`.windsurfrules`、`.clinerules` 等
- 运行 `/context` 看 **Memory files** 一栏，确认文件真的加载了——这是排查「Claude 不听 CLAUDE.md」的第一步
- 「Check CLAUDE.md into git so your team can contribute. The file compounds in value over time.」
- Monorepo：根目录只放大局指针和关键陷阱，各包放自己的 CLAUDE.md；用 `claudeMdExcludes` 排除无关团队的文件
- 可用 `@path/to/file` 语法 import 其他文件（相对路径按**文件自身位置**解析，最多递归 4 跳）；重要规则可加 IMPORTANT / YOU MUST 强调。注意 import **不省上下文**——被导入文件在启动时一并展开加载
- ⚠️ 项目级 CLAUDE.md 里指向工作目录**之外**的 import（如 `@~/.claude/my-instructions.md`）算「外部导入」，首次会弹审批框列出文件；**一旦拒绝就永久禁用且不再提示**。这是防别人往共享项目里塞外部文件的保护。用户级记忆文件（`~/.claude/CLAUDE.md`）里的 import 不受此限
- **块级 HTML 注释 `<!-- 维护者备注 -->` 在注入前会被剥离**——给人类看的说明不花上下文（代码块内的注释保留）
- 像代码一样对待：出问题时 review、定期修剪、观察行为是否真的改变
- 两个专门的排障/瘦身工具：**`/doctor`**（v2.1.206+）会为签进 git 的 CLAUDE.md 提修剪方案——砍掉能从代码推出的目录结构、依赖列表、架构概览，保留陷阱、设计理由和与工具默认不同的约定；**`InstructionsLoaded` hook** 可记录到底加载了哪些指令文件、何时加载、为何加载，专门用来调试路径作用域规则和子目录懒加载
- 若指令必须在固定时机执行（每次提交前、每次编辑后），别写进 CLAUDE.md，写成 **hook**；若需要 system prompt 级别的强制，用 `--append-system-prompt`（每次调用都要传，更适合脚本而非交互）

### `.claude/rules/`：CLAUDE.md 超长时的首选出口

官方对「CLAUDE.md 太长怎么办」的第一答案不是拆 import，而是 **path-scoped rules**——只在 Claude 碰到匹配文件时才加载：

```markdown
---
paths:
  - "src/api/**/*.ts"
  - "src/**/*.{ts,tsx}"
---
# API 开发规则
- 所有 endpoint 必须做输入校验
- 用统一的错误响应格式
```

- 每个文件一个主题，文件名要有描述性（`testing.md`、`api-design.md`）；支持子目录递归发现
- **不带 `paths` 的 rule 无条件加载**，优先级等同 `.claude/CLAUDE.md`；带 `paths` 的只在读到匹配文件时触发（不是每次工具调用）
- 用户级 `~/.claude/rules/` 先于项目级加载，因而项目规则优先级更高
- 目录支持符号链接，可跨项目共享同一套规则，循环链接会被检测处理
- 选型：**规则跟着代码走、由目录 owner 维护 → per-directory CLAUDE.md**；**想集中管理、或同一条规则要覆盖散落各处的路径 → path-scoped rule**

### 另一半记忆系统：Auto memory

这一章到此讲的都是**你写给 Claude** 的 CLAUDE.md。官方的记忆体系其实是两套，另一套是 **Claude 自己写给自己**的 auto memory（默认开启）：

| | CLAUDE.md | Auto memory |
|---|---|---|
| 谁写 | 你 | Claude |
| 内容 | 指令和规则 | 它自己摸索出的经验、模式 |
| 作用域 | 项目 / 用户 / 组织 | **按仓库**，同仓库各 worktree 共享 |
| 加载 | 每次会话，**全量不截断** | 每次会话，**只读前 200 行或 25KB** |

- 存储位置 `~/.claude/projects/<project>/memory/`，入口是 `MEMORY.md`（索引），详细内容分散在主题文件里按需读取
- ⚠️ **`MEMORY.md` 的 200 行 / 25KB 是硬限制**：超出部分下次加载直接丢弃，写超了会报错要求重写索引。这和 CLAUDE.md 的「建议 200 行」性质完全不同
- ⚠️ **对协作的关键含义：auto memory 是 machine-local 的**——不进 git、不跨机器、不跨云环境共享。团队成员各自积累各自的。要团队共享的知识必须显式写进 CLAUDE.md 或 rules
- 主会话的 auto memory **不会**加载进 subagent（fork 除外）；subagent 可用 frontmatter 的 `memory: user|project|local` 开自己的记忆目录，其中 **`project` 档存 `.claude/agent-memory/<name>/`，可以签进 git 团队共享**——这是少数能共享的 agent 经验积累方式
- 关掉：`/memory` 里切换、设 `autoMemoryEnabled: false`，或 `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`。关掉后 subagent 的 `memory` 字段一并失效
- `/memory` 浏览和编辑所有记忆文件，`/context` 确认本次会话实际加载了什么

---

## 五、多工程师协作：官方立场是「回归 git/GitHub」　`[bp] [gha] [review] [admin] [large-blog] [large]`

官方没有为 CC 另造一套项目管理体系，立场是把 CC 接进已有的 git/GitHub 流程。**进度的单一事实来源在 GitHub（issue 看板 + PR 状态），不在任何人的 CC 会话里。**

### 5.1 配置共享

- 项目级 CLAUDE.md、`.claude/agents/`、`.claude/skills/`、`.claude/rules/` 全部**签进 git 团队共建**，改动走 PR review
- 一套配置多仓库复用 → 打包成 plugin 分发

### 5.2 Issue 管理：官方明确推荐 `gh` CLI

> 「CLI tools are the most context-efficient way to interact with external services. If you use GitHub, install the `gh` CLI. Claude knows how to use it for creating issues, opening pull requests, and reading comments.」

**必须装 `gh` 的实际理由**：没有它 Claude 仍能调 GitHub API，但**未认证请求经常撞速率限制**。

官方示例 skill `/fix-issue` 即标准范式：`gh issue view` 获取详情 → 理解问题 → 搜索相关文件 → 实现 → 写测试验证 → 过 lint/typecheck → 写描述性 commit → push 并开 PR。这个 skill 的 frontmatter 带 `disable-model-invocation: true`——**带副作用的流程应当只允许手动 `/fix-issue 1234` 触发**，不让 Claude 自行判断要不要跑。团队里凡是会推分支、发版、改线上状态的 skill，都该照此办理。

### 5.3 GitHub Actions 官方集成

- `/install-github-app` 一键安装；在任何 issue/PR 里 `@claude` 提及，即可让它实现功能、修 bug、开 PR，且遵循仓库 CLAUDE.md
- 仓库根目录 CLAUDE.md 定义代码风格与审查标准；API key 用 GitHub Secrets
- 底层是 `anthropics/claude-code-action`（构建在 Claude Agent SDK 之上）；v1.0（GA）简化了配置：`prompt` 取代 `direct_prompt`，CLI 参数统一走 `claude_args`，`mode` 已移除改为自动检测；支持 Amazon Bedrock / **Google Cloud's Agent Platform**（原 Vertex AI，官方已更名）部署，均走 OIDC 认证。`--max-turns` 默认 10
- **`prompt` 可以直接传 skill 调用**，不只是自然语言——这是把本地流程搬进 CI 最省事的方式。配合 `plugin_marketplaces` 和 `plugins` 两个 input 还能在 CI 里装插件后调它的 skill：

  ```yaml
  - uses: anthropics/claude-code-action@v1
    with:
      anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
      plugin_marketplaces: "https://github.com/anthropics/claude-code.git"
      plugins: "code-review@claude-code-plugins"
      prompt: "/code-review:code-review ${{ github.repository }}/pull/${{ github.event.pull_request.number }}"
  ```

  仓库自带的 `.claude/skills/` 里的 skill 则需先跑 `actions/checkout`，再传 `/skill-name`
- `/install-github-app` 在 v2.1.187+ 支持只装 App、**Skip for now** 跳过工作流配置，之后再跑一次补上
- 另有托管服务 **Code Review**（Team/Enterprise 研究预览，与 claude-code-action 是两回事）：PR 打开/push 时自动触发多 agent 并行审查，按严重度打内联评论（🔴 Important / 🟡 Nit / 🟣 Pre-existing），只评论、不 approve/block PR；用仓库根目录 `REVIEW.md`（审查专用最高优先级指令，独立于 CLAUDE.md）定制审查行为。本地对应 `/code-review` 命令

### 5.4 双会话质量模式

- **Writer/Reviewer**：一个会话实现，另一个用干净上下文审查——「新上下文的 Claude 不会偏袒自己刚写的代码」；也可一个写测试、另一个写实现
- **对抗式审查的官方警告**：「被要求找问题的 reviewer 总会报出一些问题，即使工作本身没毛病。追着每条发现修会导致过度工程化。要告诉 reviewer 只报影响正确性或既定需求的问题，其余当可选项。」

### 5.5 规模化与自动化

- **非交互模式**：`claude -p "prompt"` 接入 CI、pre-commit、脚本；`--output-format json` 返回单个含 `result` 字段的 JSON 对象，`--output-format stream-json`（**必须同时加 `--verbose`**）每行一个 JSON 对象、以 init 事件开头。`-p` 跑出来的会话默认仍可 resume，除非加 `--no-session-persistence`
- **批量 fan-out**：大迁移先让 Claude 列任务清单，脚本循环逐文件调 `claude -p`，用 `--allowedTools` 限权；**先在 2-3 个文件上试跑调好 prompt，再全量执行**
- **并行会话**：git worktrees / Desktop App 多会话 / Claude Code on the web（云端隔离 VM）/ Agent teams（自动协调）

### 5.6 组织级推广（大团队）

**部署决策**：Team/Enterprise 订阅（默认推荐，per-seat）/ Console 按量计费 / Amazon Bedrock / Google Cloud's Agent Platform / Microsoft Foundry 复用已有云合规。⚠️ 注意功能不等价：**Claude Code on the web、Routines、Code Review、Remote Control、Chrome 扩展需要 claude.ai 账号**，光有 Console API key 或云厂商凭证用不了——走云厂商部署的组织要另行规划是否还需 Team/Enterprise 席位。

**托管设置分发：四层优先级**（本文旧版只写了三层，漏了最低一层）

| 优先级 | 机制 | 路径 | 平台 |
|--------|------|------|------|
| 最高 | Server-managed | claude.ai 管理后台（认证时下发 + 每小时刷新） | 全平台 |
| 高 | plist / registry 策略 | macOS `com.anthropic.claudecode`<br>Windows `HKLM\SOFTWARE\Policies\ClaudeCode` | macOS / Windows |
| 中 | 文件型 managed-settings.json | macOS `/Library/Application Support/ClaudeCode/`<br>Linux/WSL `/etc/claude-code/`<br>Windows `C:\Program Files\ClaudeCode\` | 全平台 |
| 最低 | Windows 用户注册表 | `HKCU\SOFTWARE\Policies\ClaudeCode` | 仅 Windows |

- CC 按顺序检查，**采用第一个返回非空配置的来源**
- ⚠️ **`policyHelper` 凌驾于全部四层之上**：一旦配置，它的输出成为该次运行**唯一**的托管配置，四个来源全部失效。做组织策略设计时必须先确认有没有人配了它
- HKCU 无需管理员权限即可写入，**不是强制通道**，只能当便利默认值；plist 和 HKLM 需要提权，才具备防篡改能力
- WSL 默认只读 Linux 路径 `/etc/claude-code`；要让 Windows 侧策略覆盖到 WSL，需在 HKLM 或 `C:\Program Files\ClaudeCode` 里设 `wslInheritsWindowsSettings: true`
- 验证生效：让开发者跑 `/status`，**Setting sources** 一行会显示 `Enterprise managed settings` 及来源 `(remote)` / `(plist)` / `(HKLM)` / `(HKCU)` / `(file)`

**设置项的合并规则**（易误判）：托管值优先于用户和项目设置；**数组类设置（如 `permissions.allow`、`permissions.deny`）跨来源合并**——开发者只能往上加，不能删掉组织加的条目。**两个例外**：`fallbackModel` 和 `availableModels` 是**替换**而非合并。

**可强制项清单**（官方现有 15 类，本文旧版只列了 7 项）

| 控制面 | 关键设置 |
|--------|---------|
| 权限规则 | `permissions.allow` / `permissions.deny` |
| **权限锁定** | `allowManagedPermissionRulesOnly`（只有托管规则生效）、`permissions.disableBypassPermissionsMode`（禁用 `--dangerously-skip-permissions`） |
| 沙箱 | `sandbox.enabled`、`sandbox.network.allowedDomains` |
| 组织级 CLAUDE.md | 托管策略路径下的文件，**用户不可排除** |
| MCP 服务器管控 | `allowedMcpServers`、`deniedMcpServers`、`allowManagedMcpServersOnly`，或部署 `managed-mcp.json` |
| 插件市场管控 | `strictKnownMarketplaces`、`blockedMarketplaces`、`disableSideloadFlags`、`pluginSuggestionMarketplaces` |
| **自定义能力锁定** | `strictPluginOnlyCustomization` |
| Hook 限制 | `allowManagedHooksOnly`、`allowedHttpHookUrls` |
| 登录强制 | `forceLoginMethod`、`forceLoginOrgUUID`（v2.1.212 起覆盖终端/VS Code/Agent SDK） |
| 关闭 agent view | `disableAgentView` |
| 企业启动器 | `processWrapper`（给后台 agent 进程套一层公司要求的 launcher，替代直接关闭） |
| 模型限制 | `availableModels`、`enforceAvailableModels` |
| 版本下限 | `minimumVersion`（阻止降级） |
| **版本区间强制** | `requiredMinimumVersion` / `requiredMaximumVersion`（超出范围**直接拒绝启动**，比 `minimumVersion` 更强） |

> **`strictPluginOnlyCustomization` 值得单独强调**——它禁止 user 和 project 来源的 skills / agents / hooks / MCP，只允许来自 plugin 或托管设置。这条给开篇第 1、13 问补上了另一面：**不只是「自建配置会不会限制 CC」，还有「组织可能根本不允许你在项目里自建」**——此时本文所有关于 `.claude/` 的建议都要改走 plugin 分发路径。在受管环境里落地本文任何建议前，先跑 `/status` 确认这条有没有被打开。

**权限与沙箱覆盖不同层**：deny 掉 WebFetch 只挡住 Claude 的抓取工具，但只要 Bash 可用，`curl` / `wget` 照样能访问任意 URL——**这个缺口只能靠沙箱的 OS 级网络域名白名单补上**。

**用量可见性**：Teams/Enterprise 在 [claude.ai/analytics](https://claude.ai/analytics/claude-code) 看采纳与贡献指标（含 leaderboard），per-user 用量和花费在**spend report**（分析设置里）而非 dashboard；Console 在 platform.claude.com/claude-code 看 per-user 用量/花费。程序化取数分两套 API：Enterprise 用 Enterprise Analytics API，Console 用 Claude Code Analytics API。全部 provider 都支持 OpenTelemetry 导出。

**数据**：Team/Enterprise/API/云厂商计划下 Anthropic 不用代码或 prompt 训练模型；合格 Enterprise 账户可申请 Zero Data Retention。需要请求级审计日志或按数据敏感度路由，可在开发者与 provider 之间架 Claude apps gateway。

**治理建议**（据 large-codebases 博客，**注意：这些内容已不在当前 admin-setup 文档页**，该页现已改为纯部署决策地图）：

- **跨职能工作组**：「我们观察到最顺畅的部署，都出现在那些早期就建立跨职能工作组的组织——把**工程、信息安全、治理**三方代表拉到一起。」
- **没有专职团队时的最小可行版本是一个 DRI**：「一个人，对 Claude Code 配置拥有所有权，并有权对**设置、权限策略、插件市场、CLAUDE.md 约定**做决定。」——注意这四项就是 DRI 的职权边界，比笼统的「负责人」可操作得多
- **正在出现的新角色 agent manager**：原文定义为「一个 **PM/工程师混合职能**，专门管理 Claude Code 生态」——不是纯工程岗
- **从受限起步逐步放开**：「先从一组**已批准的 skills**、**强制的代码审查流程**、**受限的初始访问权限**开始，随着信心建立再逐步扩大。」
- **推广前先投资基础设施**：「传播最快的那些推广，都在大范围开放访问**之前**做了专门的基础设施投入。一个小团队——有时甚至只有一个人——把工具链接好，让开发者第一次接触 Claude 时它就已经嵌进了工作流。」
- **配置审查周期**：每 3-6 个月一次，外加「重大模型发布后性能进入平台期时」这个触发条件（见第一章第 4 条）

### 5.7 大型代码库专项

- **导航原理**：CC 靠文件系统遍历、grep 搜索和代码引用追踪导航，全部在开发者本机执行——无需构建/维护/上传代码库索引，也避免了 RAG 系统嵌入管道滞后的问题。补充：若组织**已有**代码搜索或 RAG 索引，官方建议把它包成 MCP 工具暴露给 Claude 查询，而不是让 Claude 逐个读文件
- **第一个决策是「从哪里启动 claude」**，它同时决定三件事：能读写哪些文件、启动时加载哪些 CLAUDE.md、哪个 `.claude/settings.json` 生效

  | 启动位置 | 文件访问 | 启动时加载的 CLAUDE.md | 适用 |
  |---------|---------|---------------------|------|
  | 仓库根 | 全部文件 | 仅根目录；子目录文件在读到时按需加载 | 任务跨多个包/子系统 |
  | 某子目录 | 仅该子树（除非另行授权） | 该目录的 + 每一级祖先的 | 工作范围限于单个包 |

- ⚠️ **`.claude/settings.json` 不像 CLAUDE.md 那样向上继承**：它**只从启动目录加载**。放在仓库根的配置，只有从根启动时才生效——从子目录启动时完全不读。这是大仓最容易踩的坑，每个子目录的 settings 必须自包含
- **排除生成代码与 vendored 代码**：内容搜索**默认就尊重 `.gitignore`**，`node_modules/`、`dist/`、`build/` 无需额外配置。对于**已签进 git** 的生成代码或 vendored SDK，用 `permissions.deny` 里的 `Read()` 规则挡掉：

  ```json
  { "permissions": { "deny": [
      "Read(./**/dist/**)", "Read(./**/*.generated.*)", "Read(./vendor/**)"
  ] } }
  ```

  deny 规则覆盖内置文件工具和 `cat`/`head`/`grep`/`find` 等可识别的 Bash 命令，但**不会**从递归搜索的输出里过滤掉这些路径，也管不住自行打开文件的任意子进程
- **worktree 瘦身**：`worktree.sparsePaths` 用 git sparse-checkout 只检出列出的目录（+ 根级文件），配 `symlinkDirectories: ["node_modules"]` 让各 worktree 软链回主仓，避免重复占盘。对 subagent worktree 隔离尤其有用——同一会话所有 worktree 共享这份 sparsePaths
- **跨包访问的两条路子不等价**：`additionalDirectories` 设置**只给文件访问**，永远不加载对方的 CLAUDE.md / rules / skills；`--add-dir` 会加载 skills，而 CLAUDE.md/rules 还需再设 `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1`
- **每个子目录写明适用的测试和 lint 命令**，避免全量命令超时；**代码库地图**：根 CLAUDE.md 用几行说清仓库结构（哪个包干什么、命令在哪跑）
- **per-directory skills**：`packages/api/.claude/skills/` 只在该区域工作时加载。注意从仓库根启动时，会话中触及的所有子目录 skills 都会累积（大仓可达数百个），而 skill **描述在数量多时会被截断**——描述要短、把请求里会出现的关键词放前面
- **LSP / code intelligence 插件**：类型化语言装上后获得符号级精度导航（区分同名函数、符号搜索而非文本匹配）和编辑后自动错误检测。`/plugin install typescript-lsp@claude-plugins-official`，团队统一用 `enabledPlugins` 项目设置
- **两个自动化配置养护的钩子**：`Stop` hook 能拿到会话 transcript 路径，可写脚本在会话结束时**自动提议 CLAUDE.md 更新**（趁暴露出的缺口还新鲜）；`SessionStart` hook 打印到 stdout 的内容会进入首个 prompt 前的上下文，可按启动目录**提示该区域该装哪个插件**

---

## 六、从 PRD 到交付的落地流程　`[本文拼装，非官方成文流程]`

适用场景：一份 PRD + 原型，多工程师协作。

1. **仓库初始化**：`/init` 生成 CLAUDE.md（≤200 行），装 `gh` CLI，配好可运行的测试/lint 命令并写进 CLAUDE.md——这是一切「可验证」的地基
2. **需求 → SPEC**：把 PRD 和原型喂给 Claude，用「访谈模式」深挖边界情况，按功能模块产出 SPEC.md，人工评审定稿，签进 git
3. **架构设计**：Plan Mode 下基于 SPEC 出架构方案，重要决策用对抗式审查压测
4. **任务拆分 → GitHub issues**：让 Claude 用 `gh` 把 SPEC 拆成 issues，每个 issue 自包含（涉及文件、验收标准、不在范围内的事项）——每个 issue 就是一个 mini-spec
5. **并行实现**：工程师认领 issue，各自走 Explore → Plan → Code → Commit；简单 issue 可直接在 GitHub 上 `@claude` 交给 Actions
6. **审查合并**：`/code-review` + PR review，重要变更走 Writer/Reviewer 或多轮对抗审查
7. **进度把握**：看 issue 看板和 PR 状态。CC 会话内的 task list、checkpoint 都是会话级工具——官方明确说 checkpoint 是「local undo」，git 才是「permanent history」

---

## 七、2025–2026 官方新增能力（与工程流程相关）　`[wf] [team] [view] [tools] [cp] [auto] [routines]`

| 能力 | 状态 | 定位 |
|------|------|------|
| **Checkpoints** | 正式 | 每个 prompt 前自动快照，`/rewind` 回退；「local undo」，不替代 git。**有五类不还原的情况，见表下专段——其中「subagent 的编辑不还原」最易踩坑** |
| **Tasks 工具族** | 正式（v2.1.142 起为默认） | `TaskCreate`/`TaskGet`/`TaskList`/`TaskUpdate`。**v2.1.142 起旧的 `TodoWrite` 被默认禁用**、由这套取代（设 `CLAUDE_CODE_ENABLE_TASKS=0` 可退回）。`TaskUpdate` 可改状态、**依赖关系**、详情或删除任务；`TaskStop` 自 v2.1.198 起还能停 teammate 和具名后台 agent。⚠️ `TaskOutput` **已废弃**，改用 `Read` 读任务输出文件路径。是 Agent Teams 共享任务列表的底层 |
| **Dynamic Workflows** | 正式（v2.1.154+） | JS 脚本编排大规模 subagent（单次运行**总量上限 1000 agent**；并发**最多 16，CPU 核数少的机器更低**），适合「一次对话协调不过来」或「想把编排固化成可重跑脚本」的场景；内置 `/deep-research`；prompt 里加 `ultracode` 关键字（或 `/effort ultracode`）可让 Claude 自主决定何时用 workflow |
| **Agent View** | 研究预览（v2.1.139+） | 一张表格管理多个**本地**并行会话。入口：`claude agents` 开界面；`claude --bg`（长格式 `--background`）直接起后台会话；会话内 `/background`（别名 `/bg`）把当前对话转后台；空 prompt 按 `←` 脱离回到表格。可组合 `--agent`（`claude --agent code-reviewer --bg "..."`）指定主 agent，或 `--bg --exec 'pytest -x'` 把 shell 命令跑成后台作业。注意：会话派生的 subagent 和 teammate **不单独占行**。云端隔离 VM 是另一个东西——Claude Code on the web |
| **Routines** | 研究预览 | 保存好的配置（prompt + 仓库 + 环境 + connector）在 Anthropic 云端自动运行，合盖也继续跑；定时 / API / GitHub 事件三种触发，可组合。需 Pro/Max/Team/Enterprise 且启用 Claude Code on the web。CLI 用 `/schedule`（别名 `/routines`）创建管理。**运行时无权限提示，见表下专段** |
| **Agent Teams** | 实验性，默认关闭 | 多 CC 实例共享任务列表（支持依赖关系、可自我认领）+互相消息通信，lead 拆解分配任务；经验值：3-5 个 teammate 起步，每人 5-6 个任务；需设 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 开启，官方标注已知限制（session 恢复不完整、任务状态可能滞后） |
| **Auto Mode** | 正式 | 独立分类器审查每个动作，只拦截权限升级/未知基础设施/恶意内容驱动的操作（20+ 条默认拦截：force push、删数据、外发数据、禁用日志、扫描凭证存储、绕过 review 直推主分支等）。官方原话是「不是**高风险基础设施上**认真人工审查的直接替代品」，适合日常编码 |

**Routines 的五个协作与安全要点**（表格放不下，但对团队落地是决定性的）：

1. ⚠️ **完全自主运行，没有权限提示**——原文：「routines 作为完整的 Claude Code 云会话自主运行：**没有权限模式选择器，运行期间没有任何审批提示**」。它能跑 shell、用仓库里已提交的 skills、调用你给的任何 connector，且**connector 的写操作也不需要批准**。能碰到什么，完全由你选的仓库、环境网络策略、connector 范围决定——**这三样就是唯一的边界，必须按最小权限配**
2. ⚠️ **routine 属于个人账号，不与队友共享**，且**所有动作都以你的身份出现**：commit 和 PR 挂你的 GitHub 用户，Slack/Linear 等 connector 操作用你的关联账号。这意味着 routine **不是团队级自动化设施**——需要团队共享的自动化应该走 GitHub Actions（5.3）
3. **默认只能推 `claude/` 前缀分支**，保护长期分支和受保护分支；要放开需对该仓库显式开启 *Allow unrestricted branch pushes*
4. ⚠️ **运行列表里的绿色状态不代表任务成功**——原文明确：绿色只表示「会话启动了、退出时没有基础设施错误」。被拦截的网络请求、缺失的 connector 工具、任务级失败**都不会反映在状态指示器上**，必须打开 run 读 transcript 确认。把绿色当成功是无人值守流程的典型误判
5. **API 触发的 `text` 被当作不可信数据**：它包在 `<routine-fire-payload>` 块里送达，并明确告知 Claude 不要执行其中的指令，**除非 routine 自己的 prompt 显式引用了这个块**（例如「调查 routine-fire-payload 块里描述的告警」）。这是针对 token 泄露的防注入设计——持有 bearer token 的人只能投喂数据，不能直接下指令

其余细节：定时最小间隔 **1 小时**；一次性运行**不计入**每日 routine 配额但照常消耗订阅用量；Team/Enterprise Owner 可在管理后台一键关闭全组织的 routines。

---

**Checkpoints 的五类「不还原」**（官方明确列出，本文旧版只写了其中两类）：

1. **Bash 命令改动不追踪**——`rm` / `mv` / `cp` 造成的改动无法通过 rewind 撤销
2. ⚠️ **subagent 的编辑不还原**——subagent 用 Claude 的文件编辑工具做的改动**落在会话 checkpoint 之外**，rewind 不会恢复，只能用 git 回退。**包括后台跑的 `/code-review --fix` 和后台 forked skill**。唯一例外是**前台**运行的 `context: fork` skill（它在你自己的回合内改工作树，rewind 照常生效）。重度使用 subagent 的工作流，这条是最大的安全假象来源
3. **外部改动不追踪**——你手动改的文件、其他并发会话的编辑，除非恰好碰到本会话已跟踪的文件
4. ⚠️ **符号链接 / 硬链接路径不还原**——restore 时会跳过并提示 `Restored the code, but skipped N files`；dotfile 管理器软链进项目的配置、pnpm 硬链的文件都属此类。v2.1.216 之前是**静默穿透链接读写、无任何警告**。`/debug` 开启后可在 `~/.claude/debug/<session-id>.txt` 看到被跳过的路径
5. **不替代版本控制**——checkpoint 是「local undo」，git 才是「permanent history」

另有两条容量限制：每个会话**只保留最近 100 个 checkpoint 的文件快照**；checkpoint 随 session 在 **30 天后清理**，可用 `cleanupPeriodDays` 调整。

`/rewind`（或空输入时按两次 `Esc`）菜单共六项：Restore code and conversation / Restore conversation / Restore code / **Summarize from here** / **Summarize up to here** / Never mind。后两项是**局部压缩**而非回退，不改磁盘文件。v2.1.191+ 还支持在菜单顶部选 `/resume <session-id> (previous session)` **回到 `/clear` 之前的那个会话**。

**Auto Mode 分类器细节**（官方工程博客）：

- **准确率数字要连着看，别只记 17%**：官方给出的是一组对照——第一阶段单独是 **6.6% 漏检率 / 8.5% 误报率**，第一+二阶段合起来是 **17% 漏检率 / 0.4% 误报率**（在 n=52 的「真实过激动作」数据集上）。原话「17% 的漏检率是个诚实的数字」。设计取舍是**用极低的误报换可接受的漏检**——只引 17% 会读成「六分之一会漏、不敢用」，与原意相反
- 设计背景：统计显示用户接受了 93% 的权限提示——auto mode 的目标用户是那些原本「危险地跳过全部权限」的人，不是替代人工审查
- 两层防御：**输入层**是服务端提示注入探针，扫描工具输出（文件读取、网页抓取、命令输出），发现可疑内容就向 agent 加注警告；**输出层**是两阶段分类——第一阶段单 token 快速过滤（速度优先、偏向拦截），第二阶段仅对被标记的动作做链式推理复核（提高精准度）
- 关键设计：分类器只看用户消息和工具调用命令，**看不到 agent 的推理过程或工具输出**——防止 agent 用「说服性解释」影响审批
- 三层允许机制：内置安全工具白名单（读文件、搜索等无状态操作）→ 项目内文件编辑（可通过版本控制审查）→ 超出范围交分类器评估
- 被拦截后 agent 会收到否决理由并可重试；连续 3 次或累计 20 次拦截才停止；`-p` 非交互模式下反复被拦会直接中止（因为没有用户可回退）

新能力采用原则同配置：**渐进式添加，规模没到不建议先上。**

---

## 八、Anthropic 内部团队实际用法　`[teams]`

| 团队 | 用法与效果 |
|------|-----------|
| 安全工程 | 流程从「设计文档→垃圾代码→重构→**最后放弃写测试**」改为「**要伪代码→引导它走测试驱动→定期检查**」；贴堆栈+文档让 Claude 追控制流——**原本需 10-15 分钟人工扫读的问题，现在快 3 倍解决**；让 Claude 读多份文档生成 runbook |
| 产品工程 | CC 是「编程任务的第一站」：先问该看哪些文件，再动手；不熟悉的代码库也能独立修 bug |
| 产品设计 | Figma 设计稿喂给 CC，建自主循环写码-跑测试-迭代；开发前用 CC 识别错误状态和边界情况 |
| 数据基础设施 | 事故响应：贴仪表板截图，Claude 逐步引导诊断出 Pod IP 耗尽并给出精确命令，故障期间省 20 分钟 |
| 推理团队 | 用不熟悉的语言（Rust）写测试；**原本要 1 小时 Google 搜索的调研，现在 10-20 分钟——调研时间减少 80%** |
| 增长营销 | 搭了个 agentic workflow 批量生成广告变体，**数小时缩到数分钟出数百条新广告** |
| 法务 | 无开发资源也搭出内部工具原型（「电话树」系统，帮同事找到对口的律师） |

跨团队共同结论：「**最成功的团队把 Claude Code 当思想伙伴，而不是代码生成器**」——探索可能性 → 快速原型 → 分享发现。

---

## 九、常见失败模式　`[bp]`

| 失败模式 | 症状 | 修复 |
|---------|------|------|
| 大杂烩会话 | 一个会话里穿插多个不相关任务 | 无关任务之间 `/clear` |
| 反复纠正 | 同一问题纠了又纠，上下文堆满失败尝试 | 纠正两次后 `/clear`，用吸收教训的更好 prompt 重来 |
| 过度配置的 CLAUDE.md | 太长导致一半被忽略 | 无情精简；Claude 不用指令也能做对的，删掉或转成 hook |
| 信任但不验证 | 实现看着合理但漏边界情况 | 永远提供验证手段（测试/脚本/截图）；「不能验证就不要上线」 |
| 无边界的调查 | 「去调查一下 X」导致读几百个文件灌满上下文 | 缩小调查范围，或交给 subagent 隔离 |

官方结尾提醒：这些模式是起点不是教条——「有时就该让上下文积累（深挖一个复杂问题时），有时就该跳过规划（探索性任务），有时模糊的 prompt 恰恰是对的（想看 Claude 如何理解问题时）。注意什么有效，逐渐形成指南无法传授的直觉。」

---

## 十、一句话总结

> **工作流上用「访谈出 SPEC → Plan Mode → 可验证的实现 → PR」；协作上用 git/GitHub 原生机制；配置上从零开始按痛点渐进添加、宁少勿多，并像代码一样养护（owner、PR review、每 3-6 个月修剪）。「不想瞎搞」的最好方式，恰恰是别在开工前搭重框架。**

---

## 来源

章节标题后的缩写对应下表。**全部 20 个来源均已于 2026-07 逐页抓取、逐条比对过原文**；✅ 后括注的是完成核实的轮次，未括注的为第一、二轮。

| 缩写 | 来源 | 本轮核实 |
|------|------|---------|
| `[bp]` | [Best practices（原工程博客的现行版本，权威主来源）](https://code.claude.com/docs/en/best-practices) | ✅ 全文比对 |
| `[mem]` | [How Claude remembers your project：CLAUDE.md 与 auto memory](https://code.claude.com/docs/en/memory.md) | ✅ 全文比对 |
| `[large]` | [Monorepo 与大型代码库配置](https://code.claude.com/docs/en/large-codebases.md) | ✅ 全文比对 |
| `[team]` | [Agent Teams](https://code.claude.com/docs/en/agent-teams.md) | ✅ 全文比对 |
| `[wf]` | [Dynamic Workflows](https://code.claude.com/docs/en/workflows.md) | ✅ 全文比对 |
| `[sub]` | [Sub-agents](https://code.claude.com/docs/en/sub-agents.md) | ✅ 关键条目比对 |
| `[auto]` | [Auto mode 工程详解（博客）](https://www.anthropic.com/engineering/claude-code-auto-mode) | ✅ 分类器指标比对 |
| `[review]` | [Code Review](https://code.claude.com/docs/en/code-review) · [配置指南](https://support.claude.com/en/articles/14233555-set-up-code-review-for-claude-code) | ✅ REVIEW.md 行为比对 |
| `[view]` | [Agent view：并行会话管理](https://code.claude.com/docs/en/agent-view) | ✅ 全部入口比对 |
| `[tools]` | [Tools reference：内置工具与版本变更](https://code.claude.com/docs/en/tools-reference) | ✅ Tasks 工具族比对 |
| `[teams]` | [How Anthropic teams use Claude Code（博客）](https://claude.com/blog/how-anthropic-teams-use-claude-code) | ✅ 全部数字比对 |
| `[feat]` | [Extend Claude Code：各扩展机制选型](https://code.claude.com/docs/en/features-overview.md) | ✅ 全文比对（第三轮） |
| `[steer]` | [Steering Claude Code：skills/hooks/rules/subagents 选型（博客）](https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more) | ✅ 全文比对（第四轮）**⚠️ 该文已含过时内容** |
| `[admin]` | [组织部署 admin-setup](https://code.claude.com/docs/en/admin-setup.md) | ✅ 全文比对（第三轮） |
| `[large-blog]` | [大型代码库与组织推广（博客）](https://claude.com/blog/how-claude-code-works-in-large-codebases-best-practices-and-where-to-start) | ✅ 全文比对（第四轮）**⚠️ 该文已含过时内容**（**治理建议的唯一出处**） |
| `[gha]` | [GitHub Actions 集成](https://code.claude.com/docs/en/github-actions.md) | ✅ 全文比对（第三轮） |
| `[cp]` | [Checkpointing](https://code.claude.com/docs/en/checkpointing.md) | ✅ 全文比对（第三轮） |
| `[os]` | [Output styles](https://code.claude.com/docs/en/output-styles) | ✅ 命令变更比对（第三轮） |
| `[routines]` | [Routines](https://code.claude.com/docs/en/routines.md) | ✅ 全文比对（第五轮） |
| `[dw]` | [A harness for every task：Dynamic Workflows（博客）](https://claude.com/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code) | ✅ 全文比对（第五轮） |

### 博客来源各自的定位（文档 vs 博客的取舍）

本文引用了 **5 篇官方博客**（下表共 6 行，其中「原 Claude Code Best Practices」已并入文档站、不计入 5 篇），它们和文档站的分工不同——**文档讲「是什么、怎么配」，博客讲「为什么这样设计」**。博客的判断依据和因果解释往往是文档里没有的，但**博客不随版本更新**，这是它的致命短板。

| 博客 | 讲什么 | 本文用它支撑什么 | 时效性 |
|------|-------|-----------------|--------|
| **Steering Claude Code** `[steer]` | 七种指令投递机制的选型逻辑：加载时机 / 压缩行为 / 上下文成本 / 指令权重四维对照 | 第二章整章的骨架；hook 五类型；CLAUDE.md 膨胀的因果解释 | ⚠️ **已过时**：仍写「subagent 最多嵌套 5 层」，实为 v2.1.216 前的旧行为 |
| **How Claude Code works in large codebases** `[large-blog]` | 大仓导航原理（agentic search vs RAG）、三种成功部署的配置模式、组织推广与治理 | 5.6 治理建议的**唯一出处**；5.7 大仓配置；「harness 与模型同等重要」这一论点 | ⚠️ **已过时**：提到 `.claudeignore`，该机制并非官方正式能力（应改用 `permissions.deny` 的 `Read()` 规则） |
| **How Anthropic teams use Claude Code** `[teams]` | 七个内部团队的真实用法与量化收益 | 第八章整章 | ✅ 数字已逐条核对 |
| **Claude Code auto mode（工程博客）** `[auto]` | auto mode 分类器的两层防御架构与准确率实测 | 七章 auto mode 细节；17%/0.4% 这组数字 | ✅ 已核对 |
| **原 Claude Code Best Practices** | 业界流传最广的那篇 | **已 308 永久重定向进文档站**，即现在的 `[bp]` | ✅ 已并入文档，持续维护 |
| **A harness for every task** `[dw]` | Dynamic Workflows 的设计动机：单上下文窗口的三种失效模式、为什么要让 Claude 当场写自己的 harness | **第一章「自建 harness」的官方定义出处**；第七章 workflow 的取舍标准 | ✅ 已核对 |

> **`[dw]` 这篇是第一章那个术语区分的关键依据**。它明确用 harness 指代**编排层**——「custom harnesses on top of Claude Code」「Claude 可以当场写出它自己的 harness」——从而把「自建 harness」（workflow 编排）和「写配置」（扩展层）区分开。它还给出了 workflow 的适用判断：并行与专门化「必须挣回它们的协调成本」，常规编码任务先问「这真的需要更多算力吗？」。**该文刻意不给 agent 数量与并发的硬性数字**（那些在 workflows 文档里），主张按具体情况判断。

> ⚠️ **两篇博客同时过时，本身就是一条结论**：官方博客的时效性弱于文档站。**凡是版本相关的事实（默认值、层数上限、机制是否存在），一律以 `code.claude.com/docs` 为准**；博客只用来理解设计意图和取舍理由。本文第一章讲「过时配置有害」，这里是它在一手来源上的现场演示。

---

> ⚠️ **旧版本把 `[admin]` 绑定了两个来源**（admin-setup 文档 + large-codebases 博客），导致读者无法判断某句话出自哪篇。第三轮核实发现：**「跨职能工作组 / 配置 DRI / 3-6 个月配置审查周期」这组治理建议，在当前 admin-setup 页面里已经不存在了**——那一页现在是纯粹的部署决策地图（provider 选择、设置分发、强制项、用量、数据处理）。这些治理内容只出自 large-codebases 博客，故拆出 `[large-blog]` 单列。第一章引用的「3-6 个月审查周期」是全文核心论据之一，溯源必须干净。

**本轮核实中修正的主要条目**（供对照旧版本）：`/init` 默认不读 AGENTS.md；项目级 CLAUDE.md 也可放 `./.claude/CLAUDE.md`；组织级托管路径分三平台；Stop hook 连续 8 次阻塞后被覆盖；Auto mode 的 17% 需与 0.4% 误报率连读；Checkpoints 不追踪的是 Bash 与外部进程；workflow 并发 16 为上限而非定值；**`.claudeignore` 不是官方机制**（应用 `permissions.deny` 的 `Read()` 规则）；**subagent 默认已不允许嵌套**（5 层是 v2.1.172–v2.1.216 的旧行为）。

**第二轮补充核实**（原「未核实」三项已全部坐实）：`v2.1.142` 的确切含义是**旧 `TodoWrite` 自该版本起被默认禁用、由 Tasks 工具族取代**；`claude --bg` / `--background` 与 `/background` / `/bg` 均确实存在，Agent view 要求 v2.1.139+；第八章数字全部对上原文，并补回了三处被压缩掉的语境（3 倍是针对「原本 10-15 分钟人工扫读」的问题、1 小时指的是「Google 搜索调研」且官方给了「减少 80%」、安全工程旧流程末尾还有「最后放弃写测试」这一环）。

**第三轮核实（2026-07-25）**：专门抓取了前两轮标注「未重新抓取」的五个来源。

*经核实完全准确、无需改动的关键条目*（这些最容易写错，特此记录）：Stop hook 连续 8 次阻塞后被覆盖；subagent 默认不允许嵌套 + `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` + v2.1.172–v2.1.216 旧行为的版本区间；`TaskOutput` 已废弃、`TodoWrite` 自 v2.1.142 默认禁用、`CLAUDE_CODE_ENABLE_TASKS=0` 可退回；subagent 默认后台（v2.1.198+）；agent-memory 三档路径；SPEC 采访 prompt、CLAUDE.md 内容取舍表、失败模式表、权限三档、GHA v1.0 参数迁移表均逐行对得上原文。

*本轮修正的条目*：托管设置是**四层**优先级（补回最低的 Windows 用户注册表 HKCU），并补入凌驾四层之上的 `policyHelper`；Checkpoints 有**五类**不还原情况（补回 subagent 编辑、符号/硬链接两类，以及 100 快照上限与 30 天清理）；组织可强制项由 7 项补至 15 类（新增 `strictPluginOnlyCustomization` 等）；补入设置数组合并规则及 `fallbackModel` / `availableModels` 两个替换例外；Google Vertex AI 已更名为 **Google Cloud's Agent Platform**；`/output-style` 命令 v2.1.73 废弃、**v2.1.91 已移除**（改用 `/config`）；GHA 补 `plugin_marketplaces` / `plugins` 两个 input 及 `prompt` 直传 skill 的用法；拆分 `[admin]` 与 `[large-blog]` 两个来源。

*本轮新增、旧版完全缺失的内容*：harness 分层图与磁盘布局（第一章）；Artifact 与 Code intelligence 两个扩展机制（2.1）；**多来源同名冲突的解析优先级**（2.4，各机制规则互不相同）；fork 机制、subagent frontmatter 全字段、`skillOverrides`（2.2）；`/branch` 与 `--fork-session`（3.4）；WSL 托管设置继承（5.6）。

**第四轮核实（2026-07-25）**：补抓 `[steer]` 与 `[large-blog]` 两篇博客全文。

*最重要的发现*：**两篇官方博客都已含过时内容**——Steering 博客仍称 subagent 可嵌套 5 层，large-codebases 博客仍提 `.claudeignore`。已在 2.2、来源表两处就地标注，并据此确立取舍原则：**版本相关事实以文档站为准，博客只用于理解设计意图**。

*本轮修正*：hooks 从「完全绕过上下文」改为「配置在上下文外，但**阻塞类 hook 的 stderr 会进上下文**」；「hook 是确定性的」限定为 **command / http / mcp_tool 三类**，`prompt` 与 `agent` 两类 hook 依赖模型判断（新增 2.1.1 专节）；`--append-system-prompt` 成本由「中高」改为「中」并补入**边际递减**警告；补入配置审查的第二触发条件「**重大模型发布后性能进入平台期时**」；DRI 职权范围、agent manager 的 PM/工程师混合定位、跨职能工作组构成均按原文精化（5.6）。

*本轮新增*：CLAUDE.md 膨胀的**结构性因果解释**（第一章第 3 条，「无主配置文件必然只增不减」）；hook 的五种类型对照表与三处注册位置；误用表补 6 条（含 large-codebases 博客的「常见误解」维度）；compaction 行为补 output styles 与 append-system-prompt 两行；**博客来源定位表**（说明文档与博客的分工及各自时效性）。

**第五轮核实（2026-07-25）**：补抓 `[routines]` 文档与 `[dw]` Dynamic Workflows 博客，**至此全部来源均已逐页核实完毕**。

*本轮最有价值的发现*：`[dw]` 博客给出了 **harness 一词的官方用法**——它指**编排层**（「custom harnesses on top of Claude Code」「Claude 可以当场写出它自己的 harness」），而非 CLAUDE.md/hooks/skills 那些配置。据此在第一章新增三行对照表，把「写配置」「写 workflow 编排」「用 Agent SDK 另起炉灶」三件事彻底分开——这是本文开篇术语澄清的完整版。

*本轮新增*：第七章 Routines 由一行扩为一行 + 五点专段，补入**运行时无任何权限提示**、**routine 属个人账号且动作以你的身份出现**（故不适合作团队级自动化）、**默认只能推 `claude/` 分支**、**绿色状态不代表任务成功**、**fire text 按不可信数据处理**五条；补 `/schedule` CLI 入口、1 小时最小间隔、一次性运行不计配额、组织级关闭开关。

**全部来源核实完毕，全文无已知未核实条目。**
