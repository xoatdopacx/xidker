import { useEffect, useRef } from "react";
import { useI18n, type Dict } from "@/lib/i18n";
import { settleRevealsInView } from "@/lib/motion";

const COLORS = ["#57c24a", "#4fb543", "#46a83a", "#3d8a3a", "#57c24a", "#ebe8de", "#4fb543", "#f6c945"];
const HEADER = 64;

function dest(id: string, t: Dict): { num: string; name: string } {
  switch (id) {
    case "ban-nhan-gi": return { num: "01", name: t.stops.what.title };
    case "cach-dung": return { num: "04", name: t.stops.how.title };
    case "bang-gia": return { num: "06", name: t.pricing.title };
    case "hoi-dap": return { num: "07", name: t.faq.title };
    default: return { num: "00", name: t.scene.start };
  }
}

/** Full-screen 3D pixel wipe for in-page anchor jumps: cover → loading beat → instant jump → uncover. */
export function SceneTransition() {
  const { t } = useI18n();
  const tRef = useRef(t);
  tRef.current = t;
  const root = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const nameRef = useRef<HTMLParagraphElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let running = false;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));

    const land = (el: HTMLElement, id: string, href: string) => {
      const top = id === "top" ? 0 : Math.max(0, el.getBoundingClientRect().top + window.scrollY - HEADER);
      window.scrollTo({ top, behavior: "instant" as ScrollBehavior });
      if (location.hash !== href) history.pushState(null, "", href);
      settleRevealsInView();
      const h = el.querySelector<HTMLElement>("h1, h2") ?? el;
      if (!h.hasAttribute("tabindex")) h.setAttribute("tabindex", "-1");
      h.focus({ preventScroll: true });
    };

    const reset = () => {
      timers.splice(0).forEach((x) => window.clearTimeout(x));
      if (root.current) root.current.dataset.phase = "idle";
      if (grid.current) grid.current.innerHTML = "";
      running = false;
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      const id = href.slice(1);
      const el = id ? document.getElementById(id) : null;
      if (!el) return;
      e.preventDefault();
      if (running) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const r = root.current, g = grid.current;
      if (reduced || !r || !g) { land(el, id, href); return; }
      running = true;

      const tile = window.innerWidth < 640 ? 48 : 64;
      const cols = Math.ceil(window.innerWidth / tile), rows = Math.ceil(window.innerHeight / tile);
      const cx = e.clientX / tile, cy = e.clientY / tile;
      const max = Math.hypot(Math.max(cx, cols - cx), Math.max(cy, rows - cy)) || 1;
      g.style.gridTemplateColumns = `repeat(${cols}, ${tile}px)`;
      g.style.gridTemplateRows = `repeat(${rows}, ${tile}px)`;
      let html = "";
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const d = Math.round((Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / max) * 190);
        html += `<i style="--td:${d}ms;background:${COLORS[(x * 3 + y * 5 + ((x * y) % 3)) % COLORS.length]}"></i>`;
      }
      g.innerHTML = html;
      const info = dest(id, tRef.current);
      if (numRef.current) numRef.current.textContent = info.num;
      if (nameRef.current) nameRef.current.textContent = info.name;
      if (pctRef.current) pctRef.current.textContent = "0%";

      // cover 0–390ms → loading beat 390–840ms (long enough to read the stage name) → uncover to 1240ms
      r.dataset.phase = "cover";
      later(() => {
        r.dataset.phase = "hold";
        later(() => { if (pctRef.current) pctRef.current.textContent = "35%"; }, 90);
        later(() => { if (pctRef.current) pctRef.current.textContent = "72%"; }, 200);
        later(() => { if (pctRef.current) pctRef.current.textContent = "100%"; }, 320);
      }, 390);
      later(() => { land(el, id, href); r.dataset.phase = "uncover"; }, 840);
      later(reset, 1240);
      later(reset, 2400); // fail-safe: the cover can never stay up
    };

    document.addEventListener("click", onClick);
    return () => { document.removeEventListener("click", onClick); reset(); };
  }, []);

  return (
    <div ref={root} className="scene" data-phase="idle" data-testid="scene-transition" aria-hidden="true">
      <div ref={grid} className="scene-grid" />
      <div className="scene-card tile p-5 text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--pin))]">{t.stage} <span ref={numRef} className="font-num text-base">00</span></p>
        <p ref={nameRef} className="font-display text-xl leading-tight mt-1 text-[#10230f]" />
        <div className="scene-bar mt-4 h-4 border-[3px] border-[#1b2a1c] bg-white/70"><span /></div>
        <p className="mt-2 flex justify-between text-xs font-bold text-[#1b2a1c]">
          <span>{t.scene.loading}<span className="blink">_</span></span>
          <span ref={pctRef} className="font-num">0%</span>
        </p>
      </div>
    </div>
  );
}
