import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";

interface CharacterProps {
  character: string;
  index: number;
  total: number;
  progress: MotionValue<number>;
  reducedMotion: boolean;
}

function Character({
  character,
  index,
  total,
  progress,
  reducedMotion,
}: CharacterProps) {
  const opacity = useTransform(
    progress,
    [index / total, (index + 1) / total],
    [0.2, 1],
  );

  return (
    <span className="relative inline-block">
      <span className="invisible">{character}</span>
      <motion.span
        className="absolute inset-0"
        style={{ opacity: reducedMotion ? 1 : opacity }}
      >
        {character}
      </motion.span>
    </span>
  );
}

export function AnimatedText({ text }: { text: string }) {
  const paragraphRef = useRef<HTMLParagraphElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: paragraphRef,
    offset: ["start 0.8", "end 0.2"],
  });
  let characterIndex = 0;

  return (
    <p
      ref={paragraphRef}
      className="max-w-[560px] text-center text-[clamp(1rem,2vw,1.35rem)] font-medium leading-relaxed text-mist"
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.split(/(\s+)/).map((word, wordIndex) => {
          if (/^\s+$/.test(word)) {
            characterIndex += word.length;
            return <span key={wordIndex}>{word}</span>;
          }

          return (
            <span className="inline-block whitespace-nowrap" key={wordIndex}>
              {Array.from(word).map((character) => {
                const index = characterIndex++;
                return (
                  <Character
                    key={index}
                    character={character}
                    index={index}
                    total={text.length}
                    progress={scrollYProgress}
                    reducedMotion={Boolean(reducedMotion)}
                  />
                );
              })}
            </span>
          );
        })}
      </span>
    </p>
  );
}
