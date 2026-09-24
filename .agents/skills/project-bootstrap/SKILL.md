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

全程用简体中文与用户交流。本 skill 自己的拍板点是 **AGENTS.md（项目说明）内容**；第 4/5 步委托的三个 spec-* skill 各有自己的拍板点，以它们的 SKILL.md 为准。

## 配套文件索引

**按你当前要做的事查表，不要预先全读。** 下表路径均相对本 skill 目录。第 4/5 步委托的三个 spec-* skill 自带各自的 reference/examples，由它们的 SKILL.md 自己指引，不在此表。

| 你现在要做什么 | 读/执行这个 |
|---|---|
| 在目标目录建出全部标准目录 | **执行** `scripts/init-skeleton.sh <目标目录>`（不用读它的内容） |
| 生成 settings.json / .gitignore | `templates/settings.json.template`、`templates/gitignore.template` |
| 生成 AGENTS.md，但不确定该写多细、写哪些 | `examples.md`（含「为什么这样写」的逐行说明） |

## 拷贝来源对照

| 新项目文件 | 来源 |
|---|---|
| 目录结构 | 照 `<projkit>` 根目录的结构建（不含 claude-code-best-practices.md；`.agents/skills/` 里只拷贝五个 spec-*，不拷贝本 skill 及其软链） |
| `docs/PROJECT-GUIDE.md` | `<projkit>/docs/PROJECT-GUIDE.md` 原样拷贝 |
| `.agents/skills/spec-interview/`、`spec-design/`、`spec-issues/`、`spec-dev-doc/`、`spec-proto-tour/` | `<projkit>` 对应五个目录原样拷贝（真身；前三个是每轮需求→设计→拆分的三环，spec-dev-doc 按需把定稿 SPEC 投影成设计文档，spec-proto-tour 按需给原型叠讲解标注） |
| `.claude/skills/`、`.codex/skills/` 下各五条软链 | 相对软链，各指向 `../../.agents/skills/<对应 skill>`（拷贝后创建，共十条） |
| `.claude/settings.json` | 本 skill 目录 `templates/settings.json.template` |
| `.gitignore` | 本 skill 目录 `templates/gitignore.template`（已存在则只追加缺失条目） |
| `docs/解读/README.md` | 本 skill 目录 `templates/inputs-README.md.template` 原样拷贝（已存在则不动）——外来输入登记表，各类上游参考的目录/URI 由用户后续填充 |
| `AGENTS.md` | 本 skill 目录 `templates/AGENTS.md.template` 填充生成（见第 3 步）——项目说明的唯一事实来源 |
| `CLAUDE.md` | 软链到 AGENTS.md（第 3 步顺手创建）——Claude Code 只认这个文件名 |

## 刷新模式（对已初始化项目重跑）

**判定**：目标目录**同时**有 `docs/PROJECT-GUIDE.md` 和 `AGENTS.md`（或指向它的 CLAUDE.md）才算已初始化，进入刷新模式。只有其一不算——可能是上次初始化中途断了，也可能是项目恰好自带同名文件：把检测到的现状告诉用户，问清是继续初始化还是刷新；继续初始化就正常走第 1~6 步（各步骤幂等，已有的部分自动跳过）。用户在缺 AGENTS.md 的情况下坚持只刷新：照做四件事，但第 3 件事**跳过 `CLAUDE.md` 软链**（目标不存在，建了就是悬空链），汇总里说明缺口、建议改走初始化补齐。

刷新模式**只做四件事**，做完输出汇总直接结束，不走第 1~6 步：

