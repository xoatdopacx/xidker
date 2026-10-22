import type { OrderSummary } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";

type StatusKey = "pending" | "reported" | "paid" | "cancelled";

export function orderStatusKey(o: { status: OrderSummary["status"]; transferReportedAt: string | null }): StatusKey {
  return o.status === "pending" && o.transferReportedAt ? "reported" : o.status;
}

const BADGE: Record<StatusKey, string> = {
  pending: "bg-[hsl(var(--gold))] text-[#1b2a1c]",
  reported: "bg-[#cfe6f5] text-[#0f2f45]",
  paid: "bg-[hsl(var(--grass-d))] text-white",
  cancelled: "bg-[#d6d2c6] text-[#3d4a3d]",
};

export function StatusBadge({ order }: { order: { status: OrderSummary["status"]; transferReportedAt: string | null } }) {
  const { t } = useI18n();
  const key = orderStatusKey(order);
  return (
    <span className={`inline-block border-2 border-[#1b2a1c] px-2 py-0.5 text-xs font-bold whitespace-nowrap ${BADGE[key]}`} data-testid="text-order-status">
      {t.order.status[key]}
    </span>
  );
}

/** Same-site link with the account cookie; the API answers with the file. */
export const downloadUrl = (code: string) => `${import.meta.env.BASE_URL}api/orders/${code}/download`;
