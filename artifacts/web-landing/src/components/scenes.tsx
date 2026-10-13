import { memo, useEffect, useRef, type CSSProperties } from "react";
import { CLOUD_ARTS, SCENES, SCENE_PAL, type Fx, type SceneName } from "@/components/scene-art";

export type { SceneName } from "@/components/scene-art";

/* Little pixel dioramas along the road. Sizes are multiples of --sp (one art pixel), so one
 * scene can be 3px on phones and 5px on desktop from CSS alone. */

type Parsed = { w: number; h: number; paths: [key: string, fill: string, d: string][] };
const parsed = new Map<string, Parsed>();

/** One <path> per colour keeps each part to a handful of DOM nodes. */
function parse(art: string): Parsed {
  const hit = parsed.get(art);
  if (hit) return hit;
  const rows = art.replace(/^\n/, "").split("\n");
  const w = Math.max(...rows.map((r) => r.length));
  const byKey = new Map<string, string>();
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      if (c === "." || !SCENE_PAL[c]) { x++; continue; }
      let run = 1;
      while (row[x + run] === c) run++;
      byKey.set(c, (byKey.get(c) ?? "") + `M${x} ${y}h${run}v1h-${run}z`);
      x += run;
    }
  });
  const p: Parsed = { w, h: rows.length, paths: [...byKey].map(([k, d]) => [k, SCENE_PAL[k], d]) };
  parsed.set(art, p);
  return p;
}

const sp = (n: number) => `calc(var(--sp, 3px) * ${n})`;

function Art({ a, className = "" }: { a: string; className?: string }) {
  const { w, h, paths } = parse(a);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`pixel block ${className}`} style={{ width: sp(w), height: sp(h) }} shapeRendering="crispEdges" aria-hidden="true">
      {paths.map(([k, fill, d]) => <path key={k} d={d} fill={fill} />)}
    </svg>
  );
}

const FX_BITS: Record<Fx["k"], number> = { smoke: 3, steam: 3, confetti: 8, burst: 8 };

function Effect({ f, n }: { f: Fx; n: number }) {
  return (
    <span className={`fx fx-${f.k} ${f.c ?? ""}`} style={{ left: sp(f.x), top: sp(f.y), "--fd": `${n * -1.3}s` } as CSSProperties}>
      {Array.from({ length: FX_BITS[f.k] }, (_, i) => <i key={i} style={{ "--i": i } as CSSProperties} />)}
    </span>
  );
}

/* One shared observer pauses the loops of scenes that are off screen. */
let io: IntersectionObserver | null = null;
function watch(el: HTMLElement) {
  if (typeof IntersectionObserver === "undefined") { el.setAttribute("data-run", ""); return () => {}; }
  io ??= new IntersectionObserver((entries) => {
    for (const e of entries) e.target.toggleAttribute("data-run", e.isIntersecting);
  }, { rootMargin: "160px 0px" });
  io.observe(el);
  return () => io?.unobserve(el);
}

/** A pixel diorama. Pass a position class (`absolute ...`) and set --sp on it or a parent. */
export const Scene = memo(function Scene({ name, className = "relative", style }: { name: SceneName; className?: string; style?: CSSProperties }) {
  const def = SCENES[name];
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => (ref.current ? watch(ref.current) : undefined), []);
  return (
    <div ref={ref} className={`scn pointer-events-none select-none ${className}`} style={{ width: sp(def.w), height: sp(def.h), ...style }} aria-hidden="true" data-scene={name}>
      {def.parts.map((p, i) => (
        <div key={i} className={`scn-p ${p.c ?? ""}`} style={{ left: sp(p.x), top: sp(p.y) }}>
          <Art a={p.a} className={p.i} />
        </div>
      ))}
      {def.fx?.map((f, i) => <Effect key={`fx${i}`} f={f} n={i} />)}
      {def.swap && (
        <span className="sc-poof" style={{ left: sp(def.swap.x), top: sp(def.swap.y) }}>
          <b />
          {Array.from({ length: 8 }, (_, i) => <i key={i} style={{ "--a": `${i * 45}deg` } as CSSProperties} />)}
        </span>
      )}
    </div>
  );
});

/** A drifting cloud, or its shadow (every pixel in currentColor). Size follows --sp like the scenes. */
export function CloudArt({ i, shadow = false }: { i: number; shadow?: boolean }) {
  const { w, h, paths } = parse(CLOUD_ARTS[i]);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block" style={{ width: sp(w), height: sp(h) }} shapeRendering="crispEdges" aria-hidden="true">
      {shadow ? <path d={paths.map((p) => p[2]).join("")} fill="currentColor" /> : paths.map(([k, fill, d]) => <path key={k} d={d} fill={fill} />)}
    </svg>
  );
}
