import { MARQUEE_IMAGES } from "../data/content";
import { useScrollMarquee } from "../hooks/use-scroll-marquee";

const firstRow = MARQUEE_IMAGES.slice(0, 11);
const secondRow = MARQUEE_IMAGES.slice(11);
const repeat = (images: readonly string[]) => [...images, ...images, ...images];

export function MarqueeSection() {
  const { sectionRef, firstTrackRef, secondTrackRef } = useScrollMarquee();

  return (
    <section
      ref={sectionRef}
      aria-label="Selected motion work"
      className="overflow-x-clip bg-ink pb-10 pt-24 sm:pt-32 md:pt-40"
    >
      <div className="flex flex-col gap-3">
        <div
          ref={firstTrackRef}
          className="marquee-track"
          style={{ marginLeft: -(firstRow.length * (420 + 12)) }}
        >
          {repeat(firstRow).map((src, index) => (
            <img
              key={`${src}-${index}`}
              src={src}
              alt=""
              aria-hidden="true"
              width={420}
              height={270}
              loading="lazy"
              decoding="async"
              draggable={false}
              className="h-[270px] w-[420px] max-w-none shrink-0 rounded-2xl object-cover"
            />
          ))}
        </div>
        <div
          ref={secondTrackRef}
          className="marquee-track"
          style={{ marginLeft: -(secondRow.length * (420 + 12)) }}
        >
          {repeat(secondRow).map((src, index) => (
            <img
              key={`${src}-${index}`}
              src={src}
              alt=""
              aria-hidden="true"
              width={420}
              height={270}
              loading="lazy"
              decoding="async"
              draggable={false}
              className="h-[270px] w-[420px] max-w-none shrink-0 rounded-2xl object-cover"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
