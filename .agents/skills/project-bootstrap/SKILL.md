---
name: project-bootstrap
description: 以本仓库（projkit）为样板，把一个目标目录初始化成标准结构的新项目：目录结构、AGENTS.md（含 CLAUDE.md 软链）、SPEC 访谈、拆 GitHub issues。对已初始化的项目重跑 = 刷新方法论文件。仅限手动触发（Claude Code 中 /project-bootstrap，Codex 中 $project-bootstrap）。
argument-hint: <目标目录>
disable-model-invocation: true
allowed-tools: Bash(${CLAUDE_SKILL_DIR}/scripts/init-skeleton.sh *)
---

# 项目启动流程

本 skill 属于 projkit 仓库——**projkit 仓库根目录的结构就是标准项目样板**，初始化新项目时以它为参照。真身在 `.agents/skills/`，`.claude/skills/` 与 `.codex/skills/` 里是软链，Claude Code 和 Codex 调用的是同一份文件。

**目标目录 = 用户随命令传入的参数**（Claude Code 中即 `$ARGUMENTS`）。为空则先询问用户。拿到后先归一化为**绝对路径**，后续所有步骤只用绝对路径引用——执行中途可能 cd 过，相对路径会漂。目标目录在工作目录之外时，按所用工具的权限流程申请访问（Codex 沙箱默认限制工作目录外写入，需用户放开）。

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

**判定**：目标目录**同时**有 `docs/PROJECT-GUIDE.md` 和 `AGENTS.md`（或指向它的 CLAUDE.md）才算已初始化，进入刷新模式。只有其一不算——可能是上次初始化中途断了，也可能是项目恰好自带同名文件：把检测到的现状告诉用户，问清是继续初始化还是刷新；继续初始化就正常走第 1~6 步（各步骤幂等，已有的部分自动跳过）。

刷新模式**只做四件事**，做完输出汇总直接结束，不走第 1~6 步：

1. 重跑 `<本 skill 目录>/scripts/init-skeleton.sh <目标目录>`（幂等，只补缺失——projkit 后来新增的标准目录靠这步补齐，否则同步来的 PROJECT-GUIDE.md 会描述一个项目里不存在的目录）。
2. **逐文件同步**（不要「删目录重拷」）`.agents/skills/feature-spec/` 和 `docs/PROJECT-GUIDE.md` 到 `<projkit>` 最新版：有差异的文件先展示 diff、经用户确认再覆盖；目标目录有而 projkit 没有的文件一律保留（从文件状态无法区分是项目自增还是 projkit 已删除），在汇总里列出、由用户决定去留。任何一类都不要静默冲掉。
3. 检查三条软链（`CLAUDE.md`、`.claude/skills/feature-spec`、`.codex/skills/feature-spec`）：缺失则补建；已是软链但 `readlink` 目标不对则改正指向（不涉及用户数据，改完在汇总里说明）；位置上已存在**真实文件/目录（不是软链）**时不要直接替换——先展示现状问用户（可能是 Windows 退化拷贝方案或有意为之，见 PROJECT-GUIDE.md「坑」第 7 条），确认走软链才替换。确认保留拷贝形态的：两条 skill 拷贝把第 2 条同步后的最新内容**镜像进去**（退化方案的约定就是改真身后手动同步，刷新时替用户做掉）；`CLAUDE.md` 拷贝的源是**本项目自己的 AGENTS.md**（不是 projkit 的任何文件），而刷新不改 AGENTS.md——两者不一致时只提示用户对齐，不要拿「最新版」去灌它。
4. 其余一概不动：AGENTS.md、settings.json、.gitignore、specs/、issues 都属于项目自己，刷新与它们无关。

## 第 1 步：环境检查

- 确认目标目录：不存在则创建；已有较多文件则列出来并询问用户是否确认在此初始化。
- 目标目录不是 git 仓库则在其中 `git init`。
- `gh auth status` 检查 GitHub CLI；未安装或未登录时告知用户**另开一个终端**跑 `gh auth login`（交互式向导需要真实终端，agent 会话内没有交互 TTY，跑了会挂起）。非交互替代：把 `GH_TOKEN` 设进 **agent 会话自己的进程环境**（启动会话前 export，或写进 `.claude/settings.json` 的 `env`；在另开的终端里 export 对本会话无效）即可直接用 gh，或 `gh auth login --with-token < 存有PAT的文件`——该选项从 stdin 读 token，裸跑会卡住。此项不阻塞后续步骤。

## 第 2 步：生成目录结构

