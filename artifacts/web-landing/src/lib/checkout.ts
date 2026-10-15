import { useEffect, useState } from "react";
import { useCreateCheckout, type CheckoutInput } from "@workspace/api-client-react";

/** Leaves for Whop checkout through a real link click, so the Whop pixel can add its visitor id to the address. */
export function openCheckout(url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.hidden = true;
  // In the document, or the pixel's click listener never sees the click.
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/**
 * Creates a Whop checkout and sends the buyer there. Inside the editor preview (an iframe Whop refuses
 * to load in) the checkout opens in a new tab, which has to be opened before the request to dodge popup blockers.
 */
export function useStartCheckout() {
  const checkout = useCreateCheckout();
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Coming back from Whop with the browser's back button restores this page as it was left:
  // clear the spinner so the buttons work again.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) { setPendingId(null); checkout.reset(); } };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, [checkout.reset]);

  const start = (input: CheckoutInput, onError: (err: unknown) => void) => {
    if (checkout.isPending) return;
    const inFrame = window.self !== window.top;
    const tab = inFrame ? window.open("", "_blank") : null;
    setPendingId(input.packageId);
    checkout.mutate(
      { data: input },
      {
        onSuccess: (s) => {
          if (inFrame && tab) { tab.location.href = s.purchaseUrl; setPendingId(null); }
          else openCheckout(s.purchaseUrl);
        },
        onError: (err) => {
          tab?.close();
          setPendingId(null);
          onError(err);
        },
      },
    );
  };

  return { start, pendingId, busy: checkout.isPending };
}