1. 重跑 `<本 skill 目录>/scripts/init-skeleton.sh <目标目录>`（幂等，只补缺失——projkit 后来新增的标准目录靠这步补齐，否则同步来的 PROJECT-GUIDE.md 会描述一个项目里不存在的目录）。脚本输出（新建了哪些、游离 .md 告警）纳入收尾汇总如实转述。顺手从模板补建缺失的 `docs/解读/README.md`（已存在则不动——登记内容属于项目自己）。
2. **逐文件同步**（不要「删目录重拷」）五个 `.agents/skills/spec-*/` 目录和 `docs/PROJECT-GUIDE.md` 到 `<projkit>` 最新版：有差异的文件先展示 diff、经用户确认再覆盖；目标目录有而 projkit 没有的文件一律保留（从文件状态无法区分是项目自增还是 projkit 已删除），在收尾汇总里列出、由用户事后决定去留——不当场逐文件阻塞询问。任何一类都不要静默冲掉。
3. 检查软链（`CLAUDE.md`，加上 `.claude/skills/`、`.codex/skills/` 下每个 spec-* 各一条，共十一条）：缺了补建，指向不对改正（在汇总里说明）。原则是**软链位置上不是软链的东西属于用户，不静默替换**：
   - skill 位置上是真实目录：可能是 Windows 退化拷贝方案或有意为之（见 PROJECT-GUIDE.md「坑」第 7 条），先展示现状问用户。要切软链，先把拷贝里真身没有的本地改动并入真身（或经用户确认放弃），再删拷贝建链；保留拷贝形态的，把第 2 件事同步后的内容镜像进去（退化方案的约定就是改真身后手动同步，刷新时替用户做掉）。
   - `CLAUDE.md` 是真实文件：不问要不要切软链（那是初始化第 3 步的事）。它的源是本项目自己的 AGENTS.md，不是 projkit 的任何文件；两者不一致时只提示用户对齐。

   补建软链后顺手删掉该 skills 目录里的 `.gitkeep`（第 1 件事重跑脚本可能在空目录里放了占位）。
4. 其余一概不动：AGENTS.md、settings.json、.gitignore、docs/specs/、issues 都属于项目自己，刷新与它们无关。

## 第 1 步：环境检查

- 确认目标目录：不存在则创建；已有较多文件则列出来并询问用户是否确认在此初始化。
- 目标目录不是 git 仓库则在其中 `git init`。
- `gh auth status` 检查 GitHub CLI；未安装或未登录时告知用户**另开一个终端**跑 `gh auth login`（交互式向导需要真实终端，agent 会话内没有交互 TTY，跑了会挂起）。非交互替代：把 `GH_TOKEN` 设进 **agent 会话自己的进程环境**（启动会话前 export，或写进 `.claude/settings.json` 的 `env`；在另开的终端里 export 对本会话无效）即可直接用 gh，或 `gh auth login --with-token < 存有PAT的文件`——该选项从 stdin 读 token，裸跑会卡住。此项不阻塞第 1~4、6 步；**第 5 步拆 issue 必须已登录**，走到那一步还没登录就先停下补登录。

## 第 2 步：生成目录结构

执行本 skill 目录下的脚本，它会建齐全部标准目录并放好 `.gitkeep` 占位（幂等，已存在的一律跳过）：

    <本 skill 目录>/scripts/init-skeleton.sh <目标目录>

（Claude Code 中即 `${CLAUDE_SKILL_DIR}/scripts/init-skeleton.sh`，已在 allowed-tools 预授权。）

把脚本的输出如实转述给用户（新建了哪些、跳过了哪些）。脚本只建目录骨架，接着按上文「拷贝来源对照」表逐项落盘（AGENTS.md 及 CLAUDE.md 软链留到第 3 步生成）；建好软链后顺手删掉脚本在三个 skills 目录里留的 `.gitkeep`。

⚠️ **占位文件必须是 `.gitkeep`，绝不能是 `.md`**：`rules/`、`agents/`、`commands/`、`output-styles/` 四个目录会把里面每个 `.md` 当成一份生效的配置读取——放 README 进去会凭空多出一条全程加载的规则、一个 subagent、一个斜杠命令或一个输出风格。目录的用途说明写在 `docs/PROJECT-GUIDE.md` 里，不要写进目录本身。脚本已按此实现，且会在发现游离 `.md` 时告警。

不预建的两项：`.claude/agent-memory-local/`（已 gitignore，由 CC 按需自动创建）、`.mcp.json`（有要连的 MCP 服务时再建，见 PROJECT-GUIDE.md）。

## 第 3 步：生成 AGENTS.md（拍板点 1）

项目说明写在 `AGENTS.md`（开放标准，Codex / Cursor / Gemini CLI 直接读），`CLAUDE.md` 只是指向它的软链——Claude Code 认这个文件名，会跟随软链读到同一份内容。

