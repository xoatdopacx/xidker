/* DOM → canvas renderer for the pixel transitions.
 *
 * The transitions only ever show the page as a mosaic (4px blocks at the finest), so this draws a
 * close-enough picture of what is on screen in a few milliseconds instead of being a full browser:
 * boxes (background colour, url() patterns, solid borders, hard box-shadows), text (per line, with the
 * real fonts), and SVG (pixel sprites from their rects/paths, other SVG from computed fill/stroke).
 * Paint order follows CSS stacking contexts closely enough for this page; overflow clipping and
 * opacity are respected. Gradients, blurred shadows, rounded corners and pseudo-elements are skipped. */

export type Region = { x: number; y: number; w: number; h: number };
type Clip = { x0: number; y0: number; x1: number; y1: number } | null;
type State = { clip: Clip; font: string; fill: string; dir: string; align: string; ls: string; base: () => void; metrics: Map<string, [number, number]> };
type Op = { clip: Clip; a: number; fn: (c: CanvasRenderingContext2D, st: State) => void };
type Layer = { z: number; o: number; head: number; ops: Op[]; kids: Layer[] };

declare global { interface Window { __snapMs?: number } }

const SKIP = new Set(["SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT", "LINK", "META", "HEAD", "TITLE", "BR"]);
/* Big blocks far outside the region are skipped whole. */
const CULL = new Set(["SECTION", "FOOTER", "HEADER", "ASIDE"]);
const CULL_MARGIN = 200;

/* ---------- caches ---------- */

const images = new Map<string, HTMLImageElement | false>();
function image(url: string): HTMLImageElement | null {
  const hit = images.get(url);
  if (hit) return hit;
  if (hit === undefined) {
    images.set(url, false);
    const im = new Image();
    im.onload = () => images.set(url, im);
    im.src = url;
  }
  return null;
}
const urlOf = (bg: string) => /^url\("(.*)"\)$/s.exec(bg)?.[1] ?? null;

const paths = new Map<string, Path2D>();
function path2d(d: string) {
  let p = paths.get(d);
  if (!p) {
    if (paths.size > 800) paths.clear();
    p = new Path2D(d);
    paths.set(d, p);
  }
  return p;
}

type Shadow = { color: string; x: number; y: number; blur: number; spread: number; inset: boolean };
const shadowCache = new Map<string, Shadow[]>();
function parseShadows(v: string): Shadow[] {
  const hit = shadowCache.get(v);
  if (hit) return hit;
  const parts: string[] = [];
  let depth = 0, start = 0;
  for (let i = 0; i < v.length; i++) {
    const ch = v[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && !depth) { parts.push(v.slice(start, i)); start = i + 1; }
  }
  parts.push(v.slice(start));
  const out: Shadow[] = [];
  for (const p of parts) {
    const m = /^\s*([a-z-]+\([^)]*\)|#[0-9a-f]+|[a-z]+)\s+(-?[\d.]+)px\s+(-?[\d.]+)px(?:\s+(-?[\d.]+)px)?(?:\s+(-?[\d.]+)px)?(\s+inset)?\s*$/i.exec(p);
    if (m && !clear(m[1])) out.push({ color: m[1], x: +m[2], y: +m[3], blur: +(m[4] ?? 0), spread: +(m[5] ?? 0), inset: !!m[6] });
  }
  if (shadowCache.size > 200) shadowCache.clear();
  shadowCache.set(v, out);
  return out;
}

const clear = (c: string) => c === "transparent" || c.endsWith(", 0)") || c.endsWith("/ 0)") || c === "none";
const opaque = (c: string) => c.startsWith("rgb(") || c.startsWith("#");

function intersect(a: Clip, x0: number, y0: number, x1: number, y1: number): Clip {
  if (!a) return { x0, y0, x1, y1 };
  return { x0: Math.max(a.x0, x0), y0: Math.max(a.y0, y0), x1: Math.min(a.x1, x1), y1: Math.min(a.y1, y1) };
}

