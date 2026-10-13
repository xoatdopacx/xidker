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

/* ---------- little extras along the way (wider screens) ---------- */

const POND = `
.......cccccccccccc.......
....cccCCCCCCCCCCCCccc....
..ccCCCCCCUUUCCCCCCCCCcc..
.cCCCCCCCCCCCCCCCUUUCCCCc.
cCCCCUUUCCCCCCCCCCCCCCCCCc
.uCCCCCCCCCCCCCCCCCCCCCCu.
..uuCCCCCCCCCCCCCCCCCCuu..
....uuuuuuuuuuuuuuuuuu....`;

const DUCK = `
.....WW.
....WWKO
.....WW.
WW..WWW.
WWWWWWW.
.vvvvv..`;

const DUCKLING = `
..YO
YYYY
.YY.`;

const REEDS = `
.b...
.b.b.
.G.b.
.G.G.
GG.GG
.GGG.
.G.G.
.GGG.`;

const LILY = `
.M..
GGGG
.GL.`;

const ROCK = `
.SS.
SSSs
.ss.`;

const BARN = `
........KKKKKK........
......KKrrrrrrKK......
....KKrrrrrrrrrrKK....
...KrrrrrrrrrrrrrrK...
..KrrrrrrKKKKrrrrrrK..
.KrrrrrrrKTTKrrrrrrrK.
KKKKKKKKKKKKKKKKKKKKKK
.KRRRRRRRRRRRRRRRRRRK.
.KRRRRRRRRRRRRRRRRRRK.
.KRRRRWWWWWWWWWWRRRRK.
.KRRRRWWRRRRRRWWRRRRK.
.KRRRRWRWRRRRWRWRRRRK.
.KRRRRWRRWRRWRRWRRRRK.
.KRRRRWRRRWWRRRWRRRRK.
.KRRRRWRRWRRWRRWRRRRK.
.KRRRRWRWRRRRWRWRRRRK.
.KRRRRWWRRRRRRWWRRRRK.
.KKKKKKKKKKKKKKKKKKKK.`;

const COW = `
..ww...........
.wWWw..........
.WKW.WWWWWWWW..
MMWWWKKWWWKKWWb
MMWWWKKWWWWWWWb
..WWWWWWWWWWWW.
..W.W...MM.W.W.
..K.K......K.K.`;

const HAY = `
.TTTT.
TtTTtT
TTTTTT
tttttt`;

const MILL = `
......KK......
.....KrrK.....
....KrrrrK....
...KrrrrrrK...
...KKKKKKKK...
...KwwwwwvK...
...KwwwwwvK...
..KwwKKwwwvK..
..KwwKUKwwvK..
..KwwKKwwwvK..
..KwwwwwwwvK..
.KwwwwwwwwwvK.
.KwwwwKKKwwvK.
.KwwwKBBBKwvK.
.KwwwKBBBKwvK.
KwwwwKBYBKwwvK
KwwwwKBBBKwwvK
KKKKKKKKKKKKKK`;

const SAILS_A = `
........KKK........
........KwK........
........KwK........
........KvK........
........KwK........
........KwK........
........KvK........
........KwK........
KKKKKKKKbbbKKKKKKKK
KwwvwwvwbYbwvwwvwwK
KKKKKKKKbbbKKKKKKKK
........KwK........
........KvK........
........KwK........
........KwK........
........KvK........
........KwK........
........KwK........
........KKK........`;

const SAILS_B = `
KK...............KK
KwK.............KwK
.KwK...........KwK.
..KwK.........KwK..
...KvK.......KvK...
....KwK.....KwK....
.....KwK...KwK.....
......KvK.KvK......
.......KbbbK.......
........bYb........
.......KbbbK.......
......KvK.KvK......
.....KwK...KwK.....
....KwK.....KwK....
...KvK.......KvK...
..KwK.........KwK..
.KwK...........KwK.
KwK.............KwK
KK...............KK`;

const TENT = `
.......KK.......
......KOOK......
.....KOOOyK.....
....KOOOKyyK....
...KOOOKAKyyK...
..KOOOKAAAKyyK..
.KOOOOKAAAKyyyK.
KOOOOKAAAAAKyyyK
KKKKKKKKKKKKKKKK`;

const FIRE_A = `
..O..
.OYO.
.OYR.
ROYOR
.RYR.`;

const FIRE_B = `
.O...
.OO..
.OYO.
OYYOR
.RYR.`;

const LOGS = `
BB...BB
.bBBBb.
bb...bb`;

const SKEP = `
...KKKK...
..KTTTTK..
.KttttttK.
.KTTTTTTK.
KttttttttK
KTTTTTTTTK
KtttKKtttK
KKKKKKKKKK
bBBBBBBBBb
.b......b.
.b......b.`;

