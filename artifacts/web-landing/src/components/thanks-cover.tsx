import { useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n";

const COLORS = ["#57c24a", "#4fb543", "#46a83a", "#3d8a3a", "#57c24a", "#ebe8de", "#4fb543", "#f6c945"];
const MIN = 900, FAILSAFE = 8000;

/** Full-screen pixel "loading" cover for /cam-on: first status load only, then tiles uncover the result. */
export function ThanksCover({ loading, onDone }: { loading: boolean; onDone: () => void }) {
  const { t } = useI18n();
  const root = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const pct = useRef<HTMLSpanElement>(null);
  const start = useRef(performance.now());
  const leaving = useRef(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const setP = (n: number) => {
    if (pct.current) pct.current.textContent = `${n}%`;
    root.current?.style.setProperty("--p", String(n / 100));
  };

  const leave = () => {
    if (leaving.current) return;
    leaving.current = true;
    setP(100);
    window.setTimeout(() => { if (root.current) root.current.dataset.phase = "uncover"; }, 260);
    window.setTimeout(() => doneRef.current(), 720);
  };

  useEffect(() => {
    const r = root.current, g = grid.current;
    if (!r || !g) return;
    const tile = window.innerWidth < 640 ? 48 : 64;
    const cols = Math.ceil(window.innerWidth / tile), rows = Math.ceil(window.innerHeight / tile);
    const cx = cols / 2, cy = rows / 2, max = Math.hypot(cx, cy) || 1;
    g.style.gridTemplateColumns = `repeat(${cols}, ${tile}px)`;
    g.style.gridTemplateRows = `repeat(${rows}, ${tile}px)`;
    let html = "";
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const d = Math.round((1 - Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / max) * 190);
      html += `<i style="--td:${d}ms;background:${COLORS[(x * 3 + y * 5 + ((x * y) % 3)) % COLORS.length]}"></i>`;
    }
    g.innerHTML = html;
    setP(0);
    const ts = [
      window.setTimeout(() => { r.dataset.phase = "hold"; }, 220),
      window.setTimeout(() => setP(35), 420),
      window.setTimeout(() => setP(72), 720),
      window.setTimeout(() => setP(88), 2200),
      window.setTimeout(leave, FAILSAFE),
    ];
    return () => ts.forEach((x) => window.clearTimeout(x));
  }, []);

  useEffect(() => {
    if (loading) return;
    const wait = Math.max(0, MIN - (performance.now() - start.current));
    const id = window.setTimeout(leave, wait);
    return () => window.clearTimeout(id);
  }, [loading]);

  return (
    <div ref={root} className="scene thanks-cover" data-phase="cover" data-testid="thanks-cover" aria-hidden="true">
      <div ref={grid} className="scene-grid" />
      <div className="scene-card tile p-5 text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--pin))]">{t.stage} <span className="font-num text-base">08</span></p>
        <p className="font-display text-xl leading-tight mt-1 text-[#10230f]">{t.scene.finish}</p>
        <div className="scene-bar mt-4 h-4 border-[3px] border-[#1b2a1c] bg-white/70" dir="ltr"><span /></div>
        <p className="mt-2 text-sm font-semibold text-[#2c3a2c]">{t.thanks.loading}</p>
        <p className="mt-1 flex justify-between text-xs font-bold text-[#1b2a1c]">
          <span>{t.scene.loading}<span className="blink">_</span></span>
          <span ref={pct} className="font-num" dir="ltr">0%</span>
        </p>
      </div>
    </div>
  );
}
