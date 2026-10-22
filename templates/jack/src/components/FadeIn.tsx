import type { CSSProperties, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

const elements = {
  div: motion.create("div"),
  nav: motion.create("nav"),
  h1: motion.create("h1"),
  h2: motion.create("h2"),
  p: motion.create("p"),
  li: motion.create("li"),
};

interface FadeInProps {
  children: ReactNode;
  as?: keyof typeof elements;
  className?: string;
  style?: CSSProperties;
  id?: string;
  ariaLabel?: string;
  delay?: number;
  duration?: number;
  x?: number;
  y?: number;
}

export function FadeIn({
  children,
  as = "div",
  className,
  style,
  id,
  ariaLabel,
  delay = 0,
  duration = 0.7,
  x = 0,
  y = 30,
}: FadeInProps) {
  const Element = elements[as];
  const reducedMotion = useReducedMotion();

  return (
    <Element
      id={id}
      aria-label={ariaLabel}
      className={className}
      style={style}
      initial={reducedMotion ? false : { opacity: 0, x, y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "50px", amount: 0 }}
      transition={{
        delay: reducedMotion ? 0 : delay,
        duration: reducedMotion ? 0 : duration,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {children}
    </Element>
  );
}
