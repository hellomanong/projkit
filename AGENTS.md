# projkit

<!-- 维护须知（Claude Code 注入前会剥离本注释，其他工具会原样读到）：尽量 ≤60 行、硬上限 200 行，只写猜不到的信息。 -->

Claude Code 标准工程实践资料库 + 新项目脚手架。**本仓库根目录的结构本身就是标准项目样板**，`/project-bootstrap` 初始化新项目时以它为参照。

## 关键文件

- `claude-code-best-practices.md`：官方最佳实践全文整理（约 33k tokens，按文首导航块定向读取，不要全文读入）
- `docs/PROJECT-GUIDE.md`：标准目录结构说明，也是脚手架分发给每个新项目的文件
- `.agents/skills/project-bootstrap/`：新项目初始化 skill，用法 `/project-bootstrap <目标目录>`（Codex 中 `$project-bootstrap`）；对已初始化项目重跑 = 刷新方法论文件；只在 projkit 里用，不随样板分发
- `.agents/skills/spec-{interview,design,issues}/`：需求访谈（产出 `docs/adr/` 追加式决策）→ 方案设计与 SPEC 定稿（`docs/specs/` + ARCHITECTURE.md）→ issue 拆分（GitHub 对账）三环流水线——产物文件衔接、各自草稿断点可续、哪环有问题单独修哪环，**随样板分发到每个新项目**；bootstrap 第 4/5 步按序委托它们
- `.agents/skills/spec-dev-doc/`：设计文档生成——把已定稿的 SPEC 投影成自包含 HTML（`docs/review/`，版本化快照）。**SPEC 是模块内容的唯一源**，SPEC 正文按章组织、每章装六栏（这章讲什么 / 图 / 为什么这么定 / 要你拍的 / 缺口 / 怎么做），设计文档取前五栏（含图，其中「为什么这么定」栏在稿子里写作「为什么这么设计」），字段级实现细节留在 SPEC 不进稿；固定的只有开篇「整体设计」与收尾「已决登记」「未决登记」三章，中间章节镜像 SPEC 的章、无固定清单；文字 ≤6 屏（图不计）；三环旁路、仅显式调用，同样随样板分发
- `.agents/skills/spec-proto-tour/`：原型讲解标注——给 PRD 原型 HTML 叠一层可拖拽、可隐藏的讲解面板，逐个功能点写功能解释、PRD 阶段、归属模块与现状，产出 `docs/解读/<主题>-原型讲解.html`（讲解数据在同名目录）；脚本在 `assets/`（`build.py` 注入，`check.js` 与页面内「逐页自检」查锚点）；三环旁路、仅显式调用，同样随样板分发
- 全部 skill 的真身都在 `.agents/skills/`，`.claude/skills/`、`.codex/skills/` 里是软链——Claude Code 和 Codex 都能调用

## 约定

- 本仓库是纯文档与配置仓库，没有构建/测试命令
- **工具中立优先**：有跨工具标准的配置（AGENTS.md、SKILL.md）真身放中立位置，`.claude/`、`.codex/` 只放软链；无标准的留 `.claude/`（详见 PROJECT-GUIDE.md）
- 修改 skill 或 templates/ 后，检查 `docs/PROJECT-GUIDE.md` 是否需要同步更新
- 预建目录刻意留空（`.claude/` 下的 rules/agents/commands/hooks/output-styles/workflows/agent-memory，docs/ 下的 specs/、解读/）——它们是样板结构的一部分，不要往里塞内容来「示范」
