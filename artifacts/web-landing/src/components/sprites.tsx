import type { CSSProperties, ReactElement } from "react";

type Palette = Record<string, string>;

/** Renders an ASCII pixel grid as crisp SVG rects ('.' = transparent). Horizontal runs are merged. */
export function Sprite({ art, palette, px = 4, className = "", style, label }: { art: string; palette: Palette; px?: number; className?: string; style?: CSSProperties; label?: string }) {
  const rows = art.trim().split("\n").map((r) => r.trim());
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const rects: ReactElement[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      if (c === "." || !palette[c]) { x++; continue; }
      let run = 1;
      while (row[x + run] === c) run++;
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={run} height={1} fill={palette[c]} />);
      x += run;
    }
  });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w * px} height={h * px} shapeRendering="crispEdges" className={`pixel ${className}`} style={style}
      role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {rects}
    </svg>
  );
}

const K = "#1b2a1c";

export const HERO_PAL: Palette = { K, Y: "#f6c945", y: "#d99a1e", S: "#f6c6a0", P: "#8b4fd0", p: "#5f2f9f", B: "#3a2a20", W: "#ffffff", E: "#1b2a1c" };
export const HERO_A = `
...KKKK...
..KYYYYK..
.KYYYYYYK.
.KYSSSSyK.
.KYSESEyK.
.KYSSSSyK.
.KyYSSyyK.
..KPPPPK..
.KPPWPPpK.
.SPPPPPpS.
..KPPPpK..
..KPPPpK..
..KB..BK..
..KK..KK..`;
export const HERO_B = `
...KKKK...
..KYYYYK..
.KYYYYYYK.
.KYSSSSyK.
.KYSESEyK.
.KYSSSSyK.
.KyYSSyyK.
..KPPPPK..
.KPPWPPpK.
.SPPPPPpS.
..KPPPpK..
..KPPPpK..
...KB.BK..
...KK.KK..`;

export function Hero({ px = 4, frame = 0, className = "", label }: { px?: number; frame?: 0 | 1; className?: string; label?: string }) {
  return <Sprite art={frame ? HERO_B : HERO_A} palette={HERO_PAL} px={px} className={className} label={label} />;
}

export function Pine({ px = 4, className = "" }: { px?: number; className?: string }) {
  return <Sprite px={px} className={className} palette={{ K: "#14532d", G: "#3fae4a", D: "#1e7a34", T: "#7a4a24" }} art={`
....K....
...KGK...
...GGD...
..KGGDK..
..GGGGD..
.KGDGGDK.
..KGGGK..
.KGGGGDK.
.GGDGGGD.
KGGGGDGGK
KDDDDDDDK
....T....
....T....`} />;
}

export function Sunflower({ px = 4, className = "" }: { px?: number; className?: string }) {
  return <Sprite px={px} className={className} palette={{ Y: "#f8c630", O: "#d98a12", B: "#6b3b12", G: "#2f8f3a" }} art={`
.YOY.
YBBBY
OBBBO
YBBBY
.YOY.
..G..
.GG..
..GG.
..G..`} />;
}

export function Mushroom({ px = 4, className = "" }: { px?: number; className?: string }) {
  return <Sprite px={px} className={className} palette={{ R: "#e3392b", W: "#ffffff", S: "#f1e6cf", K }} art={`
.RRRR.
RWRRWR
RRRRRR
.KSSK.
..SS..`} />;
}

export function Log({ px = 4, className = "" }: { px?: number; className?: string }) {
  return <Sprite px={px} className={className} palette={{ B: "#8a5a2b", D: "#5e3a19", L: "#d9a86a" }} art={`
.BBBBBBBBL.
DBBBBBBBLDL
.DDDDDDDDL.`} />;
}

export function Pin({ px = 4, className = "", label }: { px?: number; className?: string; label?: string }) {
  return <Sprite px={px} className={className} label={label} palette={{ K: "#2a0907", R: "#e3392b", r: "#a5231d", W: "#ffffff" }} art={`
..KKK..
.KRRRK.
KRRWRrK
KRWKWrK
KRRWRrK
.KRRrK.
..KrK..
..KrK..
...K...`} />;
}

