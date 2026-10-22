import { useQuery, type QueryClient } from "@tanstack/react-query";
import { getAccountSession, getGetAccountSessionQueryKey, type AccountSession } from "@workspace/api-client-react";
import { statusOf } from "./http";

export type SignedOutReason = "signed_out" | "replaced";
/** Being signed out is an ordinary answer here, not an error. */
export type AccountState = { account: AccountSession | null; reason: SignedOutReason | null };

/** Its own key (under the session path), so it never mixes with the generated hook's raw answer. */
export const ACCOUNT_KEY = [...getGetAccountSessionQueryKey(), "state"] as const;

/** Set once this browser has signed in, so the chat button stays and "buy" goes to sign-in rather than sign-up. */
const KNOWN_KEY = "xidker-account";

export function knownAccount(): boolean {
  try { return localStorage.getItem(KNOWN_KEY) === "1"; } catch { return false; }
}

function rememberAccount() {
  try { localStorage.setItem(KNOWN_KEY, "1"); } catch { /* storage blocked */ }
}

export function signedOutReason(err: unknown): SignedOutReason {
  const reason = (err as { data?: { reason?: unknown } | null } | null)?.data?.reason;
  return reason === "replaced" ? "replaced" : "signed_out";
}

export function useAccount(enabled = true) {
  return useQuery<AccountState>({
    queryKey: ACCOUNT_KEY,
    enabled,
    staleTime: 30_000,
    retry: (count, err) => statusOf(err) === 0 && count < 2,
    queryFn: async ({ signal }) => {
      try {
        const account = await getAccountSession({ signal });
        rememberAccount();
        return { account, reason: null };
      } catch (err) {
        if (statusOf(err) === 401) return { account: null, reason: signedOutReason(err) };
        throw err;
      }
    },
  });
}

/** Orders, chat and admin data of whoever was signed in before. */
function dropPrivateData(qc: QueryClient) {
  qc.removeQueries({
    predicate: (q) => typeof q.queryKey[0] === "string" && /^\/api\/(orders|support|admin)\b/.test(q.queryKey[0]),
  });
}

export function setSignedIn(qc: QueryClient, account: AccountSession) {
  dropPrivateData(qc);
  rememberAccount();
  qc.setQueryData<AccountState>(ACCOUNT_KEY, { account, reason: null });
}

export function setSignedOut(qc: QueryClient, reason: SignedOutReason | null) {
  dropPrivateData(qc);
  qc.setQueryData<AccountState>(ACCOUNT_KEY, { account: null, reason });
}
