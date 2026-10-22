import { CONTACT_EMAIL, LABELS } from "../data/content";

export function ContactButton() {
  return (
    <a
      href={`mailto:${CONTACT_EMAIL}`}
      className="contact-button inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full px-8 py-3 text-xs font-medium uppercase tracking-widest text-white sm:px-10 sm:py-3.5 sm:text-sm md:px-12 md:py-4 md:text-base"
    >
      {LABELS.contact}
    </a>
  );
}

export function LiveProjectButton({
  href,
  projectName,
}: {
  href: string;
  projectName: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${LABELS.liveProject}: ${projectName} (opens in a new tab)`}
      className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full border-2 border-mist px-8 py-3 text-sm font-medium uppercase tracking-widest text-mist hover:bg-mist/10 sm:px-10 sm:py-3.5 sm:text-base"
    >
      {LABELS.liveProject}
    </a>
  );
}
