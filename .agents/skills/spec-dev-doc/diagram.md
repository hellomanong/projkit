# 画图范式（HTML/CSS 盒子 · mermaid）

设计稿内**所有**图一律按本范式画——现画的、从 SPEC 投影的都适用，不是可选项。两种画法：架构图与流程图用 HTML/CSS 盒子（§一），时序图与状态机用 mermaid（§二）。风格统一靠三条：只用模板内置的类与变量；mermaid 的配色与布局配置由 `render-mermaid.sh` 统一注入；图源里不写任何自定义样式。

## 零、下笔前先定「这张图讲哪一件事」

借 `eli5` 插件（`eli5@claude-community`）的取向：**大图、少字、只讲一件事**。它本身是一段提示词而不是渲染器，产出是整页 HTML explainer，格式与本模板不兼容——**不要直接调用它生成图**，借的是它的判断标准：

- **一张图只回答一个问题。** 下笔前先用一句话写出「这张图要让读者看懂什么」。**写不出来就不画**——把缺图记进缺口栏，不许硬凑。一张图同时讲结构、讲流程、讲失败路径，必然乱。这条压过「尽量画图」：讲不清的图比没有图更糟。
- **字要少。** 一条连线或消息的标签超过 8 个字就说明它承担了太多；把解释挪到图下的 `cap` 行或正文。节点副标题一行封顶。
- **画不下就拆。** 节点超过十来个、连线超过 12 条，拆成两张图，不要挤。

自检一句话：把图给一个没读过正文的人看，他能不能说出「这张图在讲什么」。说不出就是没画对。

## 一、架构图与流程图：HTML/CSS 盒子

**不手算 SVG 坐标。** 理由是实测出来的：SVG 里每个元素的位置是人填的数字，填错了没有任何东西会拦住你——标签压住节点、连线穿过框、斜线交叉成网，都是这么来的。HTML/CSS 里位置是浏览器算的，盒子天生不会重叠。

| 图的类型 | 用什么 | 为什么 |
|---|---|---|
| 分层架构图、模块关系图 | **HTML/CSS 盒子**（本节） | 分层 = 容器，节点 = 弹性盒；浏览器负责排版，零重叠 |
| 流程步骤（几步走完一件事） | **HTML/CSS 胶囊 + 箭头**（本节） | 一行胶囊按顺序排，箭头是胶囊之间的字符，不需要算坐标 |
| 泳道时序图 | **mermaid `sequenceDiagram`**（§二） | 生命线、跨泳道箭头、时间顺序，盒子表达不了；mermaid 自动排版 |
| 状态机 | **mermaid `stateDiagram-v2`**（§二） | 回环与分支自动布线 |

### 画法骨架

样式写在图专属 `<style>` 里，选择器一律以 `.dgm` 开头限定作用域；配色只引模板 CSS 变量，不自造颜色。

```html
<div class="dgm">
  <div class="lane"><h4>层名（如「领域 · 发布事务」）</h4>
    <!-- chain = 有先后顺序；连接符是真元素，盒子之间各插一个 -->
    <div class="chain">
      <div class="bx"><b>上游组件</b><span>一行职责</span></div>
      <svg class="conn" viewBox="0 0 30 18"><path class="l" d="M0 9 H22"/><path d="M17 5 L24 9 L17 13"/></svg>
      <div class="bx new"><b>本期新建</b><span>一行职责</span></div>
      <svg class="conn async" viewBox="0 0 30 18"><path class="l" d="M0 9 H22"/><path d="M17 5 L24 9 L17 13"/></svg>
      <div class="bx ext"><b>外部依赖</b><span>一行职责</span></div>
    </div>
    <!-- row = 并列，无先后，不插连接符 -->
    <div class="row">
      <div class="bx"><b>同级组件甲</b><span>一行职责</span></div>
      <div class="bx"><b>同级组件乙</b><span>一行职责</span></div>
    </div>
  </div>
  <!-- 层与层之间的竖箭头 -->
  <div class="down">
    <svg viewBox="0 0 24 30"><path class="l" d="M12 0 V22"/><path d="M8 17 L12 24 L16 17"/></svg>
    <span>②③ 这一步干什么</span>
  </div>
  <div class="lane"><h4>下一层</h4>
    <div class="chain">…</div>
    <div class="down async">
      <svg viewBox="0 0 24 30"><path class="l" d="M12 0 V22"/><path d="M8 17 L12 24 L16 17"/></svg>
      <span>⑫ 异步回程，虚线</span>
    </div>
  </div>
  <p class="note">图例：绿框 = 本期新建；白框 = 已有；蓝框 = 外部依赖。实线 = 正常路径，虚线 = 异步回程。</p>
</div>
```

**连接符必须是真元素，不要用 CSS 伪元素画三角形。** 伪元素三角有两个坑，都是实测踩出来的：

