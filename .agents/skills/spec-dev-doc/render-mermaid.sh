#!/usr/bin/env bash
# render-mermaid.sh —— 把一份 mermaid 图源预渲染成自包含 SVG，供开发设计稿（离线 HTML）贴图。
#
# 用法：render-mermaid.sh <图源.mmd> <输出.svg> [--id <svg-id>] [--png <截图.png>]
#   --id   SVG 根元素的 id，默认取输出文件名主干；同一页里多张图的 id 不得重复
#   --png  顺手把渲染结果截成 PNG，供目检
#
# 依赖（都自动探测，探测不到就报错退出，不静默降级）：
#   Chromium 内核浏览器   环境变量 CHROME_BIN 优先，否则按常见安装位置探测
#   mermaid.min.js        环境变量 MERMAID_JS 优先，否则找 npx 缓存 / 全局 npm / 当前项目 node_modules
#   node                  用来从渲染后的 DOM 里抠出 <svg>
#
# 配色与布局配置只在本脚本定义一次（颜色对应 template.html 的 :root 变量），
# 图源里不要写 %%{init}%%，否则各图风格会漂移。
set -euo pipefail

usage() { sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'; exit 1; }

[ $# -ge 2 ] || usage
SRC="$1"; OUT="$2"; shift 2
ID=""; PNG=""
while [ $# -gt 0 ]; do
  case "$1" in
    --id)  ID="$2"; shift 2 ;;
    --png) PNG="$2"; shift 2 ;;
    *) echo "未知参数：$1" >&2; usage ;;
  esac
done
[ -f "$SRC" ] || { echo "图源不存在：$SRC" >&2; exit 1; }
[ -n "$ID" ] || { ID="$(basename "$OUT")"; ID="${ID%.*}"; }
grep -q '</script' "$SRC" && { echo "图源里不能出现 </script" >&2; exit 1; }

find_browser() {
  local c
  for c in "${CHROME_BIN:-}" \
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    "/Applications/Chromium.app/Contents/MacOS/Chromium" \
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
    "$(command -v google-chrome 2>/dev/null || true)" \
    "$(command -v chromium 2>/dev/null || true)" \
    "$(command -v chromium-browser 2>/dev/null || true)" \
    "$(command -v msedge 2>/dev/null || true)"; do
    [ -n "$c" ] && [ -x "$c" ] && { printf '%s' "$c"; return 0; }
  done
  return 1
}

find_mermaid() {
  local c
  [ -n "${MERMAID_JS:-}" ] && [ -f "$MERMAID_JS" ] && { printf '%s' "$MERMAID_JS"; return 0; }
  c="$(ls -t "$HOME"/.npm/_npx/*/node_modules/mermaid/dist/mermaid.min.js 2>/dev/null | head -1 || true)"
  [ -n "$c" ] && { printf '%s' "$c"; return 0; }
  c="$(npm root -g 2>/dev/null || true)/mermaid/dist/mermaid.min.js"
  [ -f "$c" ] && { printf '%s' "$c"; return 0; }
  c="$(pwd)/node_modules/mermaid/dist/mermaid.min.js"
  [ -f "$c" ] && { printf '%s' "$c"; return 0; }
  return 1
}

CH="$(find_browser)" || { echo "未找到 Chromium 内核浏览器；可用 CHROME_BIN 指定" >&2; exit 3; }
MM="$(find_mermaid)"  || { echo "未找到 mermaid.min.js；先执行 npx -y -p mermaid node -e 0 让 npx 缓存它，或用 MERMAID_JS 指定" >&2; exit 3; }
command -v node >/dev/null || { echo "未找到 node" >&2; exit 3; }

WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
ln -s "$MM" "$WORK/mermaid.min.js"

