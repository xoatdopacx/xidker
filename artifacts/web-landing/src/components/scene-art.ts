/* Pixel art for the little places along the road ("scenes").
 * Plain data (no JSX) so it can be previewed outside the app. One shared palette keeps every scene in
 * the same colours as the rest of the site. '.' is transparent. */

export const SCENE_PAL: Record<string, string> = {
  K: "#1b2a1c", k: "#2b2d33", A: "#3a3d45",
  W: "#ffffff", w: "#ebe8de", v: "#c9c5b8",
  R: "#e3392b", r: "#a5231d", Y: "#f6c945", y: "#d99a1e", O: "#f08a24", F: "#fff3b0",
  B: "#9a6430", b: "#5e3a19", T: "#dcae6e", t: "#b9884a",
  S: "#c3c8cf", s: "#7c828c",
  C: "#3d8ad9", c: "#24589e", U: "#a9dcf2", u: "#5fb0dc",
  G: "#3f9a3a", g: "#2a6f2a", L: "#8fdc6a",
  N: "#14532d", n: "#1e7a34", Q: "#3fae4a",
  P: "#8b4fd0", M: "#f2a0c0",
};

/* ---------- props ---------- */

const PINE = `
....N....
...NQN...
...QQn...
..NQQnN..
..QQQQn..
.NQnQQnN.
..NQQQN..
.NQQQQnN.
.QQnQQQn.
NQQQQnQQN
NnnnnnnnN
....b....
....b....`;

const BUSH = `
..gGGg..
.gLLGGg.
gGLGGGGg
gggggggg`;

const FLOWERS = `
R...Y
G.R.G
G.G.G`;

const FLOWERS_B = `
Y.M..
G.GY.
G.GG.`;

const CLOUD = `
....WWWW.....
..WWWWWWWW...
.WWWWWWWWWWW.
WWWWWWWWWWWWW
.UUUUUUUUUUU.`;

const CLOUD_S = `
..WWWW...
.WWWWWWW.
WWWWWWWWW
.UUUUUUU.`;

/* ---------- start: home ---------- */

const COTTAGE = `
..................KKK.....
..................KsK.....
....KKKKKKKKKKKKKKKsKK....
...KRRRRRRRRRRRRRRKsKRK...
..KRRrRRRrRRRrRRRrKKKRRK..
.KRRRRRRRRRRRRRRRRRRRRRRK.
KRrRRRrRRRrRRRrRRRrRRRrRRK
KKKKKKKKKKKKKKKKKKKKKKKKKK
..KwwwwwwwwwwwwwwwwwwwwK..
..KwKKKKwwwKKKKwwwKKKKwK..
..KwKUUKwwwKBBKwwwKUUKwK..
..KwKUWKwwwKBBKwwwKUWKwK..
..KwKKKKwwwKBYKwwwKKKKwK..
..KwwwwwwwwKBBKwwwwwwwwK..
..KvvvvvvvvKBBKvvvvvvvvK..
..KKKKKKKKKKKKKKKKKKKKKK..`;

const MAILBOX = `
.KKKK..
KRRRRKY
KRRRRKy
KrrrrK.
.KKKK..
..KbK..
..KbK..
..KbK..`;

const FENCE = `
w.w.w.w.w.w
wwwwwwwwwww
w.w.w.w.w.w
wwwwwwwwwww
v.v.v.v.v.v`;

const PATH = `
.TTTT.
.TTTT.
TTtTTT
TTTTtT`;

/* ---------- stop 1: bike rental ---------- */

const KIOSK = `
.KKKKKKKKKKKKKKKKKK.
KRRWWRRWWRRWWRRWWRRK
KRRWWRRWWRRWWRRWWRRK
KrrvvrrvvrrvvrrvvrrK
.KKKKKKKKKKKKKKKKKK.
.KBBBBBBBBBBBBBBBBK.
.KBKKKKKKKKKKKKKKBK.
.KBKAAAkkAAAAkkAKBK.
.KBKAAkAAkAAkAAkKBK.
.KBKAAAkkAAAAkkAKBK.
.KBKKKKKKKKKKKKKKBK.
.KTTTTTTTTTTTTTTTTK.
.KBbBBbBBbBBbBBbBBK.
.KBbBBbBBbBBbBBbBBK.
.KKKKKKKKKKKKKKKKKK.`;

