import { Hero, Trophy, Pin, MapIcon, Pine, Sunflower } from "@/components/sprites";

type Mode = "start" | "walking" | "goal" | "lost";

/** A short horizontal stretch of the same road, used on the thank-you and 404 pages. */
export function MiniRoad({ mode, label }: { mode: Mode; label?: string }) {
  const pos = { start: "8%", walking: "46%", goal: "80%", lost: "46%" }[mode];
  return (
    <div className="relative mx-auto w-full max-w-md h-44 select-none" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <Pine px={3} className="absolute left-[2%] top-0" />
      <Sunflower px={3} className="absolute right-[4%] top-2 sway" />
      <div className="absolute inset-x-0 bottom-6 h-10 bg-[#33363d] border-y-4 border-[#6b6f78]">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px]" style={{ background: "repeating-linear-gradient(90deg,#e9e6d8 0 14px,transparent 14px 30px)" }} />
        {mode === "goal" && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 w-[82%] bg-[hsl(var(--gold))]" />}
      </div>
      <div className="absolute bottom-12 right-[4%]">
        {mode === "goal" ? <Trophy px={5} className="bob" /> : <Trophy px={4} className="opacity-50 grayscale" />}
      </div>
      {mode === "lost" && (
        <div className="absolute bottom-[4.2rem] left-[24%]"><Pin px={4} /><span className="absolute -top-6 left-1/2 -translate-x-1/2 font-pixel text-3xl text-[#1b2a1c]">?</span></div>
      )}
      <div className="absolute bottom-10" style={{ left: pos, transform: "translateX(-50%)" }}>
        <div className={mode === "walking" ? "bob" : ""}><Hero px={4} /></div>
        {(mode === "start" || mode === "lost") && <MapIcon px={2} className="absolute -right-8 top-6" />}
      </div>
    </div>
  );
}
