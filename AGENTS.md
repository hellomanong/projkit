# projkit

<!-- 维护须知（Claude Code 注入前会剥离本注释，其他工具会原样读到）：尽量 ≤60 行、硬上限 200 行，只写猜不到的信息。 -->

Claude Code 标准工程实践资料库 + 新项目脚手架。**本仓库根目录的结构本身就是标准项目样板**，`/project-bootstrap` 初始化新项目时以它为参照。

## 关键文件

- `claude-code-best-practices.md`：官方最佳实践全文整理（约 33k tokens，按文首导航块定向读取，不要全文读入）
- `docs/PROJECT-GUIDE.md`：标准目录结构说明，也是脚手架分发给每个新项目的文件
- `.agents/skills/project-bootstrap/`：新项目初始化 skill，用法 `/project-bootstrap <目标目录>`（Codex 中 `$project-bootstrap`）；对已初始化项目重跑 = 刷新方法论文件；只在 projkit 里用，不随样板分发
- `.agents/skills/feature-spec/`：单个功能的「访谈 → SPEC → 拆 issue」循环 skill，**随样板分发到每个新项目**；bootstrap 第 4/5 步与它共用 `reference.md`/`examples.md`
- 两个 skill 的真身都在 `.agents/skills/`，`.claude/skills/`、`.codex/skills/` 里是软链——Claude Code 和 Codex 都能调用

## 约定

- 本仓库是纯文档与配置仓库，没有构建/测试命令
- **工具中立优先**：有跨工具标准的配置（AGENTS.md、SKILL.md）真身放中立位置，`.claude/`、`.codex/` 只放软链；无标准的留 `.claude/`（详见 PROJECT-GUIDE.md）
- 修改 skill 或 templates/ 后，检查 `docs/PROJECT-GUIDE.md` 是否需要同步更新
- `.claude/rules/`、`agents/`、`workflows/`、`specs/` 刻意留空——它们是样板结构的一部分，不要往里塞内容来「示范」
