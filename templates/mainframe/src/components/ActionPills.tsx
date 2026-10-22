import { useEffect, useRef, useState } from 'react';
import { ACTION_LINKS, EMAIL } from '../content';

const pillClasses =
  'mx-[0.2em] mb-[0.4em] inline-flex items-center justify-center whitespace-nowrap rounded-full border px-4 py-[0.3em] text-[13px] transition-colors duration-200 sm:px-5 sm:text-[15px]';

function legacyCopy(text: string) {
  const previousFocus = document.activeElement;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.readOnly = true;
  textarea.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  } finally {
    textarea.remove();
    if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true });
  }
  return copied;
}

export function ActionPills() {
  const [visible, setVisible] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const emailRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(true), 400);
    return () => window.clearTimeout(timeout);
  }, []);

  const copyEmail = async () => {
    setCopyStatus('');
    let copied = false;
    try {
      await navigator.clipboard.writeText(EMAIL);
      copied = true;
    } catch {
      // Clipboard permissions can be blocked in an opaque-origin sandbox.
      copied = legacyCopy(EMAIL);
    }

    if (copied) {
      setCopyStatus('Email address copied.');
    } else {
      // Preserve a usable, selectable email even when all clipboard APIs fail.
      if (emailRef.current) {
        const range = document.createRange();
        range.selectNodeContents(emailRef.current);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      setCopyStatus('Copy is unavailable. The email address is selected for manual copying.');
    }
  };

  return (
    <div
      className={`action-pills flex flex-wrap gap-y-1 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      {ACTION_LINKS.map((link) => (
        <a
          key={link.label}
          href={link.href}
          className={`${pillClasses} border-black/10 bg-white text-black hover:bg-black hover:text-white`}
        >
          {link.label}
        </a>
      ))}
      <button
        type="button"
        onClick={copyEmail}
        className={`${pillClasses} gap-2 border-white bg-transparent text-white hover:bg-white hover:text-black sm:gap-3`}
        aria-label={`Copy email address ${EMAIL}`}
      >
        <span>
          Reach us:{' '}
          <span ref={emailRef} className="underline underline-offset-1">
            {EMAIL}
          </span>
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="M8 16H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v4" />
          <rect x="8" y="8" width="13" height="13" rx="1" />
        </svg>
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {copyStatus}
      </span>
    </div>
  );
}