export function Trophy({ px = 4, className = "", label }: { px?: number; className?: string; label?: string }) {
  return <Sprite px={px} className={className} label={label} palette={{ K: "#6b4a10", G: "#f6c945", g: "#d99a1e", W: "#fff6c8" }} art={`
.KKKKKKKKK.
KGKWGGGGgKG
KGKWGGGGgKG
.KGWGGGGgK.
..KGGGGgK..
...KGGgK...
....KgK....
....KgK....
...KGGgK...
..KKKKKKK..`} />;
}

export function MapIcon({ px = 4, className = "", label }: { px?: number; className?: string; label?: string }) {
  return <Sprite px={px} className={className} label={label} palette={{ K: "#3b2a14", P: "#efd9a4", p: "#d4b876", B: "#3d8ad9", G: "#5cbf4a", R: "#e3392b" }} art={`
.KKKKKKKKKKK.
KPPPPPPPPPPpK
KPGGPBBPPRPpK
KPGBBBPPRPRpK
KPBBPPPGGRPpK
KPPPPGGGGPPpK
.KKKKKKKKKKK.`} />;
}

export function Cat({ px = 4 }: { px?: number }) {
  return <Sprite px={px} palette={{ K, G: "#c9ccd2", g: "#8f949c", W: "#ffffff" }} art={`
K.K.......
GKG......K
GGGGGGGGG.
.GgGgGgGG.
.G.G..G.G.`} />;
}

export function Raccoon({ px = 4 }: { px?: number }) {
  return <Sprite px={px} palette={{ K, G: "#6b6f78", W: "#e7e7e7", B: "#2b2d33" }} art={`
.K.K.......
KWBWK.....B
.GWG.....GG
.GGGGGGGGB.
..G.G..G.G.`} />;
}

export function Chest({ px = 4, className = "", label }: { px?: number; className?: string; label?: string }) {
  return <Sprite px={px} className={className} label={label} palette={{ K: "#3b2410", B: "#9a5a22", b: "#6e3c14", G: "#f6c945" }} art={`
.KKKKKKKK.
KBBBBBBBBK
KbbbGGbbbK
KKKKGGKKKK
KBBBBBBBBK
KbbbbbbbbK
.KKKKKKKK.`} />;
}

/** Pixel mark: hero head on a pin. */
export function Logo({ className = "" }: { className?: string }) {
  return <Sprite px={3} className={className} palette={{ K: "#2a0907", R: "#e3392b", Y: "#f6c945", S: "#f6c6a0" }} art={`
..KKKK..
.KYYYYK.
KYSSSSYK
KYSKSKYK
KRSSSSRK
.KRRRRK.
..KRRK..
...KK...`} />;
}

const LETTER_COLORS = ["#e98a8a", "#c9c08a", "#f2d36b", "#7fb8a8", "#e98a8a", "#f2d36b"];

export function Wordmark({ className = "", size = "text-2xl" }: { className?: string; size?: string }) {
  return (
    <span className={`font-pixel font-bold lowercase ${size} ${className}`} style={{ textShadow: "2px 2px 0 #1b2a1c" }}>
      {"xidker".split("").map((c, i) => <span key={i} style={{ color: LETTER_COLORS[i] }}>{c}</span>)}
    </span>
  );
}

/** Big title like the reference: chunky pixel letters with outline and mushrooms on top. */
export function PixelTitle() {
  return (
    <div className="relative inline-block select-none" aria-hidden>
      <span className="font-pixel font-bold lowercase leading-none text-[clamp(4.5rem,18vw,10rem)] tracking-tight"
        style={{ WebkitTextStroke: "3px #1b2a1c", textShadow: "6px 6px 0 #1b2a1c" }}>
        {"xidker".split("").map((c, i) => <span key={i} style={{ color: LETTER_COLORS[i] }}>{c}</span>)}
      </span>
      <Mushroom px={4} className="absolute -top-3 left-[30%] sway" />
      <Mushroom px={3} className="absolute -top-2 left-[78%] sway" />
    </div>
  );
}

