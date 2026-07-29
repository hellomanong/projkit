---
name: project-bootstrap
description: 以本仓库（projkit）为样板，把一个目标目录初始化成标准结构的新项目：目录结构、AGENTS.md（含 CLAUDE.md 软链）、SPEC 访谈、拆 GitHub issues。对已初始化的项目重跑 = 刷新方法论文件。仅限手动触发（Claude Code 中 /project-bootstrap，Codex 中 $project-bootstrap）。
argument-hint: <目标目录>
disable-model-invocation: true
allowed-tools: Bash(${CLAUDE_SKILL_DIR}/scripts/init-skeleton.sh *)
---

# 项目启动流程

本 skill 属于 projkit 仓库——**projkit 仓库根目录的结构就是标准项目样板**，初始化新项目时以它为参照。真身在 `.agents/skills/`，`.claude/skills/` 与 `.codex/skills/` 里是软链，Claude Code 和 Codex 调用的是同一份文件。

**目标目录 = 用户随命令传入的参数**（Claude Code 中即 `$ARGUMENTS`）。为空则先询问用户。目标目录在工作目录之外时，按所用工具的权限流程申请访问（Codex 沙箱默认限制工作目录外写入，需用户放开）。

**样板仓库根目录（下称 `<projkit>`）= 本 skill 目录（本 SKILL.md 所在目录，Claude Code 中即 `${CLAUDE_SKILL_DIR}`）的上三级**——本 skill 可能从任意工作目录被调用，所有指向样板的路径都必须基于本 skill 目录解析，不要假设当前目录就是 projkit。

全程用简体中文与用户交流。有三个「拍板点」必须停下来等用户确认：AGENTS.md（项目说明）内容、SPEC 定稿、issue 列表。

## 配套文件索引

**按你当前要做的事查表，不要预先全读。** 下表路径均相对本 skill 目录。SPEC/issue 的规范和样例住在同级共享 skill `../feature-spec/` 里——第 4、5 步与新项目里的 `/feature-spec` 是同一套流程，共用同一份规范。

| 你现在要做什么 | 读/执行这个 |
|---|---|
| 在目标目录建出全部标准目录 | **执行** `scripts/init-skeleton.sh <目标目录>`（不用读它的内容） |
| 生成 settings.json / .gitignore | `templates/settings.json.template`、`templates/gitignore.template` |
| 生成 AGENTS.md，但不确定该写多细、写哪些 | `examples.md`（含「为什么这样写」的逐行说明） |
| 要开始 SPEC 访谈，不知道该问什么 | `../feature-spec/reference.md` §一 访谈问题库（按技术/UI/边界/权衡分维度） |
| 写 SPEC，不确定格式和颗粒度 | `../feature-spec/examples.md` §一 |
| 写完 SPEC，想判断它合不合格 | `../feature-spec/reference.md` §二 三要素检验标准 + 常见失败模式 |
| 用户说验证步骤/范围写得不好，要返工 | `../feature-spec/reference.md` §二「常见失败模式」表，对症修 |
| 要拆 issue，不确定拆多细、怎么算自包含 | `../feature-spec/reference.md` §三 issue = mini-spec |
| 写 issue 正文，不确定格式 | `../feature-spec/examples.md` §二 |

**只建骨架、不做 SPEC 的话，上表后六行的参考文件一个都不用读**——走不到那一步就不该付这份上下文成本。

## 拷贝来源对照

| 新项目文件 | 来源 |
|---|---|
| 目录结构 | 照 `<projkit>` 根目录的结构建（不含 claude-code-best-practices.md；`.agents/skills/` 里只拷贝 feature-spec，不拷贝本 skill 及其软链） |
| `docs/PROJECT-GUIDE.md` | `<projkit>/docs/PROJECT-GUIDE.md` 原样拷贝 |
| `.agents/skills/feature-spec/` | `<projkit>/.agents/skills/feature-spec/` 整个目录原样拷贝（真身；后续每轮 SPEC 靠它） |
| `.claude/skills/feature-spec`、`.codex/skills/feature-spec` | 相对软链，各指向 `../../.agents/skills/feature-spec`（拷贝后创建） |
| `.claude/settings.json` | 本 skill 目录 `templates/settings.json.template` |
| `.gitignore` | 本 skill 目录 `templates/gitignore.template`（已存在则只追加缺失条目） |
| `AGENTS.md` | 本 skill 目录 `templates/AGENTS.md.template` 填充生成（见第 3 步）——项目说明的唯一事实来源 |
| `CLAUDE.md` | 软链到 AGENTS.md（第 3 步顺手创建）——Claude Code 只认这个文件名 |

