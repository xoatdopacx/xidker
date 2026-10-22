/** Pages outside the home page, relative to the site base. Shared by the app router and the server render. */
export const ROUTES = {
  signIn: "/dang-nhap",
  register: "/dang-ky",
  reset: "/quen-mat-khau",
  account: "/tai-khoan",
  order: "/don-hang",
  admin: "/quan-tri",
} as const;

/** Old addresses that still get visits: the Whop-era thank-you page and the old admin address. */
export const REDIRECTS: Record<string, string> = {
  "/cam-on": ROUTES.account,
  "/admin": ROUTES.admin,
};

/** Same pattern as the API: "XID" and six letters or digits. */
export const ORDER_CODE_RE = /^XID[0-9A-Z]{6}$/;

export const orderPath = (code: string) => `${ROUTES.order}/${code}`;

/** The order code in /don-hang/CODE, or null for any other path. */
export function orderCodeOf(path: string): string | null {
  const m = /^\/don-hang\/([^/]+)\/?$/.exec(path);
  return m && ORDER_CODE_RE.test(m[1]) ? m[1] : null;
}

/** Where a sign-in may send the visitor on to: only our own account, order and admin pages. */
export function safeNext(next: string | null): string | null {
  if (!next) return null;
  if (next === ROUTES.account || next === ROUTES.admin || orderCodeOf(next)) return next;
  return null;
}
