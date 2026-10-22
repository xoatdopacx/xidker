import { AnimatedText } from "../components/AnimatedText";
import { ContactButton } from "../components/Buttons";
import { FadeIn } from "../components/FadeIn";
import { ABOUT_TEXT, DECORATIVE_IMAGES, LABELS } from "../data/content";

export function AboutSection() {
  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="relative flex min-h-screen items-center justify-center bg-ink px-5 py-20 sm:px-8 md:px-10"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {DECORATIVE_IMAGES.map((image) => (
          <FadeIn
            key={image.src}
            className={image.className}
            delay={image.delay}
            x={image.x}
            y={0}
            duration={0.9}
          >
            <img
              src={image.src}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-auto w-full"
            />
          </FadeIn>
        ))}
      </div>

      <div className="relative z-10 flex w-full flex-col items-center gap-16 sm:gap-20 md:gap-24">
        <div className="flex w-full flex-col items-center gap-10 sm:gap-14 md:gap-16">
          <FadeIn
            as="h2"
            id="about-heading"
            delay={0}
            y={40}
            className="hero-heading text-center text-[clamp(3rem,12vw,160px)] font-black uppercase leading-none tracking-tight"
          >
            {LABELS.about}
          </FadeIn>
          <AnimatedText text={ABOUT_TEXT} />
        </div>
        <ContactButton />
      </div>
    </section>
  );
}