const SIGN_BIKE = `
.KKKKK.
KCCCCCK
KWWCWWK
KWCCCWK
KWWCWWK
KCCCCCK
.KKKKK.
...b...
...b...
...b...
...b...
..bbb..`;

const BICYCLE = `
....KKK.....KK..
.....R......K...
.....RRRRRRRK...
.KKK..R...R.KKK.
KsSsK..R.R.KsSsK
KSkSRRRRRRRRSkSK
KsSsK......KsSsK
.KKK........KKK.`;

/* ---------- stop 2: street cafe + scooter ---------- */

const PARASOL = `
........KKK........
......KKRYRKK......
....KKRRRYRRRKK....
..KKRRRRYYYRRRRKK..
KKRRRRRYYYYYRRRRRKK
KKKKKKKKKKKKKKKKKKK
.........K.........
.........K.........
.........K.........
.........K.........
.........K.........
........KKK........`;

const TABLE = `
KKKKKKKK
KTTTTTTK
KKKKKKKK
.K....K.
.K....K.`;

const STOOL_R = `
RRRR
r..r
r..r`;

const STOOL_B = `
CCCC
c..c
c..c`;

const CUP = `
WWK
wwK`;

const SCOOTER = `
...............KK.
..............KK..
.............KK...
....KKKKKK...KR...
..KRRRRRRRRRRRR...
..KRRRRRRRRRRRRK..
.KKK.KKKKKKK.KKK..
KsSsK.......KsSsK.
KSkSK.......KSkSK.
KsSsK.......KsSsK.
.KKK.........KKK..`;

/* ---------- stop 3: fuel stop + car ---------- */

const CANOPY = `
KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
KwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwK
KRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRK
KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
.KsK..............................KsK.
.KsK..............................KsK.
.KsK..............................KsK.
.KsK..............................KsK.
.KsK..............................KsK.
.KsK..............................KsK.
.KsK..............................KsK.
.KsK..............................KsK.
.KsK..............................KsK.
.KsK..............................KsK.
.KsK..............................KsK.
.KsK..............................KsK.
.KsK..............................KsK.
.KsK..............................KsK.
.KsK..............................KsK.
.KKK..............................KKK.`;

const PUMP = `
.KKKKKK...
KRRRRRRK..
KRKKKKRK..
KRKFFKRK..
KRKKKKRK..
KRRRRRRKK.
KRWWWWRK.K
KRWWWWRK.K
KRRRRRRK.K
KRRRRRRK.K
KrrrrrrKKK
KKKKKKKK..`;

const LAMP = `
FF`;

const CAR = `
.....KKKKKKK......
....KUUKUUKCK.....
...KUUUKUUUKCK....
..KCCCCKCCCKCCK...
.KCCCCCCCCCCCCCKK.
KCCCCCCCCCCCCCCCYK
KCCCCCCCCCCCCCCCCK
KKKsSsKKKKKKsSsKKK
...KSkSK...KSkSK..
...KsSsK...KsSsK..
....KKK.....KKK...`;

/* ---------- stop 4: bus stop ---------- */

const SHELTER = `
KKKKKKKKKKKKKKKKKK
KCCCCCCCCCCCCCCCCK
KKKKKKKKKKKKKKKKKK
.KsKUUUUUUUUUUKsK.
.KsKUWUUUUUUUUKsK.
.KsKUUWUUUUUUUKsK.
.KsKUUUUUUUUUUKsK.
.KsKKKKKKKKKKKKsK.
.KsKTTTTTTTTTTKsK.
.KsKbKKKKKKKKbKsK.
.KsK.b......b.KsK.
.KsK.b......b.KsK.
.KKK..........KKK.`;

const CAT = `
s.s...
SSSSs.
SSSSSs`;

const BUS_SIGN = `
.KKK.
KCCCK
KCWCK
KCCCK
.KKK.
..s..
..s..
..s..
..s..
..s..
..s..
..s..
..s..
.sss.`;

const BUS = `
KKKKKKKKKKKKKKKKKK
KYYYYYYYYYYYYYYYYK
KYUUKUUKUUKUUUKUUK
KYUUKUUKUUKUUUKUUK
KYUUKUUKUUKUUUKUUK
KYYYYYYYYYYYYYYYYK
KRRRRRRRRRRRRRRRRK
KYYYYYYYYYYYYYYYYW
KKKsSsKKKKKKKsSsKK
...KSkSK....KSkSK.
...KsSsK....KsSsK.
....KKK......KKK..`;