1. **换行时留下半截箭头**——盒子折到下一行，横箭头还留在原位指向空处，看起来就是「箭头只显示一半」。
2. **线和箭头是两个东西**，接缝处对不齐；用一个 `<svg>` 里的两条 path，线与箭头一笔画成，永远不会错位。

**链不换行**（`flex-wrap:nowrap` + `overflow-x:auto`）：链表示「有先后顺序」，序列不该被折断。窄屏放不下就横向滚动，箭头永远指着对的方向。并列的 `.row` 照常换行。

**`.chain` 和 `.row` 的区别是这套画法的关键**：`.chain` 表示「有先后顺序」，浏览器自动在盒子之间画横箭头；`.row` 表示「并列存在，没有先后」，不画箭头。**别全用 `.row`——那样图上只有框没有线，读者看不出谁连谁。**

层与层之间用 `.down`（带竖箭头和说明胶囊），异步回程加 `.async` 转虚线。箭头全部由 CSS 画，不需要算任何坐标。

六条约束：

- **有先后用 `.chain`，并列用 `.row`**——只有 `.chain` 会自动出箭头。图上只有框没有线，多半是全写成 `.row` 了。
- **层用 `.lane`，节点用 `.bx`**——`.bx.new` 本期新建（松绿）、`.bx.ext` 外部依赖（青蓝）、无修饰 = 已有。语义靠这三档，不另造颜色。
- **节点副标题一行封顶**，写不下说明职责没想清楚。
- **步骤流用 `.flow` + `.step`**，编号放 `<i>`，箭头用 `→` 字符——不画线就不会有线穿框的问题。
- **图例写进 `.note`**，不要指望读者猜颜色含义。
- **`.row` 用 `flex-wrap`**，窄屏自动折行；不要给盒子写死宽度。

**配套 CSS 已内置在 `template.html`**（`.dgm` 及其子类），图内直接用类名即可，不要重写一份——重写就会各文档风格漂移。需要新增语义档位时改的是 `template.html`（母本升级，在 projkit 里改，随刷新分发）。

## 二、时序图与状态机：mermaid

mermaid 由程序排版，人不填坐标，标签压线、线穿框这类问题不存在。代价是你控制不了线怎么走，只能通过改图的结构去影响布局（§二点三）。

### 二点一、两个载体，同一份图源

| 载体 | 怎么放 |
|---|---|
| SPEC（Markdown） | ```` ```mermaid ```` 代码块直接写；GitHub 与 IDE 原生渲染 |
| 开发设计稿（HTML） | **预渲染**：图源存成 `.mmd`，跑 `render-mermaid.sh` 得到自包含 SVG，贴进 `<figure class="flowviz">`；图源原文一并留在 figure 里供下次修改 |

开发设计稿必须预渲染，不许在页面里引 mermaid 脚本：产物是离线自包含 HTML，外链 CDN 意味着打开文档要联网，内联 `mermaid.min.js` 意味着每份文档多 3.4 MB。预渲染出的 SVG 每张约 35 KB，内嵌样式，不依赖任何外部文件。

投影时两侧同源：SPEC 里已有的 mermaid 图，原文复制进 `.mmd` 即可，不重画。

配色、字体、`htmlLabels:false`（纯 SVG 文字，不含 foreignObject）、`mirrorActors:false`（不重复画底部参与者）、`wrap:true`（长消息标签自动折行）、`useMaxWidth:false`（按原始尺寸显示，宽了横向滚动）这些配置全部由 `render-mermaid.sh` 注入，**图源里不写 `%%{init}%%`**——写了就会和别的图不一致。

### 二点二、内容规则

时序图（`sequenceDiagram`）：

- 参与者 4~6 个，超了说明流程该拆。名字**只写一行**，`<br/>` 会把两行挤在一起。
- 泳道用 `box` 分组：本模块组件一组、进程外一组，组名写清（如 `box rgb(238,244,241) outbox 包`）。
- 开头写 `autonumber`，编号就是接口编号，正文引用「第 ③ 步」时能对上。
- `->>` 请求与主线；`-->>` 返回与回执（虚线）。
- 多个步骤合并成一条时写 `Note over A,B: …`（如「验收五步：…」），不拆成八条箭头。
- 流式或重复的段落用 `loop 范围 … end` 圈起。
- **图下 cap 行**（本范式的灵魂，固定两行起）：figure 内 `<p class="cap">` 写「时限：…」「失败时：…」。时限与失败语义不进图就等于没设计。

状态机（`stateDiagram-v2`）：

- 状态 5~7 个，超了拆图；写 `direction LR`，健康主线在前。
- 语义分色固定三档，`classDef` 原文照抄（颜色对应模板变量 `--pine-soft` / `--amber-soft` / `--seal-soft`）：

  ```
  classDef ok   fill:#e4efea,stroke:#1e5c4f,color:#1a2420
  classDef warn fill:#f4edda,stroke:#8a6317,color:#1a2420
  classDef bad  fill:#f6e9e6,stroke:#b3372b,color:#1a2420
  ```

  健康态用 `ok`、降级或暂存态用 `warn`、终态 / 摘除 / 拒收用 `bad`，中性态不标。
- 每条转移都写触发条件，不许有无标签的边。
- 图下 cap 行写全局规则（如「任何状态下判断不了就拒」）。

### 二点三、布局坑（实测，只能靠改结构绕开）

| 坑 | 后果 | 绕法 |
|---|---|---|
| 状态机自环（节点指向自己） | 标签压在节点上 | 拆节点：把一个组件按角色拆成两三个节点，环就没了。时序图的自环不受影响，会自动画成方钩 |
| 双向边（A→B 且 B→A） | 两条标签**可能**叠成糊字 | 先渲染看：排得开就留着（来回两个转换本来就该画出来）；糊了把反向那条改成 `note` |
| `LR` 方向 + 节点多 | 横向拉得极宽，读者要横向滚动才能看完 | 换 `TB`，或减少节点 |

**光看图源判断不了图乱不乱**——源码规整的图渲染出来照样可能糊成一团，必须渲染看（§三）。

### 二点四、最小骨架

图源 `fig-seq-example.mmd`：

```
sequenceDiagram
    autonumber
    participant C as 调用方
    box rgb(238,244,241) 本模块
    participant S as 服务
    end
    C->>S: IF-1 提交请求
    S-->>C: 结果 / 回执