const BEES_A = `
.W.......
YKY......
......W..
.....YKY.
..W......
.YKY.....`;

const BEES_B = `
..W......
.YKY.....
.......W.
......YKY
.W.......
YKY......`;

const TALL_FLOWER = `
.Y.
YbY
.Y.
.G.
GG.
.G.`;

const UMBRELLA = `
......KKK......
....KKMWMKK....
...KMMWWWMMK...
..KWMMWWWMMWK..
.KWWMMWWWMMWWK.
KWWWMMWWWMMWWWK
KKKKKKKKKKKKKKK`;

const STICK = `
s
s
s
s
s`;

const CART = `
bKKKKKKKKKKKKKKK.
bKwwwwwwMMwwwwwvK
.KwwwwwwTTwwwwwvK
.KwwwwwwwTwwwwwvK
.KMMMMMMMMMMMMMMK
.KKKKKKKKKKKKKKKK
...KsK.....KsK...
..KsSsK...KsSsK..
...KKK.....KKK...`;

const SCARECROW = `
....bbb....
...bbbbb...
..bbbbbbb..
....TTT....
....KTK....
....TTT....
YRrRRRRRrRY
...RrRrR...
...RRrRR...
...CCCCC...
...CC.CC...
.....b.....
.....b.....
.....b.....
.....b.....`;

const CROW = `
.KK.
KKKY
.K..`;

const CROPS = `
.LL...LL...LL....
LGGL.LGGL.LGGL...
BBBBBBBBBBBBBBBB.
bbbbbbbbbbbbbbbb.
..G.G...G.G...G.G
..O.O...O.O...O.O
.BBBBBBBBBBBBBBBB`;

const WATER = `
..cccccccccccccccccccccccc..
.cCCCCCCCCCCCCCCCCCCCCCCCCc.
cCCCUUCCCCCCCCCCCCCCCCCCCCCc
CCCCCCCCCCCCCCUUUCCCCCCCCCCC
CCCCCCCCCCCCCCCCCCCCCCCUUCCC
uCCCCCCUUCCCCCCCCCCCCCCCCCCu
.uuCCCCCCCCCCCCCCCCCCCCCCuu.
...uuuuuuuuuuuuuuuuuuuuuu...`;

const DOCK = `
TTTTTTTTTTTTTTTT
tTtTtTtTtTtTtTtT
BBBBBBBBBBBBBBBB
.b...b....b...b.
.b...b....b...b.
.u...u....u...u.`;

const ROD = `
........b
.......bs
......b.s
.....b..s
....b...s
...b....s
..b.....R
.b......W`;

const BUCKET = `
s...s
KSSSK
KSSSK
.KKK.`;

const CONE = `
..O..
..O..
.WWW.
.OOO.
OWWWO
KKKKK`;

const BARRIER = `
KKKKKKKKKKKKKK
KRRWWRRWWRRWWK
KRWWRRWWRRWWRK
KKKKKKKKKKKKKK
.s..........s.
.s..........s.
sss........sss`;

const WARN = `
.Y.
YOY
.K.`;

const WORK_SIGN = `
...K...
..KYK..
.KYKYK.
.KYKYK.
KYYYYYK
KYYKYYK
KKKKKKK
...s...
...s...
..sss..`;

const SAND = `
...TTTT...
..TTTtTT..
.TTtTTTTt.
TTTTTTtTTT`;

const SHOVEL = `
bbb
.b.
.b.
.b.
.b.
.b.
SSS`;

/* ---------- compositions ---------- */

export type Part = {
  /** ASCII art */
  a: string;
  /** position in art pixels */
  x: number;
  y: number;
  /** classes on the positioned wrapper. At a stop, `sc-take` is the parked ride the traveller takes and
   *  `sc-left` the ride she arrives on and leaves in its place (shown once the stop is reached). */
  c?: string;
  /** classes on the drawing itself (e.g. a looping animation) */
  i?: string;
};
export type Fx = { k: "smoke" | "steam" | "confetti" | "burst"; x: number; y: number; c?: string };
/** `swap`: centre of the dust cloud (art pixels) when the rides change places. */
export type SceneDef = { w: number; h: number; parts: Part[]; fx?: Fx[]; swap?: { x: number; y: number } };

