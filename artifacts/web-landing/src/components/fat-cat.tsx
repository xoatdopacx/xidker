import fatCat from "@/assets/fat-cat.png";
import { Sprite } from "@/components/sprites";

// Trophy gold, so the sparkles belong to the same "goal reached" family.
const SPARK_PAL = { K: "#6b4a10", G: "#f6c945", W: "#fff6c8" };
const SPARK_SMALL = `
.........
.........
....K....
...KGK...
..KGWGK..
...KGK...
....K....
.........
.........`;
const SPARK_BIG = `
....K....
...KGK...
...KGK...
.KKGWGKK.
KGGWWWGGK
.KKGWGKK.
...KGK...
...KGK...
....K....`;

const SPARKS = ["fc-sp1", "fc-sp2", "fc-sp3"];

/** The paid-order meme: a round, satisfied pixel cat hopping on a grass ledge while gold sparkles twinkle. Decorative. */
export function FatCat() {
  return (
    <div className="fc select-none" dir="ltr" aria-hidden>
      {SPARKS.map((c) => (
        <span key={c} className={`fc-sp ${c}`}>
          <Sprite art={SPARK_SMALL} palette={SPARK_PAL} px={3} className="fc-sp-s" />
          <Sprite art={SPARK_BIG} palette={SPARK_PAL} px={3} className="fc-sp-b" />
        </span>
      ))}
      <div className="fc-cat">
        <img src={fatCat} alt="" width={234} height={237} draggable={false} className="pixel" />
      </div>
      <div className="bc-grass" />
    </div>
  );
}
