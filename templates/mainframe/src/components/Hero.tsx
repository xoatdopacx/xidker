import { GREETING, INTRO_LINES } from '../content';
import { useTypewriter } from '../hooks/useTypewriter';
import { ActionPills } from './ActionPills';

export function Hero() {
  const { displayed, done } = useTypewriter(GREETING);

  return (
    <main className="hero relative z-[1] flex h-screen flex-col justify-end overflow-hidden px-5 pb-12 sm:px-8 md:justify-center md:px-10 md:pb-0">
      <div className="relative z-10 max-w-xl">
        <div className="intro-label pointer-events-none mb-5 select-none sm:mb-6">
          {INTRO_LINES[0]}
          <br />
          {INTRO_LINES[1]}
        </div>
        <p className="typewriter-text mb-5 text-white sm:mb-6" aria-label={GREETING}>
          <span aria-hidden="true">
            {displayed}
            {!done && (
              <span className="typewriter-cursor ml-[2px] inline-block h-[1.1em] w-[2px] bg-white align-middle" />
            )}
          </span>
        </p>
        <ActionPills />
      </div>
    </main>
  );
}
