import { FadeIn } from "../components/FadeIn";
import { LABELS, SERVICES } from "../data/content";

export function ServicesSection() {
  return (
    <section
      id="services"
      aria-labelledby="services-heading"
      className="relative rounded-t-[40px] bg-white px-5 py-20 text-ink sm:rounded-t-[50px] sm:px-8 sm:py-24 md:rounded-t-[60px] md:px-10 md:py-32"
    >
      <FadeIn
        as="h2"
        id="services-heading"
        y={40}
        className="mb-16 text-center text-[clamp(3rem,12vw,160px)] font-black uppercase leading-none tracking-tight sm:mb-20 md:mb-28"
      >
        {LABELS.services}
      </FadeIn>
      <ol className="mx-auto max-w-5xl list-none divide-y divide-ink/[0.15]">
        {SERVICES.map((service, index) => (
          <FadeIn
            as="li"
            key={service.number}
            delay={index * 0.1}
            className="flex items-start gap-6 py-8 sm:gap-10 sm:py-10 md:gap-16 md:py-12"
          >
            <span className="w-[1.5em] shrink-0 text-[clamp(3rem,10vw,140px)] font-black leading-none text-ink">
              {service.number}
            </span>
            <div className="flex min-w-0 flex-col gap-2 sm:gap-3">
              <h3 className="text-[clamp(1rem,2.2vw,2.1rem)] font-medium uppercase leading-tight">
                {service.name}
              </h3>
              <p className="max-w-2xl text-[clamp(0.85rem,1.6vw,1.25rem)] font-light leading-relaxed opacity-60">
                {service.description}
              </p>
            </div>
          </FadeIn>
        ))}
      </ol>
    </section>
  );
}
