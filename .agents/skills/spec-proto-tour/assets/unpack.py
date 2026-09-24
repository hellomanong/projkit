"""解开原型，方便阅读它的页面结构和数据。

用法：python3 unpack.py <原型.html> <输出目录>

- 打包格式（含 __bundler/template）：写出 template.html；若模板里有 text/x-dc 应用脚本，再拆成
  markup.html（页面标记）与 app.js（数据与交互逻辑）；manifest 里的资源按 uuid 落成文件。
- 普通 HTML：原样复制成 template.html。
- 最后列出全部 data-screen-label（屏幕与抽屉的根），这是讲解标注定位屏幕的依据。
"""
import base64
import gzip
import json
import os
import re
import sys

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
html = open(src, encoding='utf-8').read()

def block(t):
    m = re.search(r'<script type="__bundler/%s">(.*?)</script>' % re.escape(t), html, re.S)
    return m.group(1) if m else None

tpl_raw = block('template')
if tpl_raw is None:
    template = html
    print('普通 HTML，未发现打包模板')
else:
    template = json.loads(tpl_raw)
    manifest = json.loads(block('manifest') or '{}')
    for uuid, e in manifest.items():
        b = base64.b64decode(e['data'])
        if e.get('compressed'):
            b = gzip.decompress(b)
        ext = {'text/javascript': 'js', 'application/javascript': 'js', 'text/css': 'css', 'text/html': 'html'}.get(e['mime'], e['mime'].replace('/', '_'))
        open(os.path.join(out, uuid + '.' + ext), 'wb').write(b)
    print('资源', len(manifest), '个')
open(os.path.join(out, 'template.html'), 'w', encoding='utf-8').write(template)

s = template.find('<script type="text/x-dc"')
if s >= 0:
    e = template.find('>', s) + 1
    end = template.find('</script>', e)
    open(os.path.join(out, 'app.js'), 'w', encoding='utf-8').write(template[e:end])
    open(os.path.join(out, 'markup.html'), 'w', encoding='utf-8').write(template[:s])
    print('已拆出 markup.html 与 app.js')

labels = re.findall(r'data-screen-label="([^"]*)"', template)
print('\n屏幕与抽屉（data-screen-label）共', len(labels), '个：')
for lab in labels:
    print('  ' + lab.replace('&amp;', '&'))
if not labels:
    print('  没有找到。讲解标注靠这个属性识别屏幕；原型没有时，需要先扩展 engine.js 的屏幕识别。')