/* ---------- text ---------- */

type Line = { text: string; x0: number; x1: number; top: number; bottom: number };
const range = typeof document !== "undefined" ? document.createRange() : (null as unknown as Range);

function midY(node: Text, o: number) {
  range.setStart(node, o);
  range.setEnd(node, o + 1);
  const rr = range.getClientRects();
  for (let i = 0; i < rr.length; i++) { const r = rr[i]; if (r.width || r.height) return (r.top + r.bottom) / 2; }
  return -Infinity;
}

/** Splits a text node into its rendered lines (one rect per line from the browser, then a binary
 * search for where each line starts). */
function textLines(node: Text, rg: Region, pre: boolean): Line[] {
  range.selectNodeContents(node);
  const rl = range.getClientRects();
  if (!rl.length) return [];
  const boxes: { top: number; bottom: number; x0: number; x1: number }[] = [];
  let any = false;
  for (let i = 0; i < rl.length; i++) {
    const r = rl[i];
    if (!r.width && !r.height) continue;
    const last = boxes[boxes.length - 1];
    const cy = (r.top + r.bottom) / 2;
    if (last && cy >= last.top && cy <= last.bottom) {
      last.x0 = Math.min(last.x0, r.left); last.x1 = Math.max(last.x1, r.right);
      last.top = Math.min(last.top, r.top); last.bottom = Math.max(last.bottom, r.bottom);
    } else boxes.push({ top: r.top, bottom: r.bottom, x0: r.left, x1: r.right });
    if (r.bottom > rg.y && r.top < rg.y + rg.h && r.right > rg.x && r.left < rg.x + rg.w) any = true;
  }
  if (!any || !boxes.length) return [];
  const data = node.data;
  const len = data.length;
  const starts = [0];
  for (let i = 1; i < boxes.length; i++) {
    const th = ((boxes[i - 1].top + boxes[i - 1].bottom) / 2 + (boxes[i].top + boxes[i].bottom) / 2) / 2;
    let lo = starts[i - 1] + 1, hi = len;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (midY(node, mid) > th) hi = mid; else lo = mid + 1; }
    starts.push(Math.min(lo, len));
  }
  const out: Line[] = [];
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (b.bottom < rg.y || b.top > rg.y + rg.h) continue;
    let s = data.slice(starts[i], starts[i + 1] ?? len);
    if (!pre) {
      s = s.replace(/[\t\n\r\f ]+/g, " ");
      // a leading space only counts when the browser actually drew it
      if (s.startsWith(" ") && (i > 0 || !node.previousSibling || rectWidth(node, starts[i]) === 0)) s = s.slice(1);
      s = s.trimEnd();
    }
    if (s) out.push({ text: s, x0: b.x0, x1: b.x1, top: b.top, bottom: b.bottom });
  }
  return out;
}
function rectWidth(node: Text, o: number) {
  range.setStart(node, o);
  range.setEnd(node, o + 1);
  return range.getBoundingClientRect().width;
}

function shadowOf(v: string): { color: string; x: number; y: number } | null {
  if (v === "none") return null;
  const m = /^\s*([a-z-]+\([^)]*\)|#[0-9a-f]+|[a-z]+)\s+(-?[\d.]+)px\s+(-?[\d.]+)px/i.exec(v);
  return m && !clear(m[1]) ? { color: m[1], x: +m[2], y: +m[3] } : null;
}

/* ---------- walk ---------- */

type Ctx = { rg: Region; S: number; skip: Element | null; order: number; count: number; fullClip: (c: Clip) => Clip };

