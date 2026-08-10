# 画图范式（内联 SVG：架构图 · 时序图 · 状态机）

设计稿内**所有**图一律按本范式画——现画的、从产物转译的都适用，不是可选项。三类图：架构图（§一–§五）、泳道时序图（§六）、状态机（§七）。风格稳定靠三条：结构件套齐全、配色引模板变量、交互按规模自适应（规则判定，不靠用户记）。

## 一、结构五件套

1. **分层色带**：横向 rect 色带分 3~5 层，每层左上角一枚层标（如「数据面 · 同步路径」「控制面」「执行层」「事件总线」）；层高 100~120px。层从上到下按「请求进入 → 控制 → 执行 → 沉淀」的叙事排。
2. **节点组**：`<g class="node" data-node="唯一id">` = 圆角 rect + 主标题（组件名）+ 副标题（一行职责）。
3. **连线**：横平竖直的正交折线（line / path 拐直角），统一箭头 marker；按通道类型分色分线型——实线 = 同步/热路径，虚线 = 异步/供给/带外。
4. **标签牌**：每条线中点压一块白底小 rect + 一行字（接口编号 + 一句话）——这是零上下文读者能读懂图的关键，无标签的线不许出现。
5. **图例 + 读法导语**：图下 `fig-legend` 列线型含义；图上方 lede 里给一句「图的读法」（先看哪层、主线怎么走）。

## 二、排版算法

- 先分层再排节点：层内等距横排，节点宽随文字（≈ 字数 × 13px + 40）；viewBox 宽 800~960，高 = 层数 × 层高 + 上下边距。
- 连线只走横竖：同层相邻横线直连，跨层竖线或 ⌐ 形折线绕开节点；标签牌放线段中点、避让节点框。
- **节点十来个上限照旧**（spec-design 硬要求同款）——超了说明该拆成两张图。
- 同页多图时，`<defs>` 里的 marker id 用 `<图id>-` 前缀防撞。

## 三、配色与字体（风格一致的机制）

- 基础色一律引用模板 CSS 变量：节点框 `var(--card)` + 描边 `var(--ink)`、文字 `var(--ink)`/`var(--ink2)`、层带 `var(--pine-faint)`、标签牌描边 `var(--line)`。
- 通道语义色允许少量自定（如琥珀 = 管理面、青 = 事件流），写在图专属 style 里并进图例。
- 字体不自设，模板已让 `.flowviz svg text` 继承正文字体。

## 四、交互（按需，两档）

- **静态档**：连线 ≤8 条或流向单一 → 全览静态图，不加任何 JS。
- **交互档**：流向 ≥3 类且连线 >8 条 → 加两样（实现照 §五 模板）：
  - 筛选 chips：图上方按钮组，点击给 figure 设 `data-filter`，CSS 按 `data-flow` 词组匹配淡出无关元素；
  - 悬停高亮：节点 `mouseenter` 时给 `data-nodes` 不含它的元素加 `.hover-dim`。
- 静态档也照常标注 `data-flow`/`data-nodes` 属性（成本为零，后续升交互档不用重排）。
- 交互只做减法：无 JS 环境（打印、邮件预览）自动呈现全览静态图。
- **作用域红线**：图专属 style/script 的选择器与逻辑一律以本图 id 开头。

## 五、骨架样例

静态档最小骨架（两层三节点；真实图按此结构扩展）：

```html
<figure class="flowviz" id="fig-topo">
  <svg viewBox="0 0 800 268" role="img" aria-label="示例拓扑">
    <title>示例拓扑</title>
    <desc>一句话描述图的分层与主线，供读屏与检索。</desc>
    <defs><marker id="fig-topo-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5"
      markerHeight="6.5" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none"
      stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>

    <rect class="band" x="0" y="16" width="800" height="104"/>
    <text class="band-label" x="10" y="32">服务层</text>
    <rect class="band" x="0" y="152" width="800" height="96"/>
    <text class="band-label" x="10" y="168">数据层</text>

    <g class="node" data-node="cli" data-flow="req">
      <rect x="40" y="44" width="170" height="52" rx="4"/>
      <text class="bt" x="125" y="65">调用方</text>
      <text class="bs" x="125" y="84">SDK / 前端</text>
    </g>
    <line class="e-req" data-flow="req" data-nodes="cli svc" x1="210" y1="70" x2="296" y2="70"
      marker-end="url(#fig-topo-ah)"/>
    <g class="plate" data-flow="req" data-nodes="cli svc">
      <rect x="218" y="56" width="70" height="14"/>
      <text x="253" y="66.5">IF-1 REST</text>
    </g>
    <g class="node" data-node="svc" data-flow="req evt">
      <rect x="300" y="44" width="200" height="52" rx="4"/>
      <text class="bt" x="400" y="65">订单服务</text>
      <text class="bs" x="400" y="84">校验 · 编排</text>
    </g>
    <line class="e-async" data-flow="evt" data-nodes="svc db" x1="400" y1="96" x2="400" y2="180"
      marker-end="url(#fig-topo-ah)"/>
    <g class="node" data-node="db" data-flow="evt">
      <rect x="310" y="184" width="180" height="48" rx="4"/>
      <text class="bt" x="400" y="204">PostgreSQL</text>
      <text class="bs" x="400" y="222">订单主数据</text>
    </g>
  </svg>
  <figcaption>图题一句话。</figcaption>
</figure>
<style>
/* 作用域红线：全部选择器以 #fig-topo 开头 */
#fig-topo .band{fill:var(--pine-faint);opacity:.55}
#fig-topo .band-label{font-size:11px;fill:var(--ink2);letter-spacing:.08em}
#fig-topo .node rect{fill:var(--card);stroke:var(--ink);stroke-width:1.1}
#fig-topo .node .bt{font-size:13px;font-weight:600;fill:var(--ink);text-anchor:middle}
#fig-topo .node .bs{font-size:11px;fill:var(--ink2);text-anchor:middle}
#fig-topo line{stroke-width:1.4;fill:none}
#fig-topo .e-req{stroke:var(--ink)}
#fig-topo .e-async{stroke:#8a6d1f;stroke-dasharray:4 3}
#fig-topo .plate rect{fill:var(--card);stroke:var(--line)}
#fig-topo .plate text{font-size:10px;fill:var(--ink2);text-anchor:middle}
</style>
```

