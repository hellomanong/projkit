"""把讲解标注层注入原型，产出一个自包含的讲解版 HTML。

用法：python3 build.py <原型.html> <讲解数据目录> <输出.html> [--title 页面标题]

- 讲解数据目录里放 data-*.js（按文件名排序拼接）；引擎 engine.js 和样式 anno.css 取本脚本所在目录。
- 原型是打包格式（含 <script type="__bundler/template">）时，注入到解包后的页面模板里，其余资源原样保留；
  否则按普通 HTML 处理，直接在 </body> 前注入。
"""
import argparse
import glob
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument('proto')
ap.add_argument('data_dir')
ap.add_argument('out')
ap.add_argument('--title', default='原型讲解')
args = ap.parse_args()

css = open(os.path.join(HERE, 'anno.css'), encoding='utf-8').read()
engine = open(os.path.join(HERE, 'engine.js'), encoding='utf-8').read()
files = sorted(glob.glob(os.path.join(args.data_dir, 'data-*.js')))
assert files, '讲解数据目录里没有 data-*.js：' + args.data_dir
data = '\n'.join(open(p, encoding='utf-8').read() for p in files)
for name, body in (('engine.js', engine), ('data-*.js', data)):
    assert '</script' not in body.lower(), name + ' 里不能出现 </script'

inject = ('\n<style id="agsA-style">\n' + css + '\n</style>\n'
          '<script id="agsA-data">\n' + data + '\n</script>\n'
          '<script id="agsA-engine">\n' + engine + '\n</script>\n')

def put_title(page):
    if re.search(r'<title>.*?</title>', page, re.S):
        return re.sub(r'<title>.*?</title>', '<title>' + args.title + '</title>', page, count=1, flags=re.S)
    return page.replace('<head>', '<head>\n<title>' + args.title + '</title>', 1)

html = open(args.proto, encoding='utf-8').read()
pat = re.compile(r'(<script type="__bundler/template">)(.*?)(</script>)', re.S)
m = pat.search(html)
if m:
    template = json.loads(m.group(2))
    assert template.count('</body>') == 1, '页面模板里的 </body> 不是恰好一个'
    template = put_title(template.replace('</body>', inject + '</body>'))
    encoded = json.dumps(template, ensure_ascii=False).replace('</', '<\\u002F')
    out = put_title(html[:m.start(2)] + encoded + html[m.end(2):])
    assert json.loads(pat.search(out).group(2)) == template, '回读模板与注入结果不一致'
else:
    assert html.lower().count('</body>') == 1, '原型里的 </body> 不是恰好一个'
    i = html.lower().rfind('</body>')
    out = put_title(html[:i] + inject + html[i:])

open(args.out, 'w', encoding='utf-8').write(out)
print('已生成', args.out, '大小', len(out.encode('utf-8')), '字节')
