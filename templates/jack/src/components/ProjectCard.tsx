import { motion, useReducedMotion, useTransform, type MotionValue } from "framer-motion";
import type { Project } from "../data/content";
import { LiveProjectButton } from "./Buttons";

interface ProjectCardProps {
  project: Project;
  index: number;
  totalCards: number;
  progress: MotionValue<number>;
}

export function ProjectCard({
  project,
  index,
  totalCards,
  progress,
}: ProjectCardProps) {
  const reducedMotion = useReducedMotion();
  const targetScale = 1 - (totalCards - 1 - index) * 0.03;
  const scale = useTransform(progress, [index / totalCards, 1], [1, targetScale]);
  const imageClass =
    "w-full rounded-[40px] object-cover sm:rounded-[50px] md:rounded-[60px]";

  return (
    <div className="sticky top-24 flex h-[85vh] items-start justify-center md:top-32">
      <motion.article
        aria-labelledby={`project-title-${project.number}`}
        className="relative w-full origin-top rounded-[40px] border-2 border-mist bg-ink p-4 sm:rounded-[50px] sm:p-6 md:rounded-[60px] md:p-8"
        style={{ scale: reducedMotion ? 1 : scale, top: index * 28 }}
      >
        <div className="mb-6 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-4 sm:gap-x-6 md:mb-8 md:grid-cols-[auto_1fr_auto] md:gap-x-10">
          <span className="text-[clamp(3rem,10vw,140px)] font-black leading-none text-mist">
            {project.number}
          </span>
          <div className="min-w-0">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-mist/60 sm:text-sm md:mb-2 md:text-base">
              {project.category}
            </p>
            <h3
              id={`project-title-${project.number}`}
              className="text-[clamp(1rem,2.5vw,2.25rem)] font-medium uppercase leading-tight text-mist"
            >
              {project.name}
            </h3>
          </div>
          <div className="col-span-2 justify-self-end md:col-span-1">
            <LiveProjectButton href={project.href} projectName={project.name} />
          </div>
        </div>
        <div className="project-image-grid">
          <div className="flex min-w-0 flex-col gap-3">
            <img
              src={project.images[0]}
              alt={`${project.name} — detail one`}
              loading="lazy"
              decoding="async"
              className={`${imageClass} project-image-top`}
            />
            <img
              src={project.images[1]}
              alt={`${project.name} — detail two`}
              loading="lazy"
              decoding="async"
              className={`${imageClass} project-image-bottom`}
            />
          </div>
          <div className="relative min-h-0 min-w-0">
            <img
              src={project.images[2]}
              alt={`${project.name} — main artwork`}
              loading="lazy"
              decoding="async"
              className={`${imageClass} absolute inset-0 h-full`}
            />
          </div>
        </div>
      </motion.article>
    </div>
  );
}