/* ---------- stop 5: balloon field ---------- */

const BALLOON = `
....KKKKKK....
..KKRRWWRRKK..
.KRRRWWWWRRrK.
KRRRRWWWWRRrrK
KRRRRWWWWRRrrK
KRRRRWWWWRRrrK
.KRRRWWWWRRrK.
..KRRWWWWRrK..
...KKRWWRKK...
....K....K....
....K....K....
....KKKKKK....
....KBBBBK....
....KbbbbK....
.....KKKK.....`;

const FLAME = `
YO
OY`;

const ROPE = `
b
b
b
b
b
b`;

const PEG = `
.b.
bbb`;

const SACK = `
.tt.
tTTt
tttt`;

/* ---------- stop 6: airfield ---------- */

const HANGAR = `
......KKKKKKKK......
....KKSSSSSSSSKK....
...KSSSSSSSSSSSSK...
..KSSsSSSsSSSsSSSK..
.KSSSSSSSSSSSSSSSSK.
.KSsSSSsSSSsSSSsSSK.
KSSSSSSSSSSSSSSSSSSK
KSSKKKKKKKKKKKKKKSSK
KSSKAAAAAAAAAAAAKSSK
KSSKAAAAAAAAAAAAKSSK
KSSKAAAAAAAAAAAAKSSK
KSSKAAAAAAAAAAAAKSSK
KKKKKKKKKKKKKKKKKKKK`;

const POLE = `
K
s
s
s
s
s
s
s
s
s
s
s
s
s
s
s`;

const SOCK_A = `
.WRRWWRR
WWRRWWRR
.WRRWWRR`;

const SOCK_B = `
...RWWRR
.WRRWWRR
..RRWWRR`;

const STRIP = `
TTTTTTTTTTTTTTTTTTTTTTTTTT
TTWWWTTTTWWWTTTTWWWTTTTWWT
tttttttttttttttttttttttttt`;

const RUNWAY_LIGHT = `
Y`;

const PLANE = `
........KK..........
.......KCCK.........
KK.....KCCK.........
KCK..KKKKKKKKKKKK...
KCCKKWWWWWKUUUKWWK..
KCCCCCCCCCCKCCKCCCKs
.KKKKKKKCCCCCCCCCKKs
.......KCCK......K.s
........KK..........
......Kk.......Kk...`;

/* ---------- stop 7: launch pad ---------- */

const ROCKET = `
....K....
...KRK...
...KRK...
..KRRRK..
..KWWWK..
.KWWWWWK.
.KWKKKWK.
.KWKUKWK.
.KWKKKWK.
.KWWWWWK.
.KWWWWWK.
.KWWRWWK.
.KWWRWWK.
.KWWWWWK.
KRKWWWKRK
KRRKKKRRK
KRK.K.KRK
K...K...K`;

const GANTRY = `
KKKKKKK
Ks...sK
K.s.s.K
K..s..K
K.s.s.K
Ks...sK
KKKKKKK
Ks...sK
K.s.s.K
K..s..K
K.s.s.K
Ks...sK
KKKKKKK
Ks...sK
K.s.s.K
K..s..K
K.s.s.K
Ks...sK
KKKKKKK
Ks...sK
K.....K
K.....K`;

const ARM = `
ssss
s..s`;

const PAD = `
.KKKKKKKKKKKKKK.
KSSSSSSSSSSSSSSK
KssssssssssssssK`;

const HUT = `
.....KK.....
....KSSK....
...KSSSSK...
....KssK....
.....KK.....
KKKKKKKKKKKK
KwwwwwwwwwwK
KwKKKwwKKKwK
KwKUKwwKUKwK
KwKKKwwKKKwK
KvvvvvvvvvvK
KKKKKKKKKKKK`;

const BEACON = `
RR`;

/* ---------- goal: finish line ---------- */

const GATE = `
KKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
KWWKKWWKKWWKKWWKKWWKKWWKKWWKKK
KKKWWKKWWKKWWKKWWKKWWKKWWKKWWK
KKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
.KRK......................KRK.
.KRK......................KRK.
.KWK......................KWK.
.KWK......................KWK.
.KRK......................KRK.
.KRK......................KRK.
.KWK......................KWK.
.KWK......................KWK.
.KRK......................KRK.
.KRK......................KRK.
.KWK......................KWK.
.KWK......................KWK.
.KRK......................KRK.
KKKKK....................KKKKK`;

