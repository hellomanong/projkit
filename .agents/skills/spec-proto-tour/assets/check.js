// 静态检查：原型改版后，找出讲解里已经对不上的屏幕标签、锚点文本和跳转步骤；
// 同时检查每个功能点的模块键在词表里、现状标记合法。
// 用法：node check.js <原型.html> <讲解数据目录>
// 它只查「文本还在不在原型源码里」，不打开浏览器；更准确的检查用讲解版页面上的「目录 › 逐页自检」。
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const [src, dataDir] = process.argv.slice(2);
if (!src || !dataDir) { console.error('用法：node check.js <原型.html> <讲解数据目录>'); process.exit(2); }
const html = fs.readFileSync(src, 'utf8');
const m = html.match(/<script type="__bundler\/template">([\s\S]*?)<\/script>/);
const raw = m ? JSON.parse(m[1]) : html;
const unescape = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const tpl = unescape(raw).replace(/\\u2019/g, '’').replace(/\\u203a/g, '›');

const ctx = { window: {} };
vm.createContext(ctx);
const files = fs.readdirSync(dataDir).filter((n) => /^data-.*\.js$/.test(n)).sort();
if (!files.length) { console.error('讲解数据目录里没有 data-*.js：' + dataDir); process.exit(2); }
for (const f of files) vm.runInContext(fs.readFileSync(path.join(dataDir, f), 'utf8'), ctx, { filename: f });
const views = ctx.window.AGS_ANNO_VIEWS || [];
const mods = ctx.window.AGS_ANNO_MODULES || {};
const sts = ctx.window.AGS_ANNO_STATUS || {};

const has = (s) => tpl.includes(s);
let problems = 0, total = 0;
for (const v of views) {
  const out = [];
  if (!has('data-screen-label="' + v.screen + '"') && !has("data-screen-label='" + v.screen + "'")) out.push('屏幕标签不存在：' + v.screen);
  if (v.when && v.when.text && !has(v.when.text)) out.push('页面识别文本不存在：' + v.when.text);
  (v.go || []).forEach((s) => { if (s[0] !== 'nav' && !has(s[1])) out.push('跳转步骤文本不存在：' + s[1]); });
  v.items.forEach((it, i) => {
    total++;
    const tag = '功能点 ' + (i + 1) + '「' + it.t + '」';
    (it.mods || []).forEach((x) => { if (!mods[x[0]]) out.push(tag + '用了词表外的模块：' + x[0]); });
    if (it.st && !sts[it.st[0]]) out.push(tag + '的现状标记不在 done/part/no/na/out 之内');
    if (!it.a) return;
    const want = it.a.title || it.a.exact || it.a.text;
    if (want && !has(want)) out.push(tag + '的锚点找不到：' + want);
  });
  if (out.length) { problems += out.length; console.log('\n[' + v.title + ']'); out.forEach((l) => console.log('  - ' + l)); }
}
console.log('\n共 ' + views.length + ' 屏、' + total + ' 个功能点；' + (problems ? problems + ' 处需要处理' : '全部对得上'));
process.exit(problems ? 1 : 0);