## 刷新模式（对已初始化项目重跑）

目标目录已有 `docs/PROJECT-GUIDE.md` 即视为已初始化，进入刷新模式，**只做三件事**，做完输出汇总直接结束，不走第 1~6 步：

1. 用 `<projkit>` 的最新版覆盖 `.agents/skills/feature-spec/` 整目录和 `docs/PROJECT-GUIDE.md`——**覆盖前先对每个有差异的文件展示 diff，经用户确认**（目标项目可能自行改过拷贝，不要静默冲掉）。
2. 检查三条软链（`CLAUDE.md`、`.claude/skills/feature-spec`、`.codex/skills/feature-spec`），缺失或指向错误则补建。
3. 其余一概不动：AGENTS.md、settings.json、.gitignore、specs/、issues 都属于项目自己，刷新与它们无关。

## 第 1 步：环境检查

- 确认目标目录：不存在则创建；已有较多文件则列出来并询问用户是否确认在此初始化。
- 目标目录不是 git 仓库则在其中 `git init`。
- `gh auth status` 检查 GitHub CLI；未安装或未登录时告知用户自行登录（Claude Code 中可在提示符输入 `! gh auth login`，其他工具直接在终端跑），不阻塞后续步骤。

## 第 2 步：生成目录结构

执行本 skill 目录下的脚本，它会建齐全部标准目录并放好 `.gitkeep` 占位（幂等，已存在的一律跳过）：

    <本 skill 目录>/scripts/init-skeleton.sh <目标目录>

（Claude Code 中即 `${CLAUDE_SKILL_DIR}/scripts/init-skeleton.sh`，已在 allowed-tools 预授权。）

把脚本的输出如实转述给用户（新建了哪些、跳过了哪些）。脚本只建目录骨架，具体内容在本步骤剩余部分和第 3 步生成：

- `docs/PROJECT-GUIDE.md` ← 从 `<projkit>` 原样拷贝
- `.agents/skills/feature-spec/` ← 从 `<projkit>` 整目录原样拷贝（真身）
- `.claude/skills/feature-spec`、`.codex/skills/feature-spec` ← 各建相对软链指向 `../../.agents/skills/feature-spec`（顺手删掉脚本在这三个 skills 目录里留的 `.gitkeep`）
- `.claude/settings.json`、`.gitignore` ← 从 `templates/` 拷贝
- `AGENTS.md`（及指向它的 CLAUDE.md 软链）← 第 3 步生成

⚠️ **占位文件必须是 `.gitkeep`，绝不能是 `.md`**：`rules/`、`agents/`、`commands/`、`output-styles/` 四个目录会把里面每个 `.md` 当成一份生效的配置读取——放 README 进去会凭空多出一条全程加载的规则、一个 subagent、一个斜杠命令或一个输出风格。目录的用途说明写在 `docs/PROJECT-GUIDE.md` 里，不要写进目录本身。脚本已按此实现，且会在发现游离 `.md` 时告警。

不预建的两项：`.claude/agent-memory-local/`（已 gitignore，由 CC 按需自动创建）、`.mcp.json`（有要连的 MCP 服务时再建，见 PROJECT-GUIDE.md）。

## 第 3 步：生成 AGENTS.md（拍板点 1）

项目说明写在 `AGENTS.md`（开放标准，Codex / Cursor / Gemini CLI 直接读），`CLAUDE.md` 只是指向它的软链——Claude Code 认这个文件名，会跟随软链读到同一份内容。