const FLAG_POLE = `
Y
K
K
K
K
K`;

const FLAG_A = `
RRRR.
RRRRR
RRRR.`;

const FLAG_B = `
RRR..
RRRRR
RRRRR`;

const PODIUM = `
.....KKKKKK.....
.....KYYYYK.....
.....KYyyYK.....
KKKKKKYYYYKKKKKK
KSSSSKYYYYKTTTTK
KSssSKYYYYKTttTK
KSSSSKYYYYKTTTTK
KKKKKKKKKKKKKKKK`;

/* ---------- language: signpost ---------- */

const SIGNPOST = `
......KKKK......
.....KUuGUK.....
.....KGGUuK.....
......KKKK......
.......Kb.......
..KKKKKKKKKKKK..
..KRRRRRRRRRRRK.
..KKKKKKKKKKKK..
.......Kb.......
.KKKKKKKKKKKK...
KYYYYYYYYYYYK...
.KKKKKKKKKKKK...
.......Kb.......
...KKKKKKKKKKKK.
...KCCCCCCCCCCCK
...KKKKKKKKKKKK.
.......Kb.......
.......Kb.......
.......Kb.......
......KKbK......`;

const FORK = `
.........TTTT.........
.......TTTTTTTT.......
....TTTTTt..tTTTTT....
.TTTTTt........tTTTTT.
TTTt..............tTTT`;

/* ---------- compositions ---------- */

export type Part = {
  /** ASCII art */
  a: string;
  /** position in art pixels */
  x: number;
  y: number;
  /** classes on the positioned wrapper (e.g. the ride that leaves when the stop is reached) */
  c?: string;
  /** classes on the drawing itself (e.g. a looping animation) */
  i?: string;
};
export type Fx = { k: "smoke" | "steam" | "confetti" | "burst"; x: number; y: number };
export type SceneDef = { w: number; h: number; parts: Part[]; fx?: Fx[] };

export type SceneName = "home" | "bike" | "cafe" | "fuel" | "bus" | "balloon" | "air" | "launch" | "finish" | "signpost";