交互档在此之上追加（chips + 筛选 CSS + 悬停脚本；`req`/`evt` 换成实际流向名，每个流向一条 CSS）：

```html
<div class="fig-chips" id="fig-topo-chips" aria-label="流向筛选">
  <button data-f="" class="on">全览</button>
  <button data-f="req">请求路径</button>
  <button data-f="evt">事件流</button>
</div>
<style>
#fig-topo-chips{display:flex;gap:8px;margin:12px 0 4px}
#fig-topo-chips button{font-size:12px;padding:3px 10px;border:1px solid var(--line);
  border-radius:999px;background:var(--card);color:var(--ink2);cursor:pointer}
#fig-topo-chips button.on{color:var(--ink);border-color:var(--ink)}
#fig-topo[data-filter="req"] [data-flow]:not([data-flow~="req"]){opacity:.13}
#fig-topo[data-filter="evt"] [data-flow]:not([data-flow~="evt"]){opacity:.13}
#fig-topo .hover-dim{opacity:.15}
</style>
<script>
(function(){
  var fig=document.getElementById('fig-topo');if(!fig)return;
  var chips=document.querySelectorAll('#fig-topo-chips button');
  chips.forEach(function(b){b.addEventListener('click',function(){
    chips.forEach(function(x){x.classList.remove('on')});b.classList.add('on');
    b.dataset.f?fig.setAttribute('data-filter',b.dataset.f):fig.removeAttribute('data-filter');
  });});
  fig.querySelectorAll('.node[data-node]').forEach(function(n){
    var id=n.getAttribute('data-node');
    n.addEventListener('mouseenter',function(){
      if(fig.hasAttribute('data-filter'))return;
      fig.querySelectorAll('[data-nodes],[data-node]').forEach(function(el){
        var ns=(el.getAttribute('data-nodes')||el.getAttribute('data-node')||'').split(' ');
        if(ns.indexOf(id)===-1)el.classList.add('hover-dim');
      });
    });
    n.addEventListener('mouseleave',function(){
      fig.querySelectorAll('.hover-dim').forEach(function(el){el.classList.remove('hover-dim')});
    });
  });
})();
</script>
```

## 六、泳道时序图范式（核心流程章专用）

svg 挂 `class="seqv"`——共享样式模板已内置（生命线、参与者、箭头、标签、注解、循环框全套类名），图内**只需要自己的 marker defs**，不写 style 块（新增流向色才写，作用域照红线）。

结构件套：

1. **参与者头排**：顶部一排圆角 rect + 名字——本模块组件用 `.actor`（松绿），外部件用 `.actor.ext`（青蓝）；4~6 个为宜，超了说明流程该拆。
2. **生命线**：每个参与者一条竖虚线 `.ll`，从头排底部到 cap 区上方。
3. **消息箭头**：自上而下按时间序，y 间距 24~28px；普通消息 `.ar`（灰）、主线/关键写入 `.arg`（松绿加粗）、返回/回执加 `.ard`（虚线）。箭头 marker 用实心三角、灰绿各一枚**固定色**（`fill="#54645d"` / `fill="#1e5c4f"`）——**不要用 context-fill**：共享样式给消息线设了 `fill:none`，context-fill 会跟着变「无」，箭头直接隐形。
4. **消息标签**：每条箭头上方压白底小 rect `.bg` + 一行字 `.mt`——无标签的消息不许出现。
5. **注解块**：`.nb` 琥珀底 rect + `.nt` 文字——多步骤合并（如「验收五步：…」）或规则说明放这里，别拆成八条箭头。
6. **循环框**：流式/重复段用 `.loopbox` 虚线框圈起 + 左上角 `.loopl` 标「循环 · 什么范围」。
7. **图下 cap 行**（本范式的灵魂，固定两行起）：`.cap` 文字——「时限：…」「失败时：…」；有第三行写补充语义。时限与失败语义不进图就等于没设计。

