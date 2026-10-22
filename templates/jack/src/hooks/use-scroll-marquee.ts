import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

/** Scroll-linked transforms are written once per frame, without React rerenders. */
export function useScrollMarquee() {
  const sectionRef = useRef<HTMLElement>(null);
  const firstTrackRef = useRef<HTMLDivElement>(null);
  const secondTrackRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const section = sectionRef.current;
    const firstTrack = firstTrackRef.current;
    const secondTrack = secondTrackRef.current;
    if (!section || !firstTrack || !secondTrack) return;

    let frame = 0;
    let sectionTop = section.getBoundingClientRect().top + window.scrollY;

    const update = () => {
      frame = 0;
      const offset =
        (window.scrollY - sectionTop + window.innerHeight) * 0.3;
      const translation = reducedMotion ? 0 : offset - 200;
      firstTrack.style.transform = `translateX(${translation}px)`;
      secondTrack.style.transform = `translateX(${-translation}px)`;
    };

    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    const onResize = () => {
      sectionTop = section.getBoundingClientRect().top + window.scrollY;
      scheduleUpdate();
    };

    update();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", onResize);
    };
  }, [reducedMotion]);

  return { sectionRef, firstTrackRef, secondTrackRef };
}
