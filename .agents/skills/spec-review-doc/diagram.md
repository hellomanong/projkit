# 架构图画法范式（内联 SVG）

评审稿内**所有**架构图一律按本范式画——现画的稳态详图、从产物转译的图都适用，不是可选项。风格稳定靠三条：结构五件套、配色引模板变量、交互按规模自适应（规则判定，不靠用户记）。

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
