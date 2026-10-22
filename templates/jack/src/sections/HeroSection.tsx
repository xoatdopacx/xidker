import { ContactButton } from "../components/Buttons";
import { FadeIn } from "../components/FadeIn";
import { Magnet } from "../components/Magnet";
import { HERO, NAV_LINKS } from "../data/content";

export function HeroSection() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative flex h-screen flex-col overflow-x-clip bg-ink"
    >
      <FadeIn
        as="nav"
        ariaLabel="Main navigation"
        className="relative z-20 flex justify-between px-6 pt-6 md:px-10 md:pt-8"
        delay={0}
        y={-20}
      >
        {NAV_LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="text-sm font-medium uppercase tracking-wider text-mist transition-opacity duration-200 hover:opacity-70 md:text-lg lg:text-[1.4rem]"
          >
            {link.label}
          </a>
        ))}
      </FadeIn>

      <div className="mt-6 overflow-hidden sm:mt-4 md:-mt-5">
        <FadeIn
          as="h1"
          id="hero-heading"
          delay={0.15}
          y={40}
          className="hero-heading w-full whitespace-nowrap text-center text-[14vw] font-black uppercase leading-none tracking-tight sm:text-[15vw] md:text-[16vw] lg:text-[17.5vw]"
        >
          {HERO.heading}
        </FadeIn>
      </div>

      <div className="relative z-20 mt-auto flex items-end justify-between gap-4 px-6 pb-7 sm:pb-8 md:px-10 md:pb-10">
        <FadeIn as="p" delay={0.35} y={20} className="max-w-[160px] text-[clamp(0.75rem,1.4vw,1.5rem)] font-light uppercase leading-snug tracking-wide text-mist sm:max-w-[220px] md:max-w-[260px]">
          {HERO.description}
        </FadeIn>
        <FadeIn delay={0.5} y={20} className="shrink-0">
          <ContactButton />
        </FadeIn>
      </div>

      <div className="absolute left-1/2 top-1/2 z-10 w-[280px] -translate-x-1/2 -translate-y-1/2 sm:bottom-0 sm:top-auto sm:w-[360px] sm:translate-y-0 md:w-[440px] lg:w-[520px]">
        <FadeIn delay={0.6} y={30}>
          <Magnet
            padding={150}
            strength={3}
            activeTransition="transform 0.3s ease-out"
            inactiveTransition="transform 0.6s ease-in-out"
          >
            <img
              src={HERO.portrait}
              alt="Jack"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              draggable={false}
              className="h-auto w-full select-none"
            />
          </Magnet>
        </FadeIn>
      </div>
    </section>
  );
}
