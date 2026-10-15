import sleepingCat from "@/assets/sleeping-cat.png";
import catRider from "@/assets/cat-rider.png";
import { Sprite, Pine, Sunflower } from "@/components/sprites";

const Z_PAL = { K: "#1b2a1c" };
const Z_ART = `
KKKK
..K.
.K..
KKKK`;

/**
 * The 404 scene: a cat asleep in its bed at the roadside while a man riding a giant cat gallops past every few
 * seconds. Decorative; the page heading carries the message. Laid out left-to-right in every language.
 */
export function NotFoundScene() {
  return (
    <div className="nf select-none" dir="ltr" aria-hidden>
      <Pine px={5} className="absolute right-[3%] bottom-[56px]" />
      <Sunflower px={4} className="absolute right-[24%] bottom-[56px] sway" />
      <div className="absolute inset-x-0 bottom-3 h-10 bg-[#33363d] border-y-4 border-[#6b6f78]">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px]" style={{ background: "repeating-linear-gradient(90deg,#e9e6d8 0 14px,transparent 14px 30px)" }} />
      </div>
      <div className="nf-bed">
        <img src={sleepingCat} alt="" width={162} height={117} draggable={false} className="pixel" />
        <span className="nf-z nf-z1"><Sprite art={Z_ART} palette={Z_PAL} px={2} /></span>
        <span className="nf-z nf-z2"><Sprite art={Z_ART} palette={Z_PAL} px={3} /></span>
        <span className="nf-z nf-z3"><Sprite art={Z_ART} palette={Z_PAL} px={2} /></span>
      </div>
      <div className="nf-track">
        <div className="nf-rider">
          <i className="nf-shadow" />
          <img src={catRider} alt="" width={972} height={183} draggable={false} className="pixel" />
        </div>
      </div>
    </div>
  );
}