# 渲染页：图源放在 text/plain 脚本块里，避免任何转义；用 mermaid.render 指定 id，让内嵌样式只作用于本图
{
  cat <<'HEAD'
<!doctype html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#f4f6f5"><div id="out"></div>
<script type="text/plain" id="src">
HEAD
  cat "$SRC"
  cat <<TAIL
</script>
<script src="mermaid.min.js"></script>
<script>
mermaid.initialize({
  startOnLoad:false, theme:'base', htmlLabels:false,
  sequence:{mirrorActors:false, useMaxWidth:false, wrap:true},
  state:{useMaxWidth:false},
  themeVariables:{
    fontFamily:'-apple-system,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif', fontSize:'13px',
    primaryColor:'#fcfdfd', primaryBorderColor:'#1a2420', primaryTextColor:'#1a2420',
    lineColor:'#54645d', tertiaryColor:'#eef4f1',
    actorBkg:'#e4efea', actorBorder:'#1e5c4f', actorTextColor:'#1a2420', actorLineColor:'#ccd6d1',
    signalColor:'#54645d', signalTextColor:'#1a2420',
    noteBkgColor:'#f4edda', noteBorderColor:'#8a6317', noteTextColor:'#1a2420',
    labelBoxBkgColor:'#fcfdfd', labelBoxBorderColor:'#ccd6d1', labelTextColor:'#54645d', loopTextColor:'#54645d',
    sequenceNumberColor:'#fcfdfd'
  }
});
mermaid.render('$ID', document.getElementById('src').textContent)
  .then(r => { document.getElementById('out').innerHTML = r.svg; })
  .catch(e => { document.getElementById('out').setAttribute('data-render-error', String(e.message || e)); });
</script></body></html>
TAIL
} > "$WORK/page.html"

"$CH" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=10000 \
  --dump-dom "file://$WORK/page.html" > "$WORK/dom.html" 2>/dev/null

node - "$WORK/dom.html" "$OUT" <<'NODE'
const fs = require('fs');
const [dom, out] = process.argv.slice(2);
const html = fs.readFileSync(dom, 'utf8');
const unesc = t => t.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const err = html.match(/data-render-error="([^"]*)"/);
if (err) { console.error('mermaid 渲染失败：' + unesc(err[1])); process.exit(2); }
const m = html.match(/<svg[\s\S]*?<\/svg>/);
if (!m) { console.error('未找到 <svg>：mermaid 没有完成渲染'); process.exit(2); }
fs.writeFileSync(out, m[0] + '\n');
const vb = m[0].match(/viewBox="[\d.\-]+ [\d.\-]+ ([\d.]+) ([\d.]+)"/);
console.log(`已写出 ${out}（${(m[0].length / 1024).toFixed(1)} KB` + (vb ? `，viewBox ${Math.round(vb[1])}×${Math.round(vb[2])}` : '') + '）');
NODE

# 截图用只含 SVG 的页面：顺便验证抠出来的 SVG 脱离 mermaid 脚本也能正常显示
if [ -n "$PNG" ]; then
  W=$(node -e 'const s=require("fs").readFileSync(process.argv[1],"utf8");const m=s.match(/viewBox="[\d.\-]+ [\d.\-]+ ([\d.]+) ([\d.]+)"/);console.log(m?Math.ceil(+m[1])+64:1300)' "$OUT")
  H=$(node -e 'const s=require("fs").readFileSync(process.argv[1],"utf8");const m=s.match(/viewBox="[\d.\-]+ [\d.\-]+ ([\d.]+) ([\d.]+)"/);console.log(m?Math.ceil(+m[2])+64:900)' "$OUT")
  { printf '<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:24px;background:#f4f6f5">'; cat "$OUT"; printf '</body></html>'; } > "$WORK/shot.html"
  "$CH" --headless=new --disable-gpu --hide-scrollbars --window-size="$W,$H" --virtual-time-budget=3000 \
    --screenshot="$PNG" "file://$WORK/shot.html" >/dev/null 2>&1
  echo "截图 ${PNG}（${W}×${H}）"
fi