- 逐个提问问清楚（Claude Code 中用 AskUserQuestion 工具）：项目名与一句话定位、技术栈、构建/测试/lint 命令（还没有就写 TODO）。
- 先读 `examples.md`，对齐颗粒度。
- 按模版填充，全文控制在 60 行以内（硬性目标 ≤200 行）。只写 agent 猜不到的信息；不写目录结构描述、不写显而易见的语言惯例。逐行自检：「删掉它 agent 会犯错吗？不会就删。」
- 老项目已有**真实的** CLAUDE.md 或 AGENTS.md 时，以已有内容为底、只补模版缺的部分，不要丢弃用户写过的东西。
- 把生成结果给用户看，确认后落盘为 `AGENTS.md`，再执行 `ln -s AGENTS.md CLAUDE.md`（原有的真实 CLAUDE.md 在内容并入后替换为软链，经用户确认）。

## 第 4 步：SPEC 访谈（拍板点 2，可跳过）

本步骤与新项目里的 `/feature-spec` 是同一套流程，这里只是跑第一轮。**PRD / 原型还在演进不是跳过的理由**——只访谈、只定稿当前已想清楚的模块，未定的部分显式写进 SPEC 的「不在范围内」（注明「PRD 未定，下轮再议」），后续每轮 PRD 完善后在新项目里跑 `/feature-spec` 继续。

- 询问用户是否已有 PRD / 原型（哪怕只是初稿）。完全没有则跳到第 6 步。
- **开始访谈前先读 `../feature-spec/reference.md` §一**（分维度的访谈问题库）。
- 让用户提供 PRD 文本 / 文件路径 / 原型截图，然后逐个提问详细采访（Claude Code 中用 AskUserQuestion 工具）：技术实现、UI/UX、边界情况、顾虑和权衡。**一次只问一个问题**，等回答再问下一个。不问显而易见的问题，深挖用户可能没考虑到的难点，持续采访直到覆盖本轮模块的所有方面。
- 写入目标目录的 `specs/<模块>.md`（本轮只有一个小功能时可用 `specs/SPEC.md`）。每份 SPEC 必须包含三要素：涉及的文件与接口、明确不在范围内的事项、结尾一个端到端验证步骤——**验证步骤必须写明预期结果，「跑测试通过」不算**。格式参照 `../feature-spec/examples.md` §一，写完对照 `../feature-spec/reference.md` §二 自检一遍。
- 请用户评审定稿后再进入下一步。定稿的是**本轮模块**，不是全部功能。

## 第 5 步：拆 GitHub issues（拍板点 3，可跳过）

- 需要远程仓库；没有则询问是否 `gh repo create`。
- 拆分粒度与自包含要求见 `../feature-spec/reference.md` §三；格式参照 `../feature-spec/examples.md` §二。
- 把**本轮已定稿的 SPEC** 拆成自包含的 issue：每个 issue 写明背景、涉及文件、验收标准、不在范围内的事项——每个 issue 就是一个 mini-spec，认领者不看 SPEC 也能开工。
- 先把完整 issue 列表给用户过目，确认后再逐个 `gh issue create`。

## 第 6 步：收尾

- 询问用户是否提交 initial commit。
- 输出汇总：建了什么；哪些目录故意留空、什么触发条件下往哪个目录加东西（引导用户读目标项目的 `docs/PROJECT-GUIDE.md`，尤其是「初始化之后」一节）。
- 下一步建议，按第 4/5 步的实际走向给：
  - 已拆出 issue → 在**新项目目录**里另开新会话（claude 或 codex 均可），`gh issue view` 认领第一个，走标准开发循环。
  - 跳过了 SPEC / issue，或 PRD 只定稿了一部分 → 想清楚第一块后在新项目里跑 `/feature-spec <模块>`（Codex 中 `$feature-spec`），产出 SPEC 和 issue 再进开发循环。

## 红线

- 不要往新项目的 `.claude/rules/`、`.claude/agents/` 里预填任何内容——配置从实际痛点里长出来。唯一预填例外是随样板分发进 `.agents/skills/` 的 `feature-spec`（及其两条软链）：它和 PROJECT-GUIDE.md 一样属于方法论本身，不是替项目预设的配置。此外不预填。
- 不要替用户做「拍板点」的决定。
- 不要修改 `<projkit>` 下的任何文件——它是样板，只读。所有写操作都发生在目标目录里。
- 每一步落盘后如实报告结果，失败就说失败。