排版：viewBox 宽 960；生命线等距；标签避让生命线；marker id 用 `<图id>-` 前缀防撞。

最小骨架（两参与者一来一回；真实图按此扩展）：

```html
<figure class="flowviz">
  <svg class="seqv" viewBox="0 0 960 220" role="img" aria-label="示例时序">
    <title>示例时序</title>
    <desc>一句话：谁发起、走到谁、什么结果。</desc>
    <defs><marker id="sq-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7"
      orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#54645d"/></marker>
    <marker id="sq-g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7"
      orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#1e5c4f"/></marker></defs>
    <line class="ll" x1="120" y1="52" x2="120" y2="150"/>
    <line class="ll" x1="480" y1="52" x2="480" y2="150"/>
    <g class="actor ext"><rect x="72" y="18" width="96" height="28" rx="3"/><text x="120" y="37">调用方</text></g>
    <g class="actor"><rect x="430" y="18" width="100" height="28" rx="3"/><text x="480" y="37">本模块</text></g>
    <path class="arg" d="M120 84 L476 84" marker-end="url(#sq-g)"/>
    <rect class="bg" x="240" y="66" width="120" height="14"/><text class="mt" x="300" y="77">IF-1 提交请求</text>
    <path class="ar ard" d="M480 120 L124 120" marker-end="url(#sq-a)"/>
    <rect class="bg" x="250" y="102" width="100" height="14"/><text class="mt" x="300" y="113">结果 / 回执</text>
    <text class="cap" x="26" y="182">时限：X ms / 秒（P99 口径写明含什么不含什么）。</text>
    <text class="cap" x="26" y="202">失败时：判断不了就拒（fail-closed）；谁兜底、什么绝不许发生。</text>
  </svg>
  <figcaption>图题一句话。</figcaption>
</figure>
```

## 七、状态机范式（领域对象与实例生命周期专用）

svg 挂 `class="stm"`——共享样式模板已内置，图内只需要自己的 marker defs（普通转移一个灰 marker，危险转移一个赤 marker）。

结构件套：

1. **起点**：实心圆 `.dot` + 灰箭头指向初始状态。
2. **状态框**：圆角 rect + 状态名 `.nt` + 一行说明 `.ns`；语义分色——中性 `.st`、健康 `.st.ok`（松绿）、降级/暂存 `.st.warn`（琥珀）、终态/摘除/拒收 `.st.bad`（赤）。
3. **转移**：普通 `.e`（灰）、危险/不可逆 `.er`（赤）；每条转移旁放触发条件标签 `.lb`（危险的用 `.lbr`），标签不压框。
4. **图下 cap 行**：`.cap` 写全局规则（如「已进坏副本的请求仍拒绝」「重启回到起点从零重拉」）。

排版：健康主线横排在上层，异常/终态放下层；状态 5~7 个为宜，超了拆图；回环转移用弧线（`<path d="M… Q…">`）绕开框。

最小骨架：

```html
<figure class="flowviz">
  <svg class="stm" viewBox="0 0 800 240" role="img" aria-label="示例状态机">
    <title>示例状态机</title>
    <desc>一句话：几个状态、主线怎么走、什么情况进坏态。</desc>
    <defs><marker id="sm-x" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7"
      orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#54645d"/></marker>
    <marker id="sm-xr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7"
      orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#b3372b"/></marker></defs>
    <circle class="dot" cx="36" cy="72" r="8"/>
    <g class="st"><rect x="76" y="50" width="150" height="44" rx="5"/><text class="nt" x="151" y="72">准备中</text><text class="ns" x="151" y="87">未就绪 · 不服务</text></g>
    <g class="st ok"><rect x="330" y="50" width="140" height="44" rx="5"/><text class="nt" x="400" y="72">就绪</text><text class="ns" x="400" y="87">正常服务</text></g>
    <g class="st bad"><rect x="580" y="50" width="150" height="44" rx="5"/><text class="nt" x="655" y="72">已摘除</text><text class="ns" x="655" y="87">终态 · 等运维</text></g>
    <line class="e" x1="44" y1="72" x2="76" y2="72" marker-end="url(#sm-x)"/>
    <line class="e" x1="226" y1="66" x2="330" y2="66" marker-end="url(#sm-x)"/>
    <text class="lb" x="234" y="58">条件齐备</text>
    <path class="er" d="M470 66 L580 66" marker-end="url(#sm-xr)"/>
    <text class="lbr" x="478" y="58">不可逆故障</text>
    <text class="cap" x="26" y="200">全局规则一句话（如：任何状态下判断不了就拒）。</text>
  </svg>
  <figcaption>图题一句话。</figcaption>
</figure>
```
