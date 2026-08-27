# 分层架构图生成器：坐标全部由网格推导，不手填。
# 绘制顺序固定四步：层底色 → 连线 → 层标题与盒子 → 序号与标签。
COLW, ROWH, BW, BH, PADX, PADY = 248, 148, 182, 54, 26, 20   # 列距行距留宽：间隙越窄，同间隙里的几条线越挤成一坨
BG   = "#f5f7f6"
LANE = "#f2f6f4"                        # 层底色：实色不透明，层标题底片同色，两者不可能对不上
FILL   = {"": "#fcfdfd", "new": "#e4efea", "ext": "#e8eef6", "warn": "#f4edda"}
STROKE = {"": "#1a2420", "new": "#1e5c4f", "ext": "#415f86", "warn": "#8a6317"}
MAIN, THIN = "#3c4a44", "#a3aeaa"       # 有序号的是主链，画深画粗；没序号的是结构关系，压淡让路
NO_BG, FS_LABEL, NO_R = "#1e5c4f", 9.5, 8.5


def _wide(s, fs=FS_LABEL):              # 像素宽估算：中文按字号算，ASCII 折半
    return sum(fs if ord(c) > 0x2E80 else fs * 0.55 for c in s)


def render(lanes, edges, fig_id="fig-arch"):
    """lanes = [(层名, [(盒名, 副标题, 语义档), ...]), ...]
       edges = [(起点, 终点, 标签, 是否虚线[, 序号]), ...]
       返回 (svg, 宽, 高, skipped)；skipped = 因间距不足没画出来的标签，必须逐条回填盒子副标题。"""
    pos, lane_of, col_of = {}, {}, {}
    for li, (_, boxes) in enumerate(lanes):
        for bi, (name, _, _) in enumerate(boxes):
            if name in pos:             # 同名盒子会互相覆盖坐标，边会静默连错，必须拦住
                raise ValueError(f"盒子名重复：{name!r}——整张图里盒名唯一，重名请改成能区分的具体名字")
            pos[name] = (PADX + bi * COLW + BW / 2, PADY + 30 + li * ROWH + BH / 2)
            lane_of[name], col_of[name] = li, bi
    ncol = max(len(b) for _, b in lanes)
    W = PADX * 2 + ncol * COLW - (COLW - BW)
    H = PADY * 2 + len(lanes) * ROWH
    gut = lambda bi: PADX + bi * COLW + BW + (COLW - BW) / 2   # 第 bi 列右侧的列间隙中心

    # 端口分配：一个盒子上有几条同向的线，就在它那条边上均匀排开——全从中点挤出去，
    # 走一段再分叉，看着就像从一条线上接出来的，读者分不清哪条是哪条边。
    slots = {}
    for i, e in enumerate(edges):
        ea, eb = e[0], e[1]
        if ea not in lane_of or eb not in lane_of or lane_of[ea] == lane_of[eb]:
            continue
        dn = lane_of[eb] > lane_of[ea]
        slots.setdefault((ea, "bot" if dn else "top"), []).append((pos[eb][0], i, "out"))
        slots.setdefault((eb, "top" if dn else "bot"), []).append((pos[ea][0], i, "in"))
    port = {}
    for (_, _), items in slots.items():
        items.sort()                                    # 按对端横坐标排，出入口不会在盒边上交叉
        span = BW - 44
        for j, (_, i, kind) in enumerate(items):
            port[(i, kind)] = (j + 1) / (len(items) + 1) * span - span / 2

    lane_bg, nodes, lines, marks = [], [], [], []
    skipped, gut_use, band_use, placed = [], {}, {}, []

    for li, _ in enumerate(lanes):                              # ① 层底色
        ly = PADY + li * ROWH
        lane_bg.append(f'<rect x="{PADX-12}" y="{ly}" width="{W-2*PADX+24}" height="{BH+42}" rx="8" fill="{LANE}"/>')

    def edge(idx, a, b, label="", dash=False, no=None):
        for n in (a, b):
            if n not in pos:
                raise ValueError(f"边的端点 {n!r} 不是任何一个盒子的名字——检查 EDGES 里的拼写")
        (x1, y1), (x2, y2) = pos[a], pos[b]
        x1 += port.get((idx, "out"), 0); x2 += port.get((idx, "in"), 0)
        la, lb = lane_of[a], lane_of[b]
        if la == lb:                                            # 同层：直接横走
            if abs(col_of[a] - col_of[b]) != 1:                 # 非相邻会横穿中间盒子，被盒子盖掉中段
                raise ValueError(f"同层的 {a!r} → {b!r} 隔着别的盒子，横线会被中间的盒子吃掉——把两者排到相邻列，或改成跨层关系")
            sx, ex = (x1 + BW / 2, x2 - BW / 2) if x2 > x1 else (x1 - BW / 2, x2 + BW / 2)
            d = f"M{sx} {y1} H{ex}"
            mk = ((sx + ex) / 2, y1, "h", abs(ex - sx) - 6)      # 号压在横段中点
        else:
            down = y2 > y1
            y1e = y1 + BH / 2 if down else y1 - BH / 2
            y2e = y2 - BH / 2 if down else y2 + BH / 2
            if abs(la - lb) == 1:                               # 相邻层：垂直 → 水平 → 垂直
                my = (y1e + y2e) / 2
                if abs(x1 - x2) > 4:
                    j = band_use.get((la, lb), 0); band_use[(la, lb)] = j + 1
                    my += (0, -9, 9, -18, 18)[j % 5]            # 同一层间带里的横腿错开高度，否则两条边连成一条长线
                    d = f"M{x1} {y1e} V{my} H{x2} V{y2e}"
                    mk = ((x1 + x2) / 2, my, "h", max(abs(x1 - x2) - 10, COLW - 30))   # 横腿短不代表放不下：层间带左右都是空的
                else:
                    d = f"M{x1} {y1e} V{y2e}"
                    mk = (x1, (y1e + y2e) / 2, "v", 1e9)
            else:                                               # 跨多层：贴列间隙走，不横切中间层
                ca = col_of[a]                                  # 下行走源列右侧间隙、上行走左侧，反向线才不重叠
                gx = (gut(ca) if ca < ncol - 1 else gut(ca - 1)) if down else (gut(ca - 1) if ca > 0 else gut(ca))
                k = gut_use.get(gx, 0); gut_use[gx] = k + 1     # 同一间隙的第 k 条线错开画，别叠成一条
                step = (COLW - BW) / 3                          # 错开量跟着间隙宽走，拉宽列距时自动散开
                gx += (0, step, -step)[k % 3] + (k // 3) * step / 2
                off = (18 + k * 8) * (1 if down else -1)        # 出入位的横腿也跟着错开，否则几条线叠在同一高度
                d = f"M{x1} {y1e} V{y1e+off} H{gx} V{y2e-off} H{x2} V{y2e}"
                mk = (gx, y1e + off + (26 if down else -26), "v", 1e9)
        lines.append(f'<path d="{d}" fill="none" stroke="{MAIN if no else THIN}" stroke-width="{1.5 if no else 1.1}"'
                     f'{" stroke-dasharray=\'5 4\'" if dash else ""} marker-end="url(#ar{"m" if no else "t"})"/>')

        cx, cy, axis, room = mk                                 # ④ 号压在线上，标签紧跟其后，两者一起沿线让位
        w = (2 * NO_R if no else 0) + (3 if no and label else 0) + (_wide(label) if label else 0)
        if label and w > room:
            skipped.append((a, b, label)); label = ""
            w = 2 * NO_R if no else 0
        if not (no or label):
            return
        half = w / 2 if axis == "h" else 0                      # 竖线上从线心向右铺开，横线上以线心居中
        for _ in range(5):                                      # 撞了就沿着自己这条线挪，不离线
            if not any(abs(cx - px) < (w + pw) / 2 + 6 and abs(cy - py) < 15 for px, py, pw in placed):
                break
            cx, cy = (cx + w + 14, cy) if axis == "h" else (cx, cy + 21)
        placed.append((cx, cy, w if axis == "h" else w * 2))
        x0 = cx - half
        if no:
            marks.append(f'<circle cx="{x0+NO_R}" cy="{cy}" r="{NO_R}" fill="{NO_BG}" stroke="{BG}" stroke-width="1.5"/>')
            marks.append(f'<text x="{x0+NO_R}" y="{cy+3.4}" font-size="9" font-weight="600" fill="#fcfdfd" text-anchor="middle">{no}</text>')
            x0 += 2 * NO_R + 3
        if label:
            marks.append(f'<text x="{x0}" y="{cy+3.4}" font-size="{FS_LABEL}" fill="#54645d" text-anchor="start" '
                         f'paint-order="stroke" stroke="{BG}" stroke-width="3.5" stroke-linejoin="round">{label}</text>')

    for i, e in enumerate(edges):
        edge(i, *e)

    for li, (lname, boxes) in enumerate(lanes):                 # ③ 层标题与盒子
        ly = PADY + li * ROWH
        tw = _wide(lname, 10.5) + len(lname) * 0.4              # 层标题垫同色底片：入位的竖线必然穿过标题所在高度
        nodes.append(f'<rect x="{PADX-4}" y="{ly+5}" width="{tw+8}" height="16" fill="{LANE}"/>')
        nodes.append(f'<text x="{PADX}" y="{ly+17}" font-size="10.5" fill="#54645d" letter-spacing=".4">{lname}</text>')
        for bi, (name, sub, kind) in enumerate(boxes):
            x, y = PADX + bi * COLW, ly + 30
            nodes.append(f'<rect x="{x}" y="{y}" width="{BW}" height="{BH}" rx="6" fill="{FILL[kind]}" stroke="{STROKE[kind]}" stroke-width="1.2"/>')
            nodes.append(f'<text x="{x+11}" y="{y+22}" font-size="11.5" font-weight="600" fill="#1a2420">{name}</text>')
            nodes.append(f'<text x="{x+11}" y="{y+39}" font-size="9.5" fill="#54645d">{sub}</text>')

    o = [f'<svg id="{fig_id}" width="{W}" height="{H}" viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system,PingFang SC,sans-serif">',
         '<defs>' + "".join(
             f'<marker id="ar{s}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="{m}" markerHeight="{m}" orient="auto-start-reverse">'
             f'<path d="M0 0L10 5L0 10z" fill="{c}"/></marker>' for s, c, m in (("m", MAIN, 7), ("t", THIN, 6))) + '</defs>',
         f'<rect width="{W}" height="{H}" fill="{BG}"/>']
    o += lane_bg + lines + nodes + marks
    o.append("</svg>")
    return "\n".join(o), W, H, skipped
