# 成品样例：AGENTS.md

本文件由 `SKILL.md` 在**第 3 步（生成 AGENTS.md）**引用，用来对齐颗粒度。**这是示例不是模板**——`templates/AGENTS.md.template` 才是要填充的模板。示例的节标题与模板不一一对应是有意的：它是按「没有内容就删掉本节」裁剪后的成品形态，骨架以模板为准、无内容的节照模板注释删掉即可。SPEC 样例在 `../spec-design/examples.md`，issue 样例在 `../spec-issues/examples.md`。

一个真实项目的 AGENTS.md（项目说明文件，CLAUDE.md 软链指向它）。注意它**只写 agent 猜不到的信息**：没有目录结构描述、没有「使用 TypeScript」这类从代码一眼可见的事、没有「写干净代码」这类自明道理。

```markdown
# orderhub

订单中台，对接三个上游 ERP，向前端提供统一订单查询与状态流转接口。

## 命令

- 开发：`pnpm dev`（需先 `docker compose up -d` 起本地 pg 和 redis）
- 测试：`pnpm test`（单测）／ `pnpm test:e2e`（需本地 pg 已起）
- 检查：`pnpm lint && pnpm typecheck` —— 提交前必跑

## 约定

- 数据库迁移只增不改：改字段一律新增迁移文件，不要编辑已合并的迁移
- 对外接口的出入参一律用 zod schema 校验，schema 与 handler 放同一文件
- 金额统一用整数分存储，不用浮点

## 坑

- `ERP_TIMEOUT_MS` 必须设，不设会走 30 秒默认值导致上游雪崩
- 本地 redis 不持久化，重启后需要重跑 `pnpm seed`
- e2e 测试会清库，不要对着有数据的库跑
```

**为什么这样写**：每一行都通过了「删掉它 agent 会犯错吗」的检验。「金额用整数分」不写就会用浮点；「迁移只增不改」不写就会去编辑旧文件。
