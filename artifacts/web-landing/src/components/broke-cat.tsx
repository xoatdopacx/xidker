import brokeCat from "@/assets/broke-cat.png";
import { Sprite } from "@/components/sprites";

// Dusty brown wings: a pale moth disappears against the paper card.
const MOTH_PAL = { K: "#1b2a1c", W: "#b8a48c", w: "#7d6a55", B: "#46352a" };
const MOTH_UP = `
.KK...KK.
KWWK.KWWK
KWwWKWwWK
.KWWBWWK.
..KKBKK..
....K....`;
const MOTH_DOWN = `
.........
.........
.KKKKKKK.
KWWWBWWWK
KwWWBWWwK
.KKK.KKK.`;

/** The failed-payment meme: a pixel cat showing its empty wallet while a moth flutters out of it. */
export function BrokeCat({ label }: { label: string }) {
  return (
    <div className="bc select-none" role="img" aria-label={label}>
      <div className="bc-cat">
        <img src={brokeCat} alt="" width={240} height={222} draggable={false} className="pixel" />
      </div>
      <span className="bc-moth" aria-hidden>
        <Sprite art={MOTH_UP} palette={MOTH_PAL} px={3} className="bc-wing-a" />
        <Sprite art={MOTH_DOWN} palette={MOTH_PAL} px={3} className="bc-wing-b" />
      </span>
      <div className="bc-grass" />
    </div>
  );
}
