import type { CSSProperties } from "react";
import sleepingCat from "@/assets/sleeping-cat.png";
import { Scene, type SceneName } from "@/components/scenes";
import { Sprite } from "@/components/sprites";

const Z_PAL = { K: "#1b2a1c" };
const Z_ART = `
KKKK
..K.
.K..
KKKK`;

/** A spot in the strip of grass beside the card: `f` is how far across the strip (0 = screen edge, 1 = card edge)
 *  the item's centre sits, so an item narrower than the strip never reaches the card. */
type Spot = { side: "l" | "r"; f: number; top: string };
const at = ({ side, f, top }: Spot): CSSProperties => (
  side === "l" ? { left: `calc(var(--sf) * ${f})`, top, translate: "-50% 0" } : { right: `calc(var(--sf) * ${f})`, top, translate: "50% 0" }
);

/** [scene, spot, screens]: "wide" = beside the card from 1024px, "tablet" = the narrower strips of 768-1023px. */
const SPOTS: [SceneName, Spot, "wide" | "tablet"][] = [
  ["windmill", { side: "l", f: 0.28, top: "5%" }, "wide"],
  ["grove", { side: "l", f: 0.72, top: "11%" }, "wide"],
  ["meadow", { side: "l", f: 0.2, top: "31%" }, "wide"],
  ["blooms", { side: "l", f: 0.88, top: "33%" }, "wide"],
  ["pond", { side: "l", f: 0.5, top: "42%" }, "wide"],
  ["blooms", { side: "l", f: 0.14, top: "57%" }, "wide"],
  ["meadow", { side: "l", f: 0.78, top: "62%" }, "wide"],
  ["camp", { side: "r", f: 0.42, top: "7%" }, "wide"],
  ["blooms", { side: "r", f: 0.12, top: "27%" }, "wide"],
  ["grove", { side: "r", f: 0.8, top: "26%" }, "wide"],
  ["bees", { side: "r", f: 0.36, top: "44%" }, "wide"],
  ["meadow", { side: "r", f: 0.82, top: "58%" }, "wide"],
  ["garden", { side: "r", f: 0.5, top: "70%" }, "wide"],
  ["meadow", { side: "r", f: 0.86, top: "85%" }, "wide"],
  ["windmill", { side: "l", f: 0.5, top: "6%" }, "tablet"],
  ["meadow", { side: "l", f: 0.5, top: "34%" }, "tablet"],
  ["grove", { side: "l", f: 0.5, top: "56%" }, "tablet"],
  ["grove", { side: "r", f: 0.5, top: "12%" }, "tablet"],
  ["bees", { side: "r", f: 0.5, top: "40%" }, "tablet"],
  ["blooms", { side: "r", f: 0.5, top: "64%" }, "tablet"],
];

/**
 * The meadow around the 404 card. The sleeping cat naps in its bed in the bottom-left corner on every screen (below
 * the card on narrow ones, where the page leaves room for it), with hay bales in the opposite corner; wider screens
 * add trees, flowers and little places from the road world on both sides. Decorative only. Physical left/right, so
 * right-to-left pages keep the same picture.
 */
export function NotFoundMeadow() {
  return (
    <div className="nf-meadow" dir="ltr" aria-hidden>
      {SPOTS.map(([name, spot, screens], i) => (
        <Scene key={i} name={name} className={`absolute hidden ${screens === "wide" ? "lg:block" : "md:block lg:hidden"}`} style={at(spot)} />
      ))}
      <div className="nf-corner nf-corner-l">
        <Scene name="bedside" />
        <div className="nf-bed">
          <img src={sleepingCat} alt="" width={54} height={39} draggable={false} className="pixel" />
          <span className="nf-z nf-z1"><Sprite art={Z_ART} palette={Z_PAL} px={2} /></span>
          <span className="nf-z nf-z2"><Sprite art={Z_ART} palette={Z_PAL} px={3} /></span>
          <span className="nf-z nf-z3"><Sprite art={Z_ART} palette={Z_PAL} px={2} /></span>
        </div>
      </div>
      <Scene name="harvest" className="nf-corner nf-corner-r" />
    </div>
  );
}