- 逐个提问问清楚（Claude Code 中用 AskUserQuestion 工具，其他工具用普通提问）：项目名与一句话定位、技术栈、构建/测试/lint 命令（还没有就写 TODO）、AGENTS.md 的维护 owner（没有就填 TODO）。
- 先读 `examples.md`，对齐颗粒度。
- 按模版填充，全文尽量控制在 60 行以内、硬上限 200 行。只写 agent 猜不到的信息；不写目录结构描述、不写显而易见的语言惯例。逐行自检：「删掉它 agent 会犯错吗？不会就删。」
- 老项目已有**真实的** CLAUDE.md 或 AGENTS.md 时，以已有内容为底、只补模版缺的部分，不要丢弃用户写过的东西。
- 把生成结果给用户看，确认后落盘为 `AGENTS.md`，再**在目标目录内**执行 `ln -s AGENTS.md CLAUDE.md`——软链必须建在目标目录里，不要在别的 cwd 裸跑。已有真实 CLAUDE.md 时：内容并入 AGENTS.md 且经用户确认后，先删掉原文件再建链（裸 `ln -s` 会报 File exists）。

## 第 4 步：需求访谈与设计定稿（可跳过）

依次运行 `../spec-interview/SKILL.md` 与 `../spec-design/SKILL.md` 的流程——**拍板点、草稿约定、规范与样例全以它们为准，读它们照做，不在这里重复**。换算三条：它们说的「命令参数」在 bootstrap 里不适用——本轮做哪个模块在访谈开始时单独问用户；所有产物（`docs/adr/`、`docs/specs/<模块>.md`、`docs/ARCHITECTURE.md`）一律写到**目标目录**；两个 skill 各自收尾的提交提示**照常执行**——目标仓库刚 `git init`，第一笔就是 initial commit，第 6 步不再重复、只提交剩余改动。bootstrap 特有的事项：

- 询问用户是否已有 PRD / 原型（哪怕只是初稿）。完全没有则跳到第 6 步。**PRD / 原型还在演进不是跳过的理由**——只定稿当前已想清楚的模块，未定的进「未决问题」与「不在范围内」，后续在新项目里跑 `/spec-interview`、`/spec-design` 继续。
- 定稿的是**本轮模块**，不是全部功能。

## 第 5 步：拆 GitHub issues（可跳过）

运行 `../spec-issues/SKILL.md` 的流程——**前置条件、对账规则、拍板与执行全以它为准**。可跳过：issue 什么时候拆都行，以后在新项目里跑 `/spec-issues` 一样能拆。换算：老项目 GitHub 上可能早有存量 issue，对账**不可省**；目标仓库还没有远程时不要建议 push。

## 第 6 步：收尾

- 询问用户是否提交（第 4 步跑过的话 initial commit 已在其收尾产生，这里只提交剩余改动；完全跳过第 4/5 步时，这里才是 initial commit）。
- 输出汇总：建了什么；哪些目录故意留空、什么触发条件下往哪个目录加东西（引导用户读目标项目的 `docs/PROJECT-GUIDE.md`，尤其是「初始化之后」一节）。
- 下一步建议，按第 4/5 步的实际走向给：
  - 已拆出 issue → 在**新项目目录**里另开新会话（claude 或 codex 均可），`gh issue view` 认领第一个，走标准开发循环。
  - 跳过了访谈/设计/issue，或 PRD 只定稿了一部分 → 想清楚第一块后在新项目里依次跑 `/spec-interview <模块>` → `/spec-design <模块>` → `/spec-issues <模块>`（Codex 中 `$` 前缀同名），再进开发循环。

## 红线

- 不要往新项目的 `.claude/rules/`、`.claude/agents/` 里预填任何内容——配置从实际痛点里长出来。唯一预填例外是随样板分发进 `.agents/skills/` 的五个 spec-* skill（及其十条软链）：它们和 PROJECT-GUIDE.md 一样属于方法论本身，不是替项目预设的配置。此外不预填。
- 不要替用户做「拍板点」的决定。
- 不要修改 `<projkit>` 下的任何文件——它是样板，只读。所有写操作都发生在目标目录里。
- 每一步落盘后如实报告结果，失败就说失败。
