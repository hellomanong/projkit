# 成品样例：SPEC 与模块架构文档

本文件由 `SKILL.md` 在定稿排版时引用，用来对齐格式与颗粒度。**这是示例不是模板**，内容按实际项目替换。两份样例是同一个模块的两份定稿产物。

## SPEC（`specs/订单状态变更通知.md`）

````markdown
# SPEC: 订单状态变更通知

## 背景

上游 ERP 状态变更后，前端需要在 5 秒内感知。当前靠前端轮询，QPS 已到瓶颈。

## 方案设计

事件驱动 + SSE 单向推送。备选与取舍：WebSocket（放弃——只需服务端到前端的单向推送，SSE 更轻且走现有 HTTP 基建）；加密轮询间隔（放弃——QPS 瓶颈正是本次要解决的问题）。

```mermaid
graph LR
    ERP[上游 ERP] -->|状态回调| WH[erp/webhook 改造]
    WH -->|内部事件| DP[notify/dispatcher 新建*]
    DP -->|订阅| ST[api/orders/stream 新建*]
    ST -->|SSE| FE[前端]
```

图例：`*` = 本轮新建；无 `*` = 改造或既有模块。

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
5. 断开步骤 2 的连接，重复步骤 3，**预期**：服务端日志输出一行 `sse client removed, active=0` 且无报错——连接清理是否生效以这行日志为准
````

**注意这是正式文件**：不含访谈纪要、待定问题等过程内容——那些住草稿里，定稿即删。**注意「方案设计」节**：写了备选与取舍；图是**本轮视角**——只画本轮动的部分与接缝，5 个节点、箭头带方向、新建模块带 `*` 且图下有图例；模块稳态全貌住 `docs/architecture/<模块>.md`（下例），项目整体架构图住 `docs/ARCHITECTURE.md`（三级分工见 `reference.md` §二）。**注意第 4、5 步**：每步都写了**预期结果**，「跑测试」不算验证步骤。**注意「不在范围内」最后一条**：PRD 未定的部分显式圈出来留给下一轮，而不是替用户编需求。

## 模块架构文档（`docs/architecture/订单状态变更通知.md`）

````markdown
# 订单状态变更通知 架构

## 模块图

```mermaid
graph LR
    ERP[上游 ERP] -->|状态回调| WH[erp/webhook]
    WH -->|内部事件| DP[notify/dispatcher]
    DP -->|推送| ST[api/orders/stream]
    ST -->|SSE| FE[前端]
    FE -->|轮询（本期并存）| OD[api/orders 查询接口]
```

## 内部导读

- `erp/webhook`：上游状态回调的唯一入口，校验来源后转发内部事件
- `notify/dispatcher`：消费状态变更事件，维护 SSE 连接池并推送
- `api/orders/stream`：SSE 端点 `GET /orders/:id/stream`，管理连接生命周期
- `api/orders 查询接口`：既有轮询查询，本期与 SSE 并存

## 模块内约定

- 事件形状统一为 `{ orderId, from, to, at }`，字段增删走 ADR → [adr/0007](../adr/0007-推送通道选型.md)
- SSE 断线不补发历史，客户端重连后只收新事件 → [adr/0008](../adr/0008-断线补发策略.md)

## 决策索引

- 推送通道选型（SSE，弃 WebSocket）→ adr/0007
- 断线补发策略（不补发）→ adr/0008
````

**注意与 SPEC 的分工**：模块图是**稳态全貌**——全部子组件连同并存的旧路径都画，不标新建/改造（那是 SPEC 本轮图的事）；每段只说「是什么」，「为什么」住 ADR（决策索引指路）。**注意四段不省**：小模块整份可以更短，「模块内约定」确实没有就写一行「无，全局约定即够」，段本身保留。
