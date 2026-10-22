import { Fragment, useEffect, useRef, useState } from 'react';
import { BRAND, CONTACT_LINK, NAV_LINKS } from '../content';

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const mobileNavRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const breakpoint = window.matchMedia('(min-width: 768px)');
    const onBreakpoint = () => {
      if (breakpoint.matches) setMenuOpen(false);
    };
    breakpoint.addEventListener('change', onBreakpoint);
    return () => breakpoint.removeEventListener('change', onBreakpoint);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        toggleRef.current?.focus();
        return;
      }

      if (event.key !== 'Tab') return;
      const links = mobileNavRef.current?.querySelectorAll<HTMLAnchorElement>('a');
      if (!links?.length) return;

      const first = toggleRef.current;
      const last = links[links.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-4 sm:px-8 sm:py-5">
        <div className="flex items-center gap-3 text-white">
          <span className="font-heading text-[21px] tracking-tight sm:text-[26px]">
            {BRAND}
          </span>
          <span
            className="select-none text-[25px] tracking-[-0.02em] sm:text-[30px]"
            aria-hidden="true"
          >
            ✳︎
          </span>
        </div>

        <nav
          className="hidden items-center text-[23px] text-white md:flex"
          aria-label="Main navigation"
        >
          {NAV_LINKS.map((link, index) => (
            <Fragment key={link.label}>
              {index > 0 && <span className="whitespace-pre">, </span>}
              <a className="transition-opacity hover:opacity-60" href={link.href}>
                {link.label}
              </a>
            </Fragment>
          ))}
        </nav>

        <a
          href={CONTACT_LINK.href}
          className="hidden text-[23px] text-white underline underline-offset-2 transition-opacity hover:opacity-60 md:block"
        >
          {CONTACT_LINK.label}
        </a>

        <button
          ref={toggleRef}
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="-mr-2 flex flex-col gap-[5px] p-2 text-white md:hidden"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
        >
          <span
            className={`h-[2px] w-6 bg-white transition-transform duration-300 ${
              menuOpen ? 'translate-y-[7px] rotate-45' : ''
            }`}
          />
          <span
            className={`h-[2px] w-6 bg-white transition-opacity duration-300 ${
              menuOpen ? 'opacity-0' : 'opacity-100'
            }`}
          />
          <span
            className={`h-[2px] w-6 bg-white transition-transform duration-300 ${
              menuOpen ? '-translate-y-[7px] -rotate-45' : ''
            }`}
          />
        </button>
      </header>

      <nav
        ref={mobileNavRef}
        id="mobile-navigation"
        aria-label="Mobile navigation"
        aria-hidden={!menuOpen}
        className={`fixed inset-0 z-[9] flex flex-col items-start justify-center gap-8 bg-black/90 px-8 text-[32px] font-medium text-white backdrop-blur-md transition-opacity duration-300 md:hidden ${
          menuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        {NAV_LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            tabIndex={menuOpen ? 0 : -1}
            onClick={() => setMenuOpen(false)}
            className="transition-opacity hover:opacity-60"
          >
            {link.label}
          </a>
        ))}
        <a
          href={CONTACT_LINK.href}
          tabIndex={menuOpen ? 0 : -1}
          onClick={() => setMenuOpen(false)}
          className="underline underline-offset-2 transition-opacity hover:opacity-60"
        >
          {CONTACT_LINK.label}
        </a>
      </nav>
    </>
  );
}
