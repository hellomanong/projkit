/* 原型讲解标注层（spec-proto-tour）：只读叠加在原型之上，不修改原型的状态与逻辑。
   依赖原型里每个屏幕、抽屉的根元素带 data-screen-label；讲解数据由 data-*.js 提供。 */
(function () {
  'use strict';
  if (window.__agsAnnoLoaded) return;
  window.__agsAnnoLoaded = true;

  var VIEWS = window.AGS_ANNO_VIEWS || [];
  var META = window.AGS_ANNO_META || {};
  var MODS = window.AGS_ANNO_MODULES || {};
  var STS = window.AGS_ANNO_STATUS || {};
  var PH = {
    P0: { c: '#15803D', t: 'P0 首发' },
    P1: { c: '#C2410C', t: 'P1' },
    P2: { c: '#7C3AED', t: 'P2' },
    NA: { c: '#6B7280', t: '未标注阶段' }
  };
  var DRAWER_SET = {};
  VIEWS.forEach(function (v) { if (v.drawer) DRAWER_SET[v.screen] = true; });

  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem('agsAnno.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('agsAnno.' + k, JSON.stringify(v)); } catch (e) { /* 存储不可用时只影响位置记忆 */ } }
  };

  var st = {
    on: LS.get('on', true),
    panel: LS.get('panel', true),
    collapsed: false,
    pos: LS.get('pos', null),
    fabPos: LS.get('fabPos', null),
    view: null,
    pinned: null,
    active: null,
    hover: null,
    index: false,
    anchors: {},
    toast: ''
  };

  // ---------- 工具 ----------
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function rich(s) { return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>'); }
  function norm(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
  function isMine(el) { return el && el.closest && el.closest('#agsA-root'); }
  function visible(el) { return !!(el && el.isConnected && el.getClientRects().length); }
  function h(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (html != null) e.innerHTML = html;
    return e;
  }

  function screenRoots() {
    var out = [];
    document.querySelectorAll('[data-screen-label]').forEach(function (el) { if (!isMine(el) && visible(el)) out.push(el); });
    return out;
  }
  function zOf(el) {
    var z = 0;
    for (var e = el; e && e !== document.body; e = e.parentElement) {
      var v = parseInt(getComputedStyle(e).zIndex, 10);
      if (!isNaN(v)) z = Math.max(z, v);
    }
    return z;
  }
  function rootFor(label) {
    var r = screenRoots().filter(function (el) { return el.getAttribute('data-screen-label') === label; });
    return r[0] || null;
  }
  function whenOk(v, root) {
    if (!v.when) return true;
    var txt = root.textContent || '';
    if (v.when.text && txt.indexOf(v.when.text) < 0) return false;
    if (v.when.not && txt.indexOf(v.when.not) >= 0) return false;
    return true;
  }

  // 当前视图：抽屉优先（取层级最高的一个），否则取页面
  function detectView() {
    var roots = screenRoots();
    var drawers = roots.filter(function (el) { return DRAWER_SET[el.getAttribute('data-screen-label')]; });
    drawers.sort(function (a, b) { return zOf(b) - zOf(a); });
    var cands = drawers.concat(roots.filter(function (el) { return !DRAWER_SET[el.getAttribute('data-screen-label')]; }));
    for (var i = 0; i < cands.length; i++) {
      var lab = cands[i].getAttribute('data-screen-label');
      for (var j = 0; j < VIEWS.length; j++) {
        if (VIEWS[j].screen === lab && whenOk(VIEWS[j], cands[i])) return { v: VIEWS[j], root: cands[i], drawer: !!DRAWER_SET[lab] };
      }
      if (DRAWER_SET[lab] || drawers.length) {
        // 打开了本讲解范围外的抽屉：不再往下看页面，避免圆点叠在遮罩上
        if (i < drawers.length) return { v: null, root: cands[i], drawer: true, other: lab };
      }
    }
    var main = cands.filter(function (el) { return !DRAWER_SET[el.getAttribute('data-screen-label')]; })[0];
    return { v: null, root: main || null, drawer: false, other: main ? main.getAttribute('data-screen-label') : '' };
  }

  function findAnchor(root, a) {
    if (!root || !a) return null;
    var c = [];
    if (a.title) {
      root.querySelectorAll('[title]').forEach(function (e) { if (e.getAttribute('title').indexOf(a.title) >= 0 && visible(e)) c.push(e); });
    } else if (a.text || a.exact) {
      var want = a.exact || a.text;
      var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      var n;
      while ((n = w.nextNode())) {
        var t = norm(n.nodeValue);
        if (!t) continue;
        if ((a.exact && t === want) || (!a.exact && t.indexOf(want) >= 0)) {
          if (visible(n.parentElement)) c.push(n.parentElement);
        }
      }
      if (!c.length) {
        // 文本被拆成多个节点时，退回到「最深的包含该文本的元素」
        var all = root.querySelectorAll('*');
        for (var i = 0; i < all.length; i++) {
          var e = all[i];
          var tc = norm(e.textContent);
          if ((a.exact ? tc === want : tc.indexOf(want) >= 0) && visible(e)) {
            var deeper = false;
            for (var k = 0; k < e.children.length; k++) {
              var ct = norm(e.children[k].textContent);
              if (a.exact ? ct === want : ct.indexOf(want) >= 0) { deeper = true; break; }
            }
            if (!deeper) c.push(e);
          }
        }
      }
    } else if (a.self) {
      c.push(root);
    }
    var el = c[a.nth || 0] || null;
    for (var u = 0; el && u < (a.up || 0); u++) el = el.parentElement;
    return el;
  }

  function clipAncestors(el) {
    var list = [];
    for (var e = el.parentElement; e && e !== document.documentElement; e = e.parentElement) {
      var cs = getComputedStyle(e);
      if (/(auto|scroll|hidden)/.test(cs.overflow + cs.overflowY + cs.overflowX)) list.push(e);
    }
    return list;
  }

  // ---------- DOM 骨架 ----------
  var ROOT, LAYER, HL, PANEL, BODY, FAB, TOAST;
  function build() {
    ROOT = h('div', { id: 'agsA-root' });
    LAYER = h('div', { id: 'agsA-layer' });
    HL = h('div', { id: 'agsA-hl' });
    PANEL = h('div', { id: 'agsA-panel' });
    FAB = h('div', { id: 'agsA-fab' });
    TOAST = h('div', { id: 'agsA-toast' });
    ROOT.appendChild(LAYER); ROOT.appendChild(HL); ROOT.appendChild(PANEL); ROOT.appendChild(FAB); ROOT.appendChild(TOAST);
    document.body.appendChild(ROOT);

    PANEL.innerHTML =
      '<div class="agsA-hd" data-drag="panel">' +
        '<div class="agsA-hdt"><div class="agsA-kicker">' + esc(META.kicker || '原型讲解标注') + '</div><div class="agsA-vt"></div></div>' +
        '<div class="agsA-btns">' +
          '<button data-act="index" title="打开讲解目录：全部页面与抽屉">目录</button>' +
          '<button data-act="reset" title="面板回到默认停靠位置">复位</button>' +
          '<button data-act="collapse" title="折叠 / 展开面板">折叠</button>' +
          '<button data-act="hide" title="隐藏面板，编号圆点保留；点圆点或底部的黑色按钮可再打开">隐藏</button>' +
        '</div>' +
      '</div>' +
      '<div class="agsA-body"></div>';
    BODY = PANEL.querySelector('.agsA-body');

    PANEL.addEventListener('click', onPanelClick);
    PANEL.addEventListener('mouseover', function (e) { var c = e.target.closest('.agsA-card'); st.hover = c ? c.getAttribute('data-k') : null; });
    PANEL.addEventListener('mouseleave', function () { st.hover = null; });
    FAB.addEventListener('click', onFabClick);
    LAYER.addEventListener('click', onMarkerClick);
    makeDraggable(PANEL, PANEL.querySelector('.agsA-hd'), 'pos');
    makeDraggable(FAB, FAB, 'fabPos');
    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        // 只记录用户手动缩放；placePanel 自己改尺寸（含贴底裁剪）后的回调一律忽略
        if (!st.pos || st.collapsed || PANEL.style.display === 'none' || performance.now() - lastPlace < 200) return;
        var r = PANEL.getBoundingClientRect();
        if (Math.abs(r.width - (st.pos.w || 0)) > 2 || Math.abs(r.height - (st.pos.h || 0)) > 2) { st.pos.w = Math.round(r.width); st.pos.h = Math.round(r.height); LS.set('pos', st.pos); }
      }).observe(PANEL);
    }
  }

  function makeDraggable(box, handle, key) {
    var sx, sy, ox, oy, ow, oh, moved, dragging = false;
    handle.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || e.target.closest('button,a,input')) return;
      var r = box.getBoundingClientRect();
      sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top; moved = false; dragging = true;
      // 拖动只改位置：尺寸在按下时定格，拖动过程中不再从外框反推
      if (key === 'pos') {
        ow = Math.round(r.width);
        oh = st.collapsed ? ((st.pos && st.pos.h) || defaultPanelRect(false).h) : Math.round(r.height);
      }
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 4) return;
      moved = true;
      var x = Math.max(0, Math.min(window.innerWidth - 60, ox + dx));
      var y = Math.max(0, Math.min(window.innerHeight - 30, oy + dy));
      if (key === 'pos') {
        st.pos = { x: Math.round(x), y: Math.round(y), w: ow, h: oh };
        placePanel();
      } else {
        st.fabPos = { x: Math.round(x), y: Math.round(y) };
        placeFab();
      }
    });
    function end(e) {
      if (!dragging) return;
      dragging = false;
      try { handle.releasePointerCapture(e.pointerId); } catch (x) { /* 已释放 */ }
      if (moved) {
        LS.set(key, st[key]);
        box.__agsJustDragged = true;
        setTimeout(function () { box.__agsJustDragged = false; }, 0);
      }
    }
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
    handle.addEventListener('lostpointercapture', end);
  }

  function defaultPanelRect(drawer) {
    var W = window.innerWidth, H = window.innerHeight;
    var w = Math.min(430, Math.max(320, Math.round(W * 0.3)));
    var hgt = Math.max(320, H - 84);
    return drawer ? { x: 12, y: 64, w: w, h: hgt } : { x: W - w - 14, y: 64, w: w, h: hgt };
  }
  var lastPlace = 0;
  function placePanel() {
    lastPlace = performance.now();
    var cur = st.view;
    var r = st.pos || defaultPanelRect(cur && cur.drawer);
    PANEL.style.left = r.x + 'px';
    PANEL.style.top = r.y + 'px';
    PANEL.style.width = r.w + 'px';
    PANEL.style.height = st.collapsed ? 'auto' : Math.min(r.h, window.innerHeight - r.y - 8) + 'px';
    PANEL.classList.toggle('agsA-collapsed', st.collapsed);
    PANEL.querySelector('[data-act="collapse"]').textContent = st.collapsed ? '展开' : '折叠';
  }
  function placeFab() {
    if (st.fabPos) { FAB.style.left = st.fabPos.x + 'px'; FAB.style.top = st.fabPos.y + 'px'; FAB.style.bottom = 'auto'; }
    else { FAB.style.left = Math.max(12, Math.round((window.innerWidth - FAB.offsetWidth) / 2)) + 'px'; FAB.style.top = 'auto'; FAB.style.bottom = '18px'; }
  }

  function renderFab() {
    FAB.innerHTML = st.on
      ? '<span class="agsA-dot on"></span><span data-act="off">关闭讲解标注</span>' + (st.panel ? '' : '<span class="agsA-sep"></span><span data-act="panel">显示面板</span>')
      : '<span class="agsA-dot"></span><span data-act="on">打开讲解标注</span>';
    placeFab();
  }

  function toast(msg) {
    TOAST.textContent = msg;
    TOAST.style.display = msg ? 'block' : 'none';
    clearTimeout(toast._t);
    if (msg) toast._t = setTimeout(function () { TOAST.style.display = 'none'; }, 4200);
  }

  // ---------- 面板内容 ----------
  function shownView() { return st.pinned ? { v: st.pinned, root: rootFor(st.pinned.screen), pinned: true } : st.view; }

  function renderPanel() {
    if (!PANEL) return;
    PANEL.style.display = st.on && st.panel ? 'flex' : 'none';
    var sv = shownView();
    var vt = PANEL.querySelector('.agsA-vt');
    if (st.index) { vt.textContent = '讲解目录'; BODY.innerHTML = renderIndex(); placePanel(); return; }
    if (!sv || !sv.v) {
      vt.textContent = sv && sv.other ? sv.other : '当前页面';
      BODY.innerHTML = renderOutOfScope(sv);
      placePanel();
      return;
    }
    var v = sv.v;
    vt.textContent = v.title;
    var html = '';
    if (sv.pinned) html += '<div class="agsA-pin">正在浏览讲解，原型当前不在这一屏，所以没有编号圆点。<button data-act="goto" data-v="' + esc(v.id) + '">带我去</button><button data-act="unpin">回到当前页面</button></div>';
    html += '<div class="agsA-intro">' + rich(v.intro || '') + '</div>';
    if (v.path) html += '<div class="agsA-path"><b>怎么打开：</b>' + rich(v.path) + '</div>';
    var vm = viewMods(v);
    if (vm.length) html += '<div class="agsA-vmods"><b>本页涉及的模块：</b>' + vm.map(chip).join('') + '<span class="agsA-hint">鼠标停在标签上看说明</span></div>';
    html += legend();
    (v.items || []).forEach(function (it, i) {
      var k = v.id + ':' + i;
      var p = PH[it.ph] || PH.NA;
      html += '<div class="agsA-card' + (st.active === k ? ' agsA-on' : '') + '" data-k="' + esc(k) + '">' +
        '<div class="agsA-ch"><span class="agsA-num" style="background:' + p.c + '">' + (i + 1) + '</span><span class="agsA-ttl">' + rich(it.t) + '</span><span class="agsA-tag" style="color:' + p.c + ';border-color:' + p.c + '">' + esc(it.phText || p.t) + '</span></div>' +
        (it.what ? '<div class="agsA-lbl">功能解释</div><div class="agsA-txt">' + rich(it.what) + '</div>' : '') +
        modsBlock(it.mods) +
        stBlock(it.st) +
        (it.talk ? '<div class="agsA-lbl">一句话说清</div><div class="agsA-talk">' + rich(it.talk) + '</div>' : '') +
        (it.warn ? '<div class="agsA-warn"><b>注意：</b>' + rich(it.warn) + '</div>' : '') +
        '<div class="agsA-miss" data-miss="' + esc(k) + '">' + (it.a ? '当前状态下没有可见锚点' + (it.how ? '：' + rich(it.how) : '，可能要先操作才会出现。') : '整页说明，没有单独锚点。') + '</div>' +
        '</div>';
    });
    html += '<div class="agsA-foot">' + rich(META.foot || '') + '</div>';
    BODY.innerHTML = html;
    placePanel();
    refreshMiss();
  }

  function chip(key) {
    var m = MODS[key] || { n: key, g: 'gc', d: '' };
    return '<span class="agsA-chip agsA-g-' + esc(m.g) + '" title="' + esc(m.d) + '">' + esc(m.n) + '</span>';
  }
  function modsBlock(mods) {
    if (!mods || !mods.length) return '';
    return '<div class="agsA-lbl">归属模块</div><div class="agsA-mods">' + mods.map(function (x) {
      var goal = /^（目标/.test(x[1]);
      return '<div class="agsA-mod' + (goal ? ' agsA-goal' : '') + '">' + chip(x[0]) + '<span class="agsA-act">' + rich(x[1]) + '</span></div>';
    }).join('') + '</div>';
  }
  function stBlock(stv) {
    if (!stv) return '';
    var d = STS[stv[0]] || { m: '·', t: stv[0] };
    return '<div class="agsA-lbl">现状</div><div class="agsA-st agsA-st-' + esc(stv[0]) + '"><span class="agsA-stm">' + esc(d.m) + ' ' + esc(d.t) + '</span><span class="agsA-stt">' + rich(stv[1]) + '</span></div>';
  }
  function viewMods(v) {
    var seen = {}, out = [];
    (v.items || []).forEach(function (it) { (it.mods || []).forEach(function (x) { if (!seen[x[0]]) { seen[x[0]] = 1; out.push(x[0]); } }); });
    var order = Object.keys(MODS);
    out.sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); });
    return out;
  }

  function legend() {
    return '<div class="agsA-legend">' +
      ['P0', 'P1', 'P2', 'NA'].map(function (k) { return '<span><i style="background:' + PH[k].c + '"></i>' + PH[k].t + '</span>'; }).join('') +
      '<span><i class="agsA-diff"></i>带「注意」的是原型与设计不一致或待决</span></div>' +
      '<div class="agsA-legend">现状：' + ['done', 'part', 'no', 'na', 'out'].map(function (k) { var d = STS[k] || {}; return '<span class="agsA-st-' + k + '"><b class="agsA-stm">' + esc(d.m || '') + ' ' + esc(d.t || '') + '</b></span>'; }).join('') + '</div>';
  }

  function renderReport() {
    if (!st.report) return '';
    var bad = st.report.filter(function (r) { return !r.ok || r.wrong || r.miss.length; });
    var html = '<div class="agsA-ig">逐页自检结果：' + st.report.length + ' 屏，' + (bad.length ? bad.length + ' 屏有问题' : '全部通过') + '</div>';
    bad.forEach(function (r) {
      html += '<div class="agsA-warn"><b>' + esc(r.v.title) + '</b>' + (r.why ? '：' + esc(r.why) : '') +
        (r.miss.length ? '<br>找不到锚点：' + r.miss.map(esc).join('；') : '') + '</div>';
    });
    html += '<div class="agsA-meta">带「怎么让它出现」说明的卡片需要先操作，自检不把它们算作问题。</div>';
    return html;
  }

  function renderIndex() {
    if (st.checking) return '<div class="agsA-pin">' + esc(st.checking) + '</div>';
    var html = '<div class="agsA-intro">' + rich(META.indexIntro || '') + '</div>' +
      '<div class="agsA-pin" style="color:#5B6152;background:#F6F7F2;border-color:#E3E6DD">原型改版后，点这里自动走一遍全部页面，列出失效的圆点与跳转步骤：<br><button data-act="selfcheck">逐页自检</button></div>' +
      renderReport();
    var groups = [];
    VIEWS.forEach(function (v) { var g = groups.filter(function (x) { return x.n === v.group; })[0]; if (!g) { g = { n: v.group, vs: [] }; groups.push(g); } g.vs.push(v); });
    groups.forEach(function (g) {
      html += '<div class="agsA-ig">' + esc(g.n) + '</div>';
      g.vs.forEach(function (v) {
        html += '<div class="agsA-ii"><div><div class="agsA-iit">' + esc(v.title) + '</div><div class="agsA-iis">' + (v.items || []).length + ' 个功能点' + (v.drawer ? ' · 抽屉' : '') + '</div></div>' +
          '<button data-act="goto" data-v="' + esc(v.id) + '">带我去</button><button data-act="pin" data-v="' + esc(v.id) + '">只看讲解</button></div>';
      });
    });
    html += '<div class="agsA-ig">模块图例</div><div class="agsA-legendmods">' + Object.keys(MODS).map(function (k) {
      return '<div class="agsA-lm">' + chip(k) + '<span>' + esc(MODS[k].d) + '</span></div>';
    }).join('') + '</div>';
    html += '<div class="agsA-meta">' + rich(META.sources || '') + '</div>';
    return html;
  }

  function renderOutOfScope(sv) {
    return '<div class="agsA-intro">' + (sv && sv.other ? '「' + esc(sv.other) + '」不在这份讲解的范围内。' : '原型还在加载，或者当前页面不在讲解范围内。') +
      '这份标注只覆盖' + esc(META.scope || '部分页面') + '，点上方「目录」可以选择要讲的页面并自动跳转过去。</div>' + legend();
  }

  function refreshMiss() {
    var sv = shownView();
    if (!sv || !sv.v) return;
    BODY.querySelectorAll('[data-miss]').forEach(function (m) {
      var k = m.getAttribute('data-miss');
      var i = +k.split(':').pop();
      var it = sv.v.items[i];
      var has = !it.a || !!(st.anchors[k] && st.anchors[k].el && !sv.pinned);
      m.style.display = has ? 'none' : 'block';
      if (!it.a) m.style.display = 'none';
    });
  }

  // ---------- 交互 ----------
  function onPanelClick(e) {
    var b = e.target.closest('[data-act]');
    if (b) {
      var act = b.getAttribute('data-act');
      if (act === 'hide') { st.panel = false; LS.set('panel', false); renderPanel(); renderFab(); return; }
      if (act === 'collapse') { st.collapsed = !st.collapsed; placePanel(); return; }
      if (act === 'reset') { st.pos = null; LS.set('pos', null); st.collapsed = false; placePanel(); return; }
      if (act === 'index') { st.index = !st.index; renderPanel(); return; }
      if (act === 'unpin') { st.pinned = null; st.index = false; refresh(true); return; }
      if (act === 'pin') { st.pinned = byId(b.getAttribute('data-v')); st.index = false; st.active = null; refresh(true); return; }
      if (act === 'selfcheck') { selfCheck(); return; }
      if (act === 'goto') { st.pinned = null; st.index = false; gotoView(byId(b.getAttribute('data-v'))); return; }
    }
    var c = e.target.closest('.agsA-card');
    if (c) {
      var k = c.getAttribute('data-k');
      st.active = st.active === k ? null : k;
      BODY.querySelectorAll('.agsA-card').forEach(function (x) { x.classList.toggle('agsA-on', x.getAttribute('data-k') === st.active); });
      var an = st.anchors[k];
      if (st.active && an && an.el) an.el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }
  function onMarkerClick(e) {
    var m = e.target.closest('.agsA-mk');
    if (!m) return;
    var k = m.getAttribute('data-k');
    st.active = k; st.index = false;
    if (!st.panel) { st.panel = true; LS.set('panel', true); renderFab(); }
    st.collapsed = false;
    renderPanel();
    var c = BODY.querySelector('.agsA-card[data-k="' + k + '"]');
    if (c) c.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  function onFabClick(e) {
    if (FAB.__agsJustDragged) return;
    var b = e.target.closest('[data-act]');
    var act = b ? b.getAttribute('data-act') : (st.on ? 'off' : 'on');
    if (act === 'off') { st.on = false; }
    if (act === 'on') { st.on = true; st.panel = true; }
    if (act === 'panel') { st.panel = true; st.collapsed = false; }
    LS.set('on', st.on); LS.set('panel', st.panel);
    renderFab(); refresh(true);
  }
  function byId(id) { return VIEWS.filter(function (v) { return v.id === id; })[0] || null; }

  // 「带我去」：按步骤点击原型里的导航、标签和按钮
  function findClickable(step) {
    var scope = step[2] ? rootFor(step[2]) : document.body;
    if (!scope) return null;
    var want = step[1];
    if (step[0] === 'title') {
      var tt = [];
      scope.querySelectorAll('[title]').forEach(function (e) { if (!isMine(e) && e.getAttribute('title').indexOf(want) >= 0 && visible(e)) tt.push(e); });
      return tt[step[3] || 0] || null;
    }
    var w = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    var n, hits = [];
    while ((n = w.nextNode())) {
      if (isMine(n.parentElement)) continue;
      var t = norm(n.nodeValue);
      if ((step[0] === 'click' ? t.indexOf(want) >= 0 : t === want) && visible(n.parentElement)) hits.push(n.parentElement);
    }
    return hits[step[3] || 0] || null;
  }
  function gotoView(v, done, quiet) {
    if (!v || !v.go) { if (!quiet) toast('这一屏没有自动跳转，请按面板里的「怎么打开」手动进入。'); if (done) done(false, '没有跳转步骤'); return; }
    var steps = v.go.slice();
    var i = 0;
    function next() {
      if (i >= steps.length) { refresh(true); if (done) setTimeout(function () { refresh(true); done(true); }, 500); return; }
      var s = steps[i];
      var t0 = Date.now();
      (function tryIt() {
        var el = findClickable(s);
        if (el) { el.click(); i++; setTimeout(next, 260); return; }
        if (Date.now() - t0 > 1600) {
          if (!quiet) toast('自动跳转在「' + s[1] + '」这一步没找到入口，请按「怎么打开」手动进入：' + (v.path || ''));
          refresh(true);
          if (done) done(false, '跳转步骤「' + s[1] + '」找不到入口');
          return;
        }
        setTimeout(tryIt, 120);
      })();
    }
    // 先关掉已打开的抽屉（点遮罩），再按步骤点击
    closeDrawers(next);
  }

  // 逐页自检：原型改版后用来找出失效的锚点和跳转步骤
  function selfCheck() {
    var report = [];
    var list = VIEWS.slice();
    var k = 0;
    st.pinned = null; st.index = true;
    BODY.innerHTML = '<div class="agsA-intro">正在逐页自检，会自动点击原型导航，请不要操作页面……</div>';
    function one() {
      if (k >= list.length) { st.report = report; st.checking = null; st.index = true; renderPanel(); return; }
      var v = list[k++];
      st.checking = '正在自检 ' + k + ' / ' + list.length + '：' + v.title + '。会自动点击原型导航，请不要操作页面。';
      renderPanel();
      gotoView(v, function (ok, why) {
        var cur = st.view;
        var r = { v: v, ok: ok, why: why || '', miss: [], wrong: false };
        if (ok && (!cur || cur.v !== v)) { r.wrong = true; r.why = '跳转后识别到的页面是「' + ((cur && cur.v && cur.v.title) || (cur && cur.other) || '未知') + '」'; }
        else if (ok) {
          v.items.forEach(function (it, i) { if (it.a && !it.how && !st.anchors[v.id + ':' + i]) r.miss.push((i + 1) + '. ' + it.t); });
        }
        report.push(r);
        setTimeout(one, 150);
      }, true);
    }
    one();
  }
  function closeDrawers(done) {
    var tries = 0;
    (function loop() {
      var open = screenRoots().filter(function (el) { return DRAWER_SET[el.getAttribute('data-screen-label')]; });
      if (!open.length || tries++ > 4) { done(); return; }
      var top = open.sort(function (a, b) { return zOf(b) - zOf(a); })[0];
      var mask = top.previousElementSibling;
      if (mask && getComputedStyle(mask).position === 'absolute') mask.click();
      else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      setTimeout(loop, 220);
    })();
  }

  // ---------- 刷新与定位 ----------
  var lastKey = '';
  function refresh(force) {
    if (!ROOT) return;
    if (!ROOT.isConnected) document.body.appendChild(ROOT);
    var cur = detectView();
    st.view = cur;
    var sv = shownView();
    var key = (st.index ? 'I|' : '') + (sv && sv.v ? sv.v.id : 'none:' + (sv && sv.other)) + (st.pinned ? '|p' : '') + '|' + st.on + st.panel;
    // 解析锚点
    st.anchors = {};
    if (sv && sv.v && !sv.pinned && sv.root) {
      sv.v.items.forEach(function (it, i) {
        var el = findAnchor(sv.root, it.a);
        if (el) st.anchors[sv.v.id + ':' + i] = { el: el, clips: clipAncestors(el), n: i + 1, ph: it.ph };
      });
    }
    if (force || key !== lastKey) { lastKey = key; renderPanel(); } else refreshMiss();
    buildMarkers();
  }

  var markerEls = {};
  function buildMarkers() {
    LAYER.innerHTML = '';
    markerEls = {};
    if (!st.on) return;
    Object.keys(st.anchors).forEach(function (k) {
      var a = st.anchors[k];
      var p = PH[a.ph] || PH.NA;
      var m = h('div', { 'class': 'agsA-mk', 'data-k': k, title: '点击查看第 ' + a.n + ' 条讲解' }, String(a.n));
      m.style.background = p.c;
      LAYER.appendChild(m);
      markerEls[k] = m;
    });
  }

  function clipRect(clips) {
    var r = { l: 0, t: 0, r: window.innerWidth, b: window.innerHeight };
    clips.forEach(function (c) {
      var cr = c.getBoundingClientRect();
      r.l = Math.max(r.l, cr.left); r.t = Math.max(r.t, cr.top); r.r = Math.min(r.r, cr.right); r.b = Math.min(r.b, cr.bottom);
    });
    return r;
  }

  var needResolve = false;
  function frame() {
    requestAnimationFrame(frame);
    if (!st.on || !LAYER) { HL.style.display = 'none'; return; }
    var placed = [];
    Object.keys(markerEls).forEach(function (k) {
      var a = st.anchors[k], m = markerEls[k];
      if (!a || !a.el.isConnected) { m.style.display = 'none'; needResolve = true; return; }
      var r = a.el.getBoundingClientRect();
      var c = clipRect(a.clips);
      var x = Math.max(r.left, c.l), y = Math.max(r.top, c.t);
      if (r.width === 0 || x >= Math.min(r.right, c.r) || y >= Math.min(r.bottom, c.b)) { m.style.display = 'none'; return; }
      var mx = x - 12, my = y - 11;
      for (var guard = 0; guard < 6; guard++) {
        var hit = placed.some(function (p) { return Math.abs(p[0] - mx) < 20 && Math.abs(p[1] - my) < 20; });
        if (!hit) break;
        mx += 22;
      }
      placed.push([mx, my]);
      m.style.display = 'flex';
      m.style.transform = 'translate(' + Math.round(mx) + 'px,' + Math.round(my) + 'px)';
      m.classList.toggle('agsA-on', st.active === k || st.hover === k);
    });
    var hk = st.hover || st.active;
    var ha = hk && st.anchors[hk];
    if (ha && ha.el.isConnected) {
      var hr = ha.el.getBoundingClientRect();
      HL.style.display = 'block';
      HL.style.transform = 'translate(' + Math.round(hr.left - 4) + 'px,' + Math.round(hr.top - 4) + 'px)';
      HL.style.width = Math.round(hr.width + 8) + 'px';
      HL.style.height = Math.round(hr.height + 8) + 'px';
    } else HL.style.display = 'none';
  }

  var mo, deb;
  function schedule() { clearTimeout(deb); deb = setTimeout(function () { refresh(false); }, 160); }

  function boot() {
    if (!document.querySelector('[data-screen-label]')) { setTimeout(boot, 200); return; }
    build();
    renderFab();
    refresh(true);
    requestAnimationFrame(frame);
    mo = new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) { if (!isMine(list[i].target)) { schedule(); return; } }
    });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
    setInterval(function () { if (needResolve) { needResolve = false; refresh(false); } }, 400);
    window.addEventListener('resize', function () { placePanel(); placeFab(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
