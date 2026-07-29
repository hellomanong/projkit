---
name: feature-spec
description: 为一个功能/模块走一轮「增量访谈 → SPEC 定稿 → 拆 GitHub issues」。PRD 渐进式演进时反复调用，每轮只处理已想清楚的部分；PRD 变更后也用它同步已有 SPEC 与未完成 issue。仅限用户显式调用（Claude Code 中 /feature-spec <模块名或本轮增量说明>，Codex 中 $feature-spec），不要自动触发。
argument-hint: <模块名或本轮 PRD 增量的说明>
disable-model-invocation: true
---

# 功能 SPEC 循环

本 skill 随 projkit 样板分发到每个新项目，真身在 `.agents/skills/`（SKILL.md 开放标准的通用目录），`.claude/skills/` 与 `.codex/skills/` 里是指向它的软链——Claude Code 和 Codex 调用的是同一份文件。

前提假设：**PRD 和原型是渐进式的**——每轮只定稿当前已想清楚的模块，未定的显式写进「不在范围内」，下一轮 PRD 完善后再跑一遍本 skill。不要等全部想清楚才开工，也不要替 PRD 没说的部分编需求。

**本轮目标 = 用户随命令传入的参数**（Claude Code 中即 `$ARGUMENTS`）。为空则先问用户：这轮要处理哪个功能/模块？PRD 或原型在哪？

全程用简体中文交流。两个拍板点必须停下来等用户确认：**SPEC 定稿**、**issue 列表**。

## 配套文件索引

按你当前要做的事查表，不要预先全读。下表文件都在本 skill 目录（本文件所在目录）下。

| 你现在要做什么 | 读这个 |
|---|---|
| 要开始访谈，不知道该问什么 | `reference.md` §一 访谈问题库 |
| 写 SPEC，不确定格式和颗粒度 | `examples.md` §一 |
| 写完 SPEC，想判断它合不合格 | `reference.md` §二 三要素检验标准 + 常见失败模式 |
| 用户说验证步骤/范围写得不好，要返工 | `reference.md` §二「常见失败模式」表，对症修 |
| 要拆 issue，不确定拆多细、怎么算自包含 | `reference.md` §三 issue = mini-spec |
| 写 issue 正文，不确定格式 | `examples.md` §二 |

## 第 1 步：定位本轮范围

- 让用户提供本轮的 PRD 文本 / 文件路径 / 原型截图。
- 判断是哪种情况：
  - **新功能**（`specs/` 里还没有对应模块）→ 走第 2 步访谈。
  - **已定稿模块的变更**（PRD 改到了已有 SPEC 覆盖的部分）→ 访谈可以精简，只问变化的部分，然后进第 3 步，重点在第 4 步的存量同步。

## 第 2 步：增量访谈

- 开始前先读 `reference.md` §一（分维度的访谈问题库）。
- 逐个提问详细采访（Claude Code 中用 AskUserQuestion 工具，其他工具用普通提问）：技术实现、UI/UX、边界情况、顾虑和权衡。**一次只问一个问题**，等回答再问下一个。不问显而易见的问题，深挖用户可能没考虑到的难点。
- 只访谈本轮模块。访谈中冒出来的、用户还没想清楚的事项，不要追问到底——记下来，第 3 步写进「不在范围内」。

## 第 3 步：SPEC 定稿（拍板点 1）

- 写入（或更新）`specs/<模块>.md`。三要素缺一不可：涉及的文件与接口、明确不在范围内的事项、结尾一个端到端验证步骤——**验证步骤必须写明预期结果，「跑测试通过」不算**。
- PRD 未定的部分显式列进「不在范围内」，注明「PRD 未定，下轮再议」，而不是假装不存在。
- 格式参照 `examples.md` §一，写完对照 `reference.md` §二自检一遍。
- 把成品给用户评审，定稿后落盘。

## 第 4 步：同步与拆 issue（拍板点 2）

- 需要远程仓库；没有则询问是否 `gh repo create`。
- **变更轮先做存量同步**：`gh issue list` 找出未完成的相关 issue，对照新版 SPEC——issue 是 mini-spec，SPEC 变了它就过期了。该改的改正文，该作废的关掉（注明原因）；已完成部分要改的，开新 issue，不翻旧账。
- 把本轮 SPEC 的新增工作拆成自包含的 issue：拆分粒度见 `reference.md` §三，格式参照 `examples.md` §二。
- 先把完整变更清单（新建哪些、改哪些、关哪些）给用户过目，确认后再逐个执行 `gh issue create` / `gh issue edit` / `gh issue close`。

## 收尾

- 提醒用户：**SPEC 写完开新会话执行**（官方建议——新会话上下文干净、完全聚焦实现）。本 skill 只产出 SPEC 和 issue，不负责实现。
- 指回 `docs/PROJECT-GUIDE.md` 的「标准开发循环」，从 `gh issue view` 开始做。

## 红线

- 两个拍板点不能替用户决定，成品必须过目后再落盘/创建。
- 事实来源分工：`specs/` 是「当前意图」，issue 看板是「执行状态」，PRD 原文只是访谈输入。不要在 SPEC 里维护版本号或变更日志——版本演进靠 git。
