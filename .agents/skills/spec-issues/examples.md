# 成品样例：issue

本文件由 `SKILL.md` 在写 issue 正文时引用。由 spec-design 样例里那份 SPEC 拆出的第一个 issue，自包含——认领者不看 SPEC 也能开工。

```markdown
标题: 实现订单状态变更的内部事件分发

## 背景

订单状态变更目前只写库，没有对外广播。后续的「SSE 推送端点」issue 依赖这个事件流，本 issue 先把分发层做出来。

## 涉及文件

- `src/notify/dispatcher.ts`（新建）
- `src/erp/webhook.ts`（改造：状态落库后发事件）
- `src/notify/dispatcher.test.ts`（新建）

## 验收标准

- [ ] `dispatcher.emit(event)` 能把事件送达所有已注册的 listener
- [ ] listener 抛异常不影响其他 listener 收事件
- [ ] 无 listener 时 emit 不报错
- [ ] `pnpm test -t dispatcher` 全绿
- [ ] `pnpm lint && pnpm typecheck` 通过

## 不在范围内

- 不实现 SSE 端点（另拆专门 issue）
- 不做事件持久化与重放
- 不改动 webhook 的鉴权逻辑
```

**颗粒度参考**：5 条验收标准、3 个文件、一个 PR 能审完。超过 6 条验收标准就该考虑再拆。

**引用兄弟 issue 用标题、不预填编号**：编号在 `gh issue create` 之前不存在，目标仓库已有历史 issue 时预填必错位；确需互链的，等创建后用 `gh issue edit` 回填编号。