执行本 skill 目录下的脚本，它会建齐全部标准目录并放好 `.gitkeep` 占位（幂等，已存在的一律跳过）：

    <本 skill 目录>/scripts/init-skeleton.sh <目标目录>

（Claude Code 中即 `${CLAUDE_SKILL_DIR}/scripts/init-skeleton.sh`，已在 allowed-tools 预授权。）

把脚本的输出如实转述给用户（新建了哪些、跳过了哪些）。脚本只建目录骨架，接着按上文「拷贝来源对照」表逐项落盘（AGENTS.md 及 CLAUDE.md 软链留到第 3 步生成）；建好软链后顺手删掉脚本在三个 skills 目录里留的 `.gitkeep`。

⚠️ **占位文件必须是 `.gitkeep`，绝不能是 `.md`**：`rules/`、`agents/`、`commands/`、`output-styles/` 四个目录会把里面每个 `.md` 当成一份生效的配置读取——放 README 进去会凭空多出一条全程加载的规则、一个 subagent、一个斜杠命令或一个输出风格。目录的用途说明写在 `docs/PROJECT-GUIDE.md` 里，不要写进目录本身。脚本已按此实现，且会在发现游离 `.md` 时告警。

不预建的两项：`.claude/agent-memory-local/`（已 gitignore，由 CC 按需自动创建）、`.mcp.json`（有要连的 MCP 服务时再建，见 PROJECT-GUIDE.md）。

## 第 3 步：生成 AGENTS.md（拍板点 1）

项目说明写在 `AGENTS.md`（开放标准，Codex / Cursor / Gemini CLI 直接读），`CLAUDE.md` 只是指向它的软链——Claude Code 认这个文件名，会跟随软链读到同一份内容。

- 逐个提问问清楚（Claude Code 中用 AskUserQuestion 工具）：项目名与一句话定位、技术栈、构建/测试/lint 命令（还没有就写 TODO）。
- 先读 `examples.md`，对齐颗粒度。
- 按模版填充，全文尽量控制在 60 行以内、硬上限 200 行。只写 agent 猜不到的信息；不写目录结构描述、不写显而易见的语言惯例。逐行自检：「删掉它 agent 会犯错吗？不会就删。」
- 老项目已有**真实的** CLAUDE.md 或 AGENTS.md 时，以已有内容为底、只补模版缺的部分，不要丢弃用户写过的东西。
- 把生成结果给用户看，确认后落盘为 `AGENTS.md`，再**在目标目录内**执行 `ln -s AGENTS.md CLAUDE.md`——软链必须建在目标目录里，不要在别的 cwd 裸跑。已有真实 CLAUDE.md 时：内容并入 AGENTS.md 且经用户确认后，先删掉原文件再建链（裸 `ln -s` 会报 File exists）。

## 第 4 步：SPEC 访谈（拍板点 2，可跳过）

本步骤就是 `../feature-spec/SKILL.md` 第 1~3 步在 bootstrap 里跑第一轮——**访谈规则、SPEC 三要素、格式要求以该文件为准，读它照做，不在这里重复**。两处换算：它引用的**配套文件**（`reference.md`/`examples.md`）相对路径以它所在目录为基准解析，而 `specs/` 等项目产物一律写到**目标目录**；它说的「本轮目标 = 随命令传入的参数（`$ARGUMENTS`）」在 bootstrap 里**不适用**——bootstrap 的参数是目标目录，本轮要做哪个模块在访谈开始时单独问用户。bootstrap 特有的事项：

- 询问用户是否已有 PRD / 原型（哪怕只是初稿）。完全没有则跳到第 6 步。**PRD / 原型还在演进不是跳过的理由**——只访谈、只定稿当前已想清楚的模块，未定的显式写进「不在范围内」（注明「PRD 未定，下轮再议」），后续每轮 PRD 完善后在新项目里跑 `/feature-spec` 继续。
- SPEC 写入**目标目录**的 `specs/<模块>.md`——文件名一律用模块名，后续轮次的 feature-spec 只认这个命名，不要用 `SPEC.md` 这类通名。
- 请用户评审定稿后再进入下一步。定稿的是**本轮模块**，不是全部功能。

## 第 5 步：拆 GitHub issues（拍板点 3，可跳过）

本步骤就是 `../feature-spec/SKILL.md` 第 4 步——**前置条件、拆分粒度、自包含要求、确认流程以该文件为准**。bootstrap 是首轮，没有存量 issue 要同步：直接把**本轮已定稿的 SPEC** 拆成自包含的 issue，完整列表经用户确认后再逐个 `gh issue create`。

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