export const SCENES: Record<SceneName, SceneDef> = {
  home: {
    w: 48, h: 24,
    parts: [
      { a: PINE, x: 1, y: 7 },
      { a: COTTAGE, x: 11, y: 4 },
      { a: FENCE, x: 0, y: 16 },
      { a: FENCE, x: 37, y: 16 },
      { a: MAILBOX, x: 40, y: 13 },
      { a: BUSH, x: 12, y: 20 },
      { a: PATH, x: 21, y: 20 },
      { a: FLOWERS, x: 2, y: 21 },
      { a: FLOWERS_B, x: 30, y: 21 },
      { a: FLOWERS, x: 42, y: 21 },
    ],
    fx: [{ k: "smoke", x: 30, y: 3 }],
  },
  bike: {
    w: 44, h: 23,
    parts: [
      { a: PINE, x: 34, y: 3 },
      { a: KIOSK, x: 0, y: 5 },
      { a: SIGN_BIKE, x: 20, y: 8 },
      { a: BUSH, x: 36, y: 17 },
      { a: BICYCLE, x: 27, y: 12, c: "sc-ride" },
      { a: FLOWERS, x: 3, y: 20 },
      { a: FLOWERS_B, x: 14, y: 20 },
    ],
  },
  cafe: {
    w: 44, h: 22,
    parts: [
      { a: PARASOL, x: 1, y: 4 },
      { a: STOOL_R, x: 1, y: 17 },
      { a: TABLE, x: 6, y: 15 },
      { a: CUP, x: 8, y: 13 },
      { a: STOOL_B, x: 15, y: 17 },
      { a: SCOOTER, x: 24, y: 9, c: "sc-ride" },
      { a: FLOWERS, x: 20, y: 19 },
    ],
    fx: [{ k: "steam", x: 9, y: 12 }],
  },
  fuel: {
    w: 42, h: 22,
    parts: [
      { a: CANOPY, x: 2, y: 0 },
      { a: LAMP, x: 10, y: 4, i: "sc-blink" },
      { a: LAMP, x: 30, y: 4, i: "sc-blink sc-late" },
      { a: PUMP, x: 7, y: 8 },
      { a: CAR, x: 19, y: 9, c: "sc-ride" },
      { a: FLOWERS_B, x: 0, y: 19 },
      { a: FLOWERS, x: 37, y: 19 },
    ],
  },
  bus: {
    w: 44, h: 22,
    parts: [
      { a: SHELTER, x: 0, y: 7 },
      { a: CAT, x: 7, y: 12 },
      { a: BUS_SIGN, x: 19, y: 6 },
      { a: BUS, x: 25, y: 8, c: "sc-ride" },
      { a: FLOWERS, x: 1, y: 19 },
      { a: FLOWERS_B, x: 13, y: 19 },
    ],
  },
  balloon: {
    w: 44, h: 25,
    parts: [
      { a: CLOUD, x: 0, y: 3, i: "sc-drift" },
      { a: CLOUD_S, x: 33, y: 8, i: "sc-drift sc-late" },
      { a: ROPE, x: 21, y: 14, c: "sc-ride sc-up" },
      { a: BALLOON, x: 15, y: 0, c: "sc-ride sc-up", i: "sc-bob" },
      { a: FLAME, x: 21, y: 9, c: "sc-ride sc-up", i: "sc-bob sc-flicker" },
      { a: PEG, x: 20, y: 19 },
      { a: SACK, x: 10, y: 18 },
      { a: SACK, x: 28, y: 18 },
      { a: BUSH, x: 1, y: 18 },
      { a: FLOWERS, x: 36, y: 19 },
    ],
  },
  air: {
    w: 48, h: 23,
    parts: [
      { a: HANGAR, x: 0, y: 7 },
      { a: POLE, x: 47, y: 4 },
      { a: SOCK_A, x: 39, y: 4, i: "sc-fa" },
      { a: SOCK_B, x: 39, y: 4, i: "sc-fb" },
      { a: STRIP, x: 20, y: 20 },
      { a: RUNWAY_LIGHT, x: 20, y: 19, i: "sc-blink" },
      { a: RUNWAY_LIGHT, x: 45, y: 19, i: "sc-blink sc-late" },
      { a: PLANE, x: 23, y: 10, c: "sc-ride sc-fly" },
    ],
  },
  launch: {
    w: 42, h: 28,
    parts: [
      { a: BEACON, x: 22, y: 3, i: "sc-blink" },
      { a: GANTRY, x: 20, y: 4 },
      { a: ARM, x: 16, y: 11 },
      { a: PAD, x: 6, y: 24 },
      { a: ROCKET, x: 10, y: 6, c: "sc-ride sc-up" },
      { a: HUT, x: 29, y: 15 },
      { a: BUSH, x: 0, y: 23 },
      { a: FLOWERS, x: 36, y: 25 },
    ],
    fx: [{ k: "steam", x: 9, y: 24 }, { k: "steam", x: 18, y: 24 }],
  },
  finish: {
    w: 44, h: 28,
    parts: [
      { a: FLAG_POLE, x: 8, y: 2 },
      { a: FLAG_A, x: 9, y: 2, i: "sc-fa" },
      { a: FLAG_B, x: 9, y: 2, i: "sc-fb" },
      { a: FLAG_POLE, x: 35, y: 2 },
      { a: FLAG_A, x: 36, y: 2, i: "sc-fb" },
      { a: FLAG_B, x: 36, y: 2, i: "sc-fa" },
      { a: GATE, x: 7, y: 8 },
      { a: PODIUM, x: 14, y: 18 },
      { a: FLOWERS, x: 1, y: 23 },
      { a: FLOWERS_B, x: 39, y: 23 },
    ],
    fx: [{ k: "burst", x: 4, y: 3 }, { k: "burst", x: 41, y: 1 }, { k: "confetti", x: 22, y: 6 }],
  },
  signpost: {
    w: 40, h: 25,
    parts: [
      { a: PINE, x: 30, y: 6 },
      { a: FORK, x: 9, y: 20 },
      { a: SIGNPOST, x: 12, y: 1 },
      { a: BUSH, x: 1, y: 17 },
      { a: FLOWERS, x: 4, y: 22 },
      { a: FLOWERS_B, x: 33, y: 21 },
    ],
  },
};