function paintBox(el: Element, r: DOMRect, cs: CSSStyleDeclaration, a: number, host: Layer, clip: Clip) {
  const bg = cs.backgroundColor;
  const bgImg = cs.backgroundImage;
  const sh = cs.boxShadow;
  // Tailwind gives every element a solid 0px border, so the width decides
  const hasBg = !clear(bg), hasImg = bgImg !== "none" && bgImg.startsWith("url("), hasSh = sh !== "none", hasB = cs.borderWidth !== "0px";
  if (!hasBg && !hasImg && !hasSh && !hasB) return false;
  const x = r.left, y = r.top, w = r.width, h = r.height;
  let bt = 0, br = 0, bb = 0, bl = 0, ct = "", cr = "", cb = "", cl = "";
  if (hasB) {
    const on = (st: string) => st !== "none" && st !== "hidden";
    if (on(cs.borderTopStyle)) { bt = parseFloat(cs.borderTopWidth) || 0; ct = cs.borderTopColor; }
    if (on(cs.borderRightStyle)) { br = parseFloat(cs.borderRightWidth) || 0; cr = cs.borderRightColor; }
    if (on(cs.borderBottomStyle)) { bb = parseFloat(cs.borderBottomWidth) || 0; cb = cs.borderBottomColor; }
    if (on(cs.borderLeftStyle)) { bl = parseFloat(cs.borderLeftWidth) || 0; cl = cs.borderLeftColor; }
  }
  const shadows = hasSh ? parseShadows(sh).filter((s) => s.blur === 0) : [];
  let pat: CanvasPattern | null = null, img: HTMLImageElement | null = null, bw = 0, bh = 0;
  if (hasImg) {
    const u = urlOf(bgImg);
    img = u ? image(u) : null;
    if (img) {
      const size = cs.backgroundSize.split(" ").map(parseFloat);
      bw = size[0] || img.naturalWidth; bh = size[1] || bw * (img.naturalHeight / (img.naturalWidth || 1));
    }
  }
  host.ops.push({
    clip, a, fn: (c) => {
      for (const s of shadows) {
        if (s.inset) continue;
        const sx = x + s.x - s.spread, sy = y + s.y - s.spread, sw = w + 2 * s.spread, sh2 = h + 2 * s.spread;
        c.fillStyle = s.color;
        if (opaque(bg)) c.fillRect(sx, sy, sw, sh2);
        else { c.save(); c.beginPath(); c.rect(sx - 1, sy - 1, sw + 2, sh2 + 2); c.rect(x, y, w, h); c.clip("evenodd"); c.fillRect(sx, sy, sw, sh2); c.restore(); }
      }
      if (hasBg) { c.fillStyle = bg; c.fillRect(x, y, w, h); }
      if (img) {
        pat ??= c.createPattern(img, "repeat");
        if (pat) {
          pat.setTransform(new DOMMatrix([bw / img.naturalWidth, 0, 0, bh / img.naturalHeight, x, y]));
          c.imageSmoothingEnabled = false;
          c.fillStyle = pat; c.fillRect(x, y, w, h);
        }
      }
      const px = x + bl, py = y + bt, pw = w - bl - br, ph = h - bt - bb;
      for (const s of shadows) {
        if (!s.inset || pw <= 0 || ph <= 0) continue;
        c.fillStyle = s.color;
        if (s.spread) {
          c.save(); c.beginPath(); c.rect(px, py, pw, ph); c.clip();
          c.beginPath(); c.rect(px - 50, py - 50, pw + 100, ph + 100); c.rect(px + s.x + s.spread, py + s.y + s.spread, pw - 2 * s.spread, ph - 2 * s.spread);
          c.fill("evenodd"); c.restore();
        } else {
          const ax = Math.min(Math.abs(s.x), pw), ay = Math.min(Math.abs(s.y), ph);
          if (s.x < 0) c.fillRect(px + pw - ax, py, ax, ph); else if (s.x > 0) c.fillRect(px, py, ax, ph);
          if (s.y < 0) c.fillRect(px, py + ph - ay, pw, ay); else if (s.y > 0) c.fillRect(px, py, pw, ay);
        }
      }
      if (bt && !clear(ct)) { c.fillStyle = ct; c.fillRect(x, y, w, bt); }
      if (bb && !clear(cb)) { c.fillStyle = cb; c.fillRect(x, y + h - bb, w, bb); }
      if (bl && !clear(cl)) { c.fillStyle = cl; c.fillRect(x, y + bt, bl, h - bt - bb); }
      if (br && !clear(cr)) { c.fillStyle = cr; c.fillRect(x + w - br, y + bt, br, h - bt - bb); }
    },
  });
  return true;
}

