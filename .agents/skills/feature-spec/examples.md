# 成品样例

本文件由 `SKILL.md` 在写 SPEC、写 issue 时引用，用来对齐格式与颗粒度。**这些是示例不是模板**。projkit 的 `project-bootstrap` skill 做首轮 SPEC 时也引用本文件。

---

## 一、SPEC 样例

只展示结构与颗粒度，内容按实际项目替换。

```markdown
# SPEC: 订单状态变更通知

## 背景

上游 ERP 状态变更后，前端需要在 5 秒内感知。当前靠前端轮询，QPS 已到瓶颈。

## 涉及的文件与接口

- `src/notify/dispatcher.ts`（新建）：消费状态变更事件，推送到 SSE 连接
- `src/api/orders/stream.ts`（新建）：`GET /orders/:id/stream`，SSE 端点
- `src/erp/webhook.ts`（改造）：收到上游回调后额外发一条内部事件
- 事件形状：`{ orderId: string, from: OrderStatus, to: OrderStatus, at: number }`

## 不在范围内

- 不做断线重连的客户端 SDK（前端自己处理）
- 不做历史状态回放，只推送连接建立之后的变更
- 不改动现有轮询接口，本期与 SSE 并存
- 通知的移动端推送渠道 PRD 未定，下轮再议

## 端到端验证

1. `pnpm dev` 起服务
2. `curl -N localhost:3000/orders/A123/stream` 保持连接
3. 另开终端：`curl -X POST localhost:3000/erp/webhook -d '{"orderId":"A123","status":"SHIPPED"}'`
4. **预期**：步骤 2 的终端在 1 秒内输出一行 `data: {"orderId":"A123","from":"PAID","to":"SHIPPED",...}`
5. 断开步骤 2 的连接，重复步骤 3，**预期**：服务端无报错、无内存泄漏（`pnpm test:e2e -t sse-cleanup` 通过）
```

**注意第 4、5 步**：每步都写了**预期结果**。「跑测试」不算验证步骤。**注意「不在范围内」最后一条**：PRD 未定的部分显式圈出来留给下一轮，而不是替用户编需求。

---

## 二、issue 样例

由上面的 SPEC 拆出的第一个 issue。自包含——认领者不看 SPEC 也能开工。

```markdown
标题: 实现订单状态变更的内部事件分发

## 背景

订单状态变更目前只写库，没有对外广播。SSE 推送（#43）依赖这个事件流，本 issue 先把分发层做出来。

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

- 不实现 SSE 端点（见 #43）
- 不做事件持久化与重放
- 不改动 webhook 的鉴权逻辑
```

**颗粒度参考**：5 条验收标准、3 个文件、一个 PR 能审完。超过 6 条验收标准就该考虑再拆。
