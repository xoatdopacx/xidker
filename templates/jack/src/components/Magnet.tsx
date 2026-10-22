import { useEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";

interface MagnetProps {
  children: ReactNode;
  padding?: number;
  strength?: number;
  activeTransition?: string;
  inactiveTransition?: string;
}

export function Magnet({
  children,
  padding = 150,
  strength = 3,
  activeTransition = "transform 0.3s ease-out",
  inactiveTransition = "transform 0.6s ease-in-out",
}: MagnetProps) {
  const areaRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const area = areaRef.current;
    const image = imageRef.current;
    if (!area || !image || reducedMotion) return;

    let frame = 0;
    let clientX = 0;
    let clientY = 0;

    const reset = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      image.style.transition = inactiveTransition;
      image.style.transform = "translate3d(0, 0, 0)";
    };

    const update = () => {
      frame = 0;
      const bounds = area.getBoundingClientRect();
      const x = clientX - bounds.left - bounds.width / 2;
      const y = clientY - bounds.top - bounds.height / 2;
      const active =
        Math.abs(x) < bounds.width / 2 + padding &&
        Math.abs(y) < bounds.height / 2 + padding;

      if (!active) {
        reset();
        return;
      }

      image.style.transition = activeTransition;
      image.style.transform = `translate3d(${x / strength}px, ${y / strength}px, 0)`;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      clientX = event.clientX;
      clientY = event.clientY;
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    const onPointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget) reset();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerout", onPointerOut, { passive: true });
    window.addEventListener("blur", reset);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerout", onPointerOut);
      window.removeEventListener("blur", reset);
      reset();
    };
  }, [
    padding,
    strength,
    activeTransition,
    inactiveTransition,
    reducedMotion,
  ]);

  return (
    <div ref={areaRef}>
      <div
        ref={imageRef}
        style={{
          willChange: reducedMotion ? "auto" : "transform",
          transition: inactiveTransition,
        }}
      >
        {children}
      </div>
    </div>
  );
}
