// All visible copy, the background video, and link destinations live here.
export const BRAND = 'Mainframe®';
export const EMAIL = 'hello@mainframe.co';

export const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260826_041744_63efcd78-bf7d-4039-99e2-2461e8a61903.mp4';

// The supplied video uses HEVC Main 10, which some browsers cannot decode.
// This is the exact same footage, encoded as H.264 for those browsers.
export const VIDEO_FALLBACK_URL = new URL('./assets/mainframe-h264.mp4', import.meta.url).href;

export const INTRO_LINES = [
  'Hey there, meet A.R.I.A,',
  "Mainframe's Adaptive Response Interface Agent",
] as const;

export const GREETING =
  'Glad you stopped in. Good taste tends to find us. Now, what are we building?';

const emailLink = (subject: string) =>
  `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}`;

// No destination URLs were supplied in the design brief. These are working
// email enquiries, not invented routes. Replace each href with your own URL.
export const NAV_LINKS = [
  { label: 'Labs', href: emailLink('Labs enquiry') },
  { label: 'Studio', href: emailLink('Studio enquiry') },
  { label: 'Openings', href: emailLink('Openings enquiry') },
  { label: 'Shop', href: emailLink('Shop enquiry') },
] as const;

export const CONTACT_LINK = {
  label: 'Get in touch',
  href: `mailto:${EMAIL}`,
};

export const ACTION_LINKS = [
  { label: 'Pitch us an idea', href: emailLink('An idea for Mainframe') },
  { label: 'Come work here', href: emailLink('Working at Mainframe') },
  { label: 'Send a brief hello', href: emailLink('Hello, Mainframe') },
  { label: 'See how we operate', href: emailLink('How Mainframe operates') },
] as const;