export type SceneName = "home" | "bike" | "cafe" | "fuel" | "bus" | "balloon" | "air" | "launch" | "finish" | "signpost"
  | "pond" | "farm" | "windmill" | "camp" | "bees" | "icecream" | "garden" | "dock" | "works";

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
      { a: BICYCLE, x: 27, y: 12, c: "sc-take" },
      { a: FLOWERS, x: 3, y: 20 },
      { a: FLOWERS_B, x: 14, y: 20 },
    ],
    swap: { x: 35, y: 16 },
  },
  cafe: {
    w: 44, h: 22,
    parts: [
      { a: PARASOL, x: 1, y: 4 },
      { a: STOOL_R, x: 1, y: 17 },
      { a: TABLE, x: 6, y: 15 },
      { a: CUP, x: 8, y: 13 },
      { a: STOOL_B, x: 15, y: 17 },
      { a: SCOOTER, x: 24, y: 9, c: "sc-take" },
      { a: BICYCLE, x: 25, y: 12, c: "sc-left" },
      { a: FLOWERS, x: 20, y: 19 },
    ],
    fx: [{ k: "steam", x: 9, y: 12 }],
    swap: { x: 33, y: 15 },
  },
  fuel: {
    w: 42, h: 22,
    parts: [
      { a: CANOPY, x: 2, y: 0 },
      { a: LAMP, x: 10, y: 4, i: "sc-blink" },
      { a: LAMP, x: 30, y: 4, i: "sc-blink sc-late" },
      { a: PUMP, x: 7, y: 8 },
      { a: CAR, x: 19, y: 9, c: "sc-take" },
      { a: SCOOTER, x: 19, y: 9, c: "sc-left" },
      { a: FLOWERS_B, x: 0, y: 19 },
      { a: FLOWERS, x: 37, y: 19 },
    ],
    swap: { x: 28, y: 14 },
  },
  bus: {
    w: 44, h: 22,
    parts: [
      { a: SHELTER, x: 0, y: 7 },
      { a: CAT, x: 7, y: 12 },
      { a: BUS_SIGN, x: 19, y: 6 },
      { a: BUS, x: 25, y: 8, c: "sc-take" },
      { a: CAR, x: 25, y: 9, c: "sc-left" },
      { a: FLOWERS, x: 1, y: 19 },
      { a: FLOWERS_B, x: 13, y: 19 },
    ],
    swap: { x: 34, y: 14 },
  },
  balloon: {
    w: 44, h: 25,
    parts: [
      { a: CLOUD, x: 0, y: 3, i: "sc-drift" },
      { a: CLOUD_S, x: 33, y: 8, i: "sc-drift sc-late" },
      { a: ROPE, x: 21, y: 14, c: "sc-take" },
      { a: BALLOON, x: 15, y: 0, c: "sc-take", i: "sc-bob" },
      { a: FLAME, x: 21, y: 9, c: "sc-take", i: "sc-bob sc-flicker" },
      { a: PEG, x: 20, y: 19 },
      { a: SACK, x: 10, y: 18 },
      { a: SACK, x: 28, y: 18 },
      { a: BUS, x: 13, y: 9, c: "sc-left" },
      { a: BUSH, x: 1, y: 18 },
      { a: FLOWERS, x: 36, y: 19 },
    ],
    swap: { x: 22, y: 13 },
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
      { a: PLANE, x: 23, y: 10, c: "sc-take" },
      { a: BALLOON, x: 26, y: 5, c: "sc-left" },
    ],
    swap: { x: 33, y: 13 },
  },
  launch: {
    w: 42, h: 28,
    parts: [
      { a: BEACON, x: 22, y: 3, i: "sc-blink" },
      { a: GANTRY, x: 20, y: 4 },
      { a: ARM, x: 16, y: 11 },
      { a: PAD, x: 6, y: 24 },
      { a: ROCKET, x: 10, y: 6, c: "sc-take" },
      { a: PLANE, x: 0, y: 14, c: "sc-left" },
      { a: HUT, x: 29, y: 15 },
      { a: BUSH, x: 0, y: 23 },
      { a: FLOWERS, x: 36, y: 25 },
    ],
    fx: [{ k: "steam", x: 9, y: 24, c: "sc-take" }, { k: "steam", x: 18, y: 24, c: "sc-take" }],
    swap: { x: 12, y: 16 },
  },
  finish: {
    w: 50, h: 28,
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
      { a: FLOWERS_B, x: 45, y: 23 },
      { a: ROCKET, x: 36, y: 8, c: "sc-left" },
    ],
    fx: [{ k: "burst", x: 4, y: 3 }, { k: "burst", x: 44, y: 1 }, { k: "confetti", x: 22, y: 6 }],
    swap: { x: 40, y: 17 },
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

  /* little extras beside the road on wider screens */
  pond: {
    w: 34, h: 14,
    parts: [
      { a: POND, x: 4, y: 5 },
      { a: LILY, x: 8, y: 9 },
      { a: DUCK, x: 15, y: 4, i: "sc-bob" },
      { a: DUCKLING, x: 25, y: 7, i: "sc-bob sc-late" },
      { a: REEDS, x: 0, y: 3 },
      { a: ROCK, x: 29, y: 10 },
      { a: FLOWERS, x: 29, y: 2 },
    ],
  },
  farm: {
    w: 42, h: 18,
    parts: [
      { a: BARN, x: 0, y: 0 },
      { a: FENCE, x: 29, y: 9 },
      { a: HAY, x: 22, y: 14 },
      { a: COW, x: 26, y: 10 },
      { a: FLOWERS_B, x: 37, y: 15 },
    ],
  },
  windmill: {
    w: 26, h: 28,
    parts: [
      { a: MILL, x: 6, y: 10 },
      { a: SAILS_A, x: 4, y: 5, i: "sc-fa" },
      { a: SAILS_B, x: 4, y: 5, i: "sc-fb" },
      { a: BUSH, x: 18, y: 24 },
      { a: FLOWERS, x: 0, y: 25 },
    ],
  },
  camp: {
    w: 34, h: 14,
    parts: [
      { a: PINE, x: 25, y: 0 },
      { a: TENT, x: 0, y: 4 },
      { a: LOGS, x: 18, y: 10 },
      { a: FIRE_A, x: 19, y: 6, i: "sc-fa" },
      { a: FIRE_B, x: 19, y: 6, i: "sc-fb" },
    ],
    fx: [{ k: "smoke", x: 21, y: 4 }],
  },
  bees: {
    w: 26, h: 15,
    parts: [
      { a: SKEP, x: 1, y: 4 },
      { a: BEES_A, x: 11, y: 0, i: "sc-fa" },
      { a: BEES_B, x: 11, y: 0, i: "sc-fb" },
      { a: TALL_FLOWER, x: 15, y: 7 },
      { a: TALL_FLOWER, x: 21, y: 8 },
      { a: FLOWERS, x: 13, y: 12 },
      { a: FLOWERS_B, x: 19, y: 12 },
    ],
  },
  icecream: {
    w: 24, h: 21,
    parts: [
      { a: UMBRELLA, x: 1, y: 0 },
      { a: STICK, x: 8, y: 7 },
      { a: CART, x: 0, y: 12 },
      { a: FLOWERS_B, x: 19, y: 18 },
    ],
  },
  garden: {
    w: 31, h: 15,
    parts: [
      { a: SCARECROW, x: 1, y: 0 },
      { a: CROW, x: 9, y: 3 },
      { a: CROPS, x: 13, y: 7 },
      { a: FLOWERS, x: 26, y: 2 },
    ],
  },
  dock: {
    w: 36, h: 14,
    parts: [
      { a: WATER, x: 7, y: 6 },
      { a: DOCK, x: 0, y: 7 },
      { a: BUCKET, x: 3, y: 4 },
      { a: CAT, x: 9, y: 5 },
      { a: ROD, x: 13, y: 0 },
      { a: REEDS, x: 31, y: 3 },
    ],
  },
  works: {
    w: 42, h: 13,
    parts: [
      { a: CONE, x: 0, y: 6 },
      { a: WORK_SIGN, x: 5, y: 2 },
      { a: BARRIER, x: 12, y: 5 },
      { a: WARN, x: 13, y: 2, i: "sc-blink" },
      { a: WARN, x: 22, y: 2, i: "sc-blink sc-late" },
      { a: CONE, x: 27, y: 6 },
      { a: SHOVEL, x: 35, y: 2 },
      { a: SAND, x: 32, y: 8 },
    ],
  },
};

/** Clouds drifting over the whole page (Clouds in pages/home.tsx): light top, pale-blue underside. */
export const CLOUD_ARTS: string[] = [
`
........WWWW..........
.....WWWWWWWWW..WW....
...WWWWWWWWWWWWWWWWW..
.WWWWWWWWWWWWWWWWWWWW.
WWWWWWWWWWWWWWWWWWWWWW
WWWWWWWWWWWWWWWWWWWWWW
.UUUUUUUUUUUUUUUUUUUU.
...UUUUUUUUUUUUUUUU...`,
`
.....WWWW......
...WWWWWWWW.W..
.WWWWWWWWWWWWW.
WWWWWWWWWWWWWWW
.UUUUUUUUUUUUU.
...UUUUUUUUU...`,
`
...........WWWWW..............
.......WWWWWWWWWWW...WWW......
.....WWWWWWWWWWWWWWWWWWWWW....
...WWWWWWWWWWWWWWWWWWWWWWWWW..
.WWWWWWWWWWWWWWWWWWWWWWWWWWWWW
WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW
WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW
.UUUUUUUUUUUUUUUUUUUUUUUUUUUU.
....UUUUUUUUUUUUUUUUUUUUUUU...`,
];