/* ---------------- Vehicles (the girl rides every one) ---------------- */

const RIDE: Palette = { ...HERO_PAL, R: "#e3392b", C: "#3d8ad9", G: "#f6c945", B: "#8a5a2b", W: "#e9f4ff" };
const FR = [
  { a: "#1b2a1c", b: "#9aa0a8", f: "#f6c945", g: "#e3392b" },
  { a: "#9aa0a8", b: "#1b2a1c", f: "#e3392b", g: "#f6c945" },
];

export const VEHICLES: string[] = [
`
.....KKKK.........
....KYYYYK........
....KYSSEK........
....KYSSSK........
.....KPPK.........
.....KPPPSS.......
......KPK...K.....
.....KKKKKKKKK....
..KKK..K...K.KKK..
.KabaK.K..K.KabaK.
.KbKbKKKKKKKKbKbK.
.KabaK.......KabaK
..KKK.........KKK.`,
`
.....KKKK.........
....KYYYYK........
....KYSSEK........
....KYSSSK.....KK.
.....KPPK.....KK..
.....KPPPSSSSKK...
.....KPPK....KR...
..KRRRRRRRRRRRR...
..KRRRRRRRRRRRRK..
.KKK.KKKKKKK.KKK..
KabaK.......KabaK.
KbKbK.......KbKbK.
KabaK.......KabaK.
.KKK.........KKK..`,
`
.....KKKKKKK......
....KWWKYYKCK.....
...KWWWKYSEKCK....
..KCCCCKPPSKCCK...
.KCCCCCCCCCCCCCKK.
KCCCCCCCCCCCCCCCGK
KCCCCCCCCCCCCCCCCK
KKKabaKKKKKKabaKKK
...KbKbK...KbKbK..
...KabaK...KabaK..
....KKK.....KKK...`,
`
KKKKKKKKKKKKKKKKKK
KGGGGGGGGGGGGGGGGK
KGWWKWWKWWKYYYKWWK
KGWWKWWKWWKYSEKWWK
KGWWKWWKWWKPPPKWWK
KGGGGGGGGGGGGGGGGK
KRRRRRRRRRRRRRRRRK
KGGGGGGGGGGGGGGGGW
KKKabaKKKKKKKabaKK
...KbKbK....KbKbK.
...KabaK....KabaK.
....KKK......KKK..`,
`
....KKKKKK....
..KKRRWWRRKK..
.KRRRWWWWRRRK.
KRRRRWWWWRRRRK
KRRRRWWWWRRRRK
KRRRRWWWWRRRRK
.KRRRWWWWRRRK.
..KRRWWWWRRK..
...KKRWWRKK...
....K.fg.K....
....K.gf.K....
....KKKKKK....
....KYYYEK....
....KBPPSB....
....KBBBBK....
.....KKKK.....`,
`
........KK..........
.......KCCK.........
KK.....KCCK.........
KCK..KKKKKKKKKKKK...
KCCKKWWWWWKYYEKWWK..
KCCCCCCCCCCKPPKCCCKa
.KKKKKKKCCCCCCCCCKKb
.......KCCK......K.a
........KK..........`,
`
.......KKKK........
......KRRRRK.......
...KKKKKKKKKKKKK...
gfgKWWWWWWKYYEKWKK.
fgfKWWWWWWKYSSKWWWK
gfgKWWWWWWWKPPKWWWWK
fgfKWWWWWWKWWWWWWKK.
gfgKKKKKKKKKKKKKK...
.......KRRRRK......
........KKKK.......`,
];

export function Vehicle({ i, frame, px = 3 }: { i: number; frame: 0 | 1; px?: number }) {
  return <Sprite art={VEHICLES[i]} palette={{ ...RIDE, ...FR[frame] }} px={px} />;
}