```

渲染（脚本在本 skill 目录）：

```bash
render-mermaid.sh fig-seq-example.mmd fig-seq-example.svg --png fig-seq-example.png
```

贴进设计稿：

```html
<figure class="flowviz" id="fig-seq-example">
  <!-- 粘贴 fig-seq-example.svg 全文 -->
  <figcaption>图题一句话。</figcaption>
  <p class="cap">时限：X ms / 秒（P99 口径写明含什么不含什么）。<br>失败时：判断不了就拒（fail-closed）；谁负责最终保障、什么绝不许发生。</p>
  <script type="text/plain" class="mmd-src">
（图源原文，供下次修改；浏览器不渲染这段）
  </script>
</figure>
```

同一页里多张图的 SVG id 不得重复：脚本默认取输出文件名主干作 id，文件名不重就不会撞。

## 三、落盘后必须渲染目检（硬步骤，不是「条件允许」）

mermaid 不会压字，但会横向撑爆（SVG 按原始尺寸显示，不缩放）、双向边糊字、`box` 分错组、标签写太长；HTML/CSS 盒子图会链被折断、只有框没有线。**这些只有渲染出来才看得见。**

### 怎么看

- 单图：`render-mermaid.sh … --png` 顺手出的截图，逐张看。
- 整页：用无头 Chrome 截整份设计稿，看排版和盒子图。先探测本机的 Chromium 内核浏览器，**不要硬编码路径**——本 skill 随样板分发到各种机器，写死 macOS 路径在 Linux / Windows 上必然失败：

```bash
find_browser() {
  for c in "$CHROME_BIN" \
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    "/Applications/Chromium.app/Contents/MacOS/Chromium" \
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
    "$(command -v google-chrome 2>/dev/null)" \
    "$(command -v chromium 2>/dev/null)" \
    "$(command -v chromium-browser 2>/dev/null)" \
    "$(command -v msedge 2>/dev/null)"; do
    [ -n "$c" ] && [ -x "$c" ] && { printf '%s' "$c"; return 0; }
  done
  return 1
}
CH="$(find_browser)" || { echo "未找到 Chromium 内核浏览器"; exit 3; }
"$CH" --headless=new --disable-gpu --screenshot=out.png \
  --window-size=1400,2400 --hide-scrollbars --virtual-time-budget=3000 \
  "file:///绝对路径/产物.html"
```

**探测不到浏览器怎么办**（不阻断流程）：`render-mermaid.sh` 同样需要浏览器，所以 mermaid 图也渲染不出来。这时把 `.mmd` 图源写进 figure 内的 `<pre>`，交付时明说「本机没有可用浏览器，图未预渲染、未经目检，请在有浏览器的机器上跑 `render-mermaid.sh` 补图」。**不许跳过检查还说通过。**

### 看什么（逐条过，别扫一眼就过）

| 检查项 | 翻车表现 |
|---|---|
| 图是否横向撑爆 | SVG 按原始尺寸显示，宽过正文栏就要横向滚动；超过一屏半的图该拆或减参与者 |
| 双向边标签 | 两个标签叠在一起 |
| `box` 分组 | 参与者归错组；组名缺失 |
| 标签长度 | 一条消息标签超过 20 字，整图被它撑宽 |
| 盒子图的链 | 链被折断（该用 `.chain` 的写成了 `.row`），或只有框没有线 |
| `cap` 行 | 时序图缺「时限 / 失败时」两行；状态机缺全局规则 |
| 图下说明 | `figcaption` 与 `cap` 跑进图内容区，而不是在图下方 |
