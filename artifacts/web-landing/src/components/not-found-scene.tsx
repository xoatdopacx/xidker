import catRider from "@/assets/cat-rider.png";
import { Scene } from "@/components/scenes";
import { Pine, Sunflower } from "@/components/sprites";

/**
 * The 404 scene in the card: a signpost by the road while a man riding a giant cat gallops past every few seconds.
 * Decorative; the page heading carries the message. Laid out left-to-right in every language.
 */
export function NotFoundScene() {
  return (
    <div className="nf select-none" dir="ltr" aria-hidden>
      <Scene name="signpost" className="absolute left-[2%] bottom-[52px]" />
      <Pine px={5} className="absolute right-[3%] bottom-[56px]" />
      <Sunflower px={4} className="absolute right-[24%] bottom-[56px] sway" />
      <div className="absolute inset-x-0 bottom-3 h-10 bg-[#33363d] border-y-4 border-[#6b6f78]">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px]" style={{ background: "repeating-linear-gradient(90deg,#e9e6d8 0 14px,transparent 14px 30px)" }} />
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