function paintText(node: Text, cs: CSSStyleDeclaration, a: number, host: Layer, clip: Clip, rg: Region) {
  if (!node.data.trim()) return;
  const lines = textLines(node, rg, cs.whiteSpace.startsWith("pre"));
  if (!lines.length) return;
  const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const color = cs.color;
  const tt = cs.textTransform;
  const rtl = cs.direction === "rtl";
  const ls = cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing;
  const ts = shadowOf(cs.textShadow);
  const sw = parseFloat(cs.getPropertyValue("-webkit-text-stroke-width")) || 0;
  const sc = sw ? cs.getPropertyValue("-webkit-text-stroke-color") : "";
  for (const l of lines) l.text = tt === "uppercase" ? l.text.toUpperCase() : tt === "lowercase" ? l.text.toLowerCase() : l.text;
  host.ops.push({
    clip, a, fn: (c, st) => {
      if (st.font !== font) { c.font = font; st.font = font; }
      if (st.dir !== (rtl ? "rtl" : "ltr")) { st.dir = rtl ? "rtl" : "ltr"; c.direction = st.dir as CanvasDirection; }
      const align = rtl ? "right" : "left";
      if (st.align !== align) { st.align = align; c.textAlign = align; }
      if (st.ls !== ls && "letterSpacing" in c) { st.ls = ls; (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = ls; }
      let m = st.metrics.get(font);
      if (!m) { const t = c.measureText("Hg"); m = [t.fontBoundingBoxAscent, t.fontBoundingBoxDescent]; st.metrics.set(font, m); }
      for (const l of lines) {
        const bx = rtl ? l.x1 : l.x0;
        const by = l.top + (l.bottom - l.top - (m[0] + m[1])) / 2 + m[0];
        if (ts) {
          c.fillStyle = ts.color; c.fillText(l.text, bx + ts.x, by + ts.y);
          if (sw) { c.strokeStyle = ts.color; c.lineWidth = sw; c.strokeText(l.text, bx + ts.x, by + ts.y); }
        }
        c.fillStyle = color; c.fillText(l.text, bx, by);
        if (sw && !clear(sc)) { c.strokeStyle = sc; c.lineWidth = sw; c.lineJoin = "round"; c.strokeText(l.text, bx, by); }
      }
      st.fill = "";
    },
  });
}

type Shape = { p: Path2D; m: DOMMatrix; fill: string; stroke: string; sw: number; dash: number[]; cap: CanvasLineCap; join: CanvasLineJoin; fo: number; so: number; op: number };

function shapePath(el: Element): Path2D | null {
  const g = (n: string) => parseFloat(el.getAttribute(n) ?? "0") || 0;
  switch (el.tagName) {
    case "path": { const d = el.getAttribute("d"); return d ? path2d(d) : null; }
    case "rect": { const p = new Path2D(); p.rect(g("x"), g("y"), g("width"), g("height")); return p; }
    case "circle": { const p = new Path2D(); p.arc(g("cx"), g("cy"), g("r"), 0, Math.PI * 2); return p; }
    case "ellipse": { const p = new Path2D(); p.ellipse(g("cx"), g("cy"), g("rx"), g("ry"), 0, 0, Math.PI * 2); return p; }
    case "line": { const p = new Path2D(); p.moveTo(g("x1"), g("y1")); p.lineTo(g("x2"), g("y2")); return p; }
    case "polyline": case "polygon": {
      const n = (el.getAttribute("points") ?? "").trim().split(/[\s,]+/).map(Number);
      if (n.length < 4) return null;
      const p = new Path2D(); p.moveTo(n[0], n[1]);
      for (let i = 2; i + 1 < n.length; i += 2) p.lineTo(n[i], n[i + 1]);
      if (el.tagName === "polygon") p.closePath();
      return p;
    }
  }
  return null;
}

function paintSvg(svg: SVGSVGElement, r: DOMRect, a: number, host: Layer, clip: Clip, S: number, rg: Region) {
  if (r.right < rg.x || r.left > rg.x + rg.w || r.bottom < rg.y || r.top > rg.y + rg.h) return;
  const m = svg.getScreenCTM();
  if (!m) return;
  const svgClip = intersect(clip, r.left, r.top, r.right, r.bottom);
  if (svg.classList.contains("pixel")) {
    // pixel sprites: flat rects/paths with a fill attribute, no CSS needed per child
    const items: [string, number, number, number, number, Path2D | null][] = [];
    for (const ch of Array.from(svg.children)) {
      const fill = ch.getAttribute("fill");
      if (!fill || fill === "none") continue;
      if (ch.tagName === "rect") items.push([fill, +ch.getAttribute("x")! || 0, +ch.getAttribute("y")! || 0, +ch.getAttribute("width")! || 0, +ch.getAttribute("height")! || 0, null]);
      else if (ch.tagName === "path") { const d = ch.getAttribute("d"); if (d) items.push([fill, 0, 0, 0, 0, path2d(d)]); }
    }
    if (!items.length) return;
    host.ops.push({
      clip: svgClip, a, fn: (c, st) => {
        c.setTransform(m.a * S, m.b * S, m.c * S, m.d * S, (m.e - rg.x) * S, (m.f - rg.y) * S);
        for (const [f, x, y, w, h, p] of items) { c.fillStyle = f; if (p) c.fill(p); else c.fillRect(x, y, w, h); }
        st.base(); st.fill = "";
      },
    });
    return;
  }
  const shapes: Shape[] = [];
  for (const el of Array.from(svg.querySelectorAll("path,rect,circle,ellipse,line,polyline,polygon"))) {
    if (el.closest("defs,clipPath,mask,pattern,symbol,marker")) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const p = shapePath(el);
    const mm = (el as SVGGraphicsElement).getScreenCTM();
    if (!p || !mm) continue;
    const dash = cs.strokeDasharray === "none" ? [] : cs.strokeDasharray.split(/[\s,]+/).map(parseFloat).filter((n) => !isNaN(n));
    shapes.push({ p, m: mm, fill: cs.fill, stroke: cs.stroke, sw: parseFloat(cs.strokeWidth) || 1, dash, cap: cs.strokeLinecap as CanvasLineCap, join: cs.strokeLinejoin as CanvasLineJoin, fo: parseFloat(cs.fillOpacity), so: parseFloat(cs.strokeOpacity), op: parseFloat(cs.opacity) });
  }
  if (!shapes.length) return;
  host.ops.push({
    clip: svgClip, a, fn: (c, st) => {
      for (const s of shapes) {
        c.setTransform(s.m.a * S, s.m.b * S, s.m.c * S, s.m.d * S, (s.m.e - rg.x) * S, (s.m.f - rg.y) * S);
        if (s.fill !== "none" && !s.fill.startsWith("url(") && !clear(s.fill)) { c.globalAlpha = a * s.op * s.fo; c.fillStyle = s.fill; c.fill(s.p); }
        if (s.stroke !== "none" && !s.stroke.startsWith("url(") && !clear(s.stroke)) {
          c.globalAlpha = a * s.op * s.so;
          c.strokeStyle = s.stroke; c.lineWidth = s.sw; c.lineCap = s.cap; c.lineJoin = s.join;
          c.setLineDash(s.dash); c.stroke(s.p); c.setLineDash([]);
        }
      }
      c.globalAlpha = a; st.base(); st.fill = "";
    },
  });
}

function visit(el: Element, ctx: Ctx, real: Layer, host: Layer, alpha: number, clip: Clip) {
  if (el === ctx.skip || SKIP.has(el.tagName) || ++ctx.count > 8000) return;
  const r = el.getBoundingClientRect();
  const rg = ctx.rg;
  if (CULL.has(el.tagName) && (r.bottom < rg.y - CULL_MARGIN || r.top > rg.y + rg.h + CULL_MARGIN)) return;
  const cs = getComputedStyle(el);
  if (!r.width && !r.height && cs.display === "none") return;
  const op = parseFloat(cs.opacity);
  if (op <= 0) return;
  const a = alpha * op;
  const pos = cs.position;
  const positioned = pos !== "static";
  const zi = cs.zIndex;
  const stacking = (positioned && zi !== "auto") || pos === "fixed" || pos === "sticky" || op < 1 || cs.transform !== "none";
  let myHost = host, myReal = real;
  if (stacking || positioned) {
    const L: Layer = { z: zi === "auto" ? 0 : parseInt(zi, 10) || 0, o: ctx.order++, head: 0, ops: [], kids: [] };
    real.kids.push(L);
    myHost = L;
    if (stacking) myReal = L;
  }
  const visible = cs.visibility === "visible";
  if (visible && paintBox(el, r, cs, a, myHost, clip) && myHost !== host) myHost.head = myHost.ops.length;

  const tag = el.tagName;
  if (tag === "svg") { if (visible) paintSvg(el as SVGSVGElement, r, a, myHost, clip, ctx.S, rg); return; }
  if (tag === "CANVAS" || tag === "IMG") {
    if (!visible || r.right < rg.x || r.left > rg.x + rg.w || r.bottom < rg.y || r.top > rg.y + rg.h) return;
    const src = el as HTMLCanvasElement | HTMLImageElement;
    if (tag === "IMG" && !(src as HTMLImageElement).complete) return;
    if (tag === "CANVAS" && (!(src as HTMLCanvasElement).width || !(src as HTMLCanvasElement).height)) return;
    myHost.ops.push({ clip, a, fn: (c) => { c.imageSmoothingEnabled = false; try { c.drawImage(src, r.left, r.top, r.width, r.height); } catch { /* broken image */ } } });
    return;
  }
  let childClip = clip;
  if (cs.overflowX !== "visible" || cs.overflowY !== "visible") {
    const bl = parseFloat(cs.borderLeftWidth) || 0, bt = parseFloat(cs.borderTopWidth) || 0, br = parseFloat(cs.borderRightWidth) || 0, bb = parseFloat(cs.borderBottomWidth) || 0;
    childClip = ctx.fullClip(intersect(clip, cs.overflowX === "visible" ? -1e6 : r.left + bl, cs.overflowY === "visible" ? -1e6 : r.top + bt, cs.overflowX === "visible" ? 1e6 : r.right - br, cs.overflowY === "visible" ? 1e6 : r.bottom - bb));
    if (childClip && (childClip.x1 <= childClip.x0 || childClip.y1 <= childClip.y0)) return;
  }
  for (let n = el.firstChild; n; n = n.nextSibling) {
    if (n.nodeType === 3) { if (visible) paintText(n as Text, cs, a, myHost, childClip, rg); }
    else if (n.nodeType === 1) visit(n as Element, ctx, myReal, myHost, a, childClip);
  }
}

function paintRoot(c: CanvasRenderingContext2D, rg: Region) {
  const html = document.documentElement;
  const hcs = getComputedStyle(html);
  const src = clear(hcs.backgroundColor) && hcs.backgroundImage === "none" ? getComputedStyle(document.body) : hcs;
  c.fillStyle = clear(src.backgroundColor) ? "#fff" : src.backgroundColor;
  c.fillRect(rg.x, rg.y, rg.w, rg.h);
  const u = src.backgroundImage !== "none" ? urlOf(src.backgroundImage) : null;
  const img = u ? image(u) : null;
  if (!img) return;
  const pat = c.createPattern(img, "repeat");
  if (!pat) return;
  const size = src.backgroundSize.split(" ").map(parseFloat);
  const bw = size[0] || img.naturalWidth, bh = size[1] || bw;
  const hr = html.getBoundingClientRect();
  pat.setTransform(new DOMMatrix([bw / img.naturalWidth, 0, 0, bh / img.naturalHeight, hr.left, hr.top]));
  c.imageSmoothingEnabled = false;
  c.fillStyle = pat;
  c.fillRect(rg.x, rg.y, rg.w, rg.h);
}

function run(c: CanvasRenderingContext2D, L: Layer, st: State) {
  L.kids.sort((p, q) => p.z - q.z || p.o - q.o);
  const exec = (op: Op) => {
    if (op.clip !== st.clip) {
      if (st.clip) { c.restore(); st.font = st.dir = st.align = st.ls = ""; }
      if (op.clip) { c.save(); c.beginPath(); c.rect(op.clip.x0, op.clip.y0, op.clip.x1 - op.clip.x0, op.clip.y1 - op.clip.y0); c.clip(); }
      st.clip = op.clip;
    }
    c.globalAlpha = op.a;
    op.fn(c, st);
  };
  let i = 0;
  for (let k = 0; k < L.head; k++) exec(L.ops[k]);
  while (i < L.kids.length && L.kids[i].z < 0) run(c, L.kids[i++], st);
  for (let k = L.head; k < L.ops.length; k++) exec(L.ops[k]);
  while (i < L.kids.length) run(c, L.kids[i++], st);
}

/** Draws `region` (viewport CSS px) of the live page at `scale` canvas px per CSS px.
 * `root` limits the picture to one element (no page background); `skip` leaves one subtree out.
 * Pass `into` to reuse a canvas: allocating a fresh one costs far more than the drawing itself. */
export function snapshot({ region, scale = 1, root, skip = null, into }: { region: Region; scale?: number; root?: Element; skip?: Element | null; into?: HTMLCanvasElement }): HTMLCanvasElement {
  const t0 = performance.now();
  const S = scale;
  const cv = into ?? document.createElement("canvas");
  const W = Math.max(1, Math.ceil(region.w * S)), H = Math.max(1, Math.ceil(region.h * S));
  const resized = cv.width !== W || cv.height !== H;
  if (resized) { cv.width = W; cv.height = H; }
  const c = cv.getContext("2d");
  if (!c) return cv;
  if (!resized) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.clearRect(0, 0, W, H); }
  const base = () => c.setTransform(S, 0, 0, S, -region.x * S, -region.y * S);
  base();
  c.textBaseline = "alphabetic";
  const full = (k: Clip): Clip => (k && k.x0 <= region.x && k.y0 <= region.y && k.x1 >= region.x + region.w && k.y1 >= region.y + region.h ? null : k);
  const ctx: Ctx = { rg: region, S, skip, order: 1, count: 0, fullClip: full };
  const top: Layer = { z: 0, o: 0, head: 0, ops: [], kids: [] };
  const start = root ?? document.body;
  if (start === document.body || start === document.documentElement) {
    paintRoot(c, region);
    for (let n = document.body.firstElementChild; n; n = n.nextElementSibling) visit(n, ctx, top, top, 1, null);
  } else visit(start, ctx, top, top, 1, null);
  const st: State = { clip: null, font: "", fill: "", dir: "", align: "", ls: "", base, metrics: new Map() };
  try { run(c, top, st); } finally { if (st.clip) c.restore(); }
  window.__snapMs = performance.now() - t0;
  return cv;
}

/** Starts loading the page background images so the first snapshot already has them. */
export function warmSnapshot() {
  if (typeof document === "undefined") return;
  for (const el of [document.documentElement, document.body]) {
    const u = urlOf(getComputedStyle(el).backgroundImage);
    if (u) image(u);
  }
}
