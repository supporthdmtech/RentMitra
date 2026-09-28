import { daysOverdue, daysUntilDue, formatCurrency, formatDate, paymentStatus } from "@/lib/dueDate";

const CONTAINER_STYLES = {
  paid: "bg-green-50 border-green-100",
  pending: "bg-amber-50 border-amber-100",
  overdue: "bg-red-50 border-red-100",
};
const ICON_STYLES = {
  paid: "bg-gradient-to-br from-emerald-500 to-emerald-600",
  pending: "bg-gradient-to-br from-amber-400 to-amber-500",
  overdue: "bg-gradient-to-br from-red-400 to-red-600",
};
const ICONS = { paid: "✓", pending: "⏱", overdue: "✕" };
const AMOUNT_COLOR = { paid: "text-green-600", pending: "text-amber-600", overdue: "text-red-600" };

export default function PaymentCard({ payment, subtitle, onMarkPaid, onUndo, onRemind }) {
  const status = paymentStatus(payment);

  return (
    <div className={`rounded-xl border p-3.5 ${CONTAINER_STYLES[status]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-1 gap-2.5">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg font-bold text-white ${ICON_STYLES[status]}`}>
            {ICONS[status]}
          </div>
          <div>
            <div className="text-sm font-bold">{subtitle}</div>
            <div className="text-[11px] text-gray-500">
              {status === "paid"
                ? `Paid ${formatDate(payment.paid_at)}`
                : status === "overdue"
                ? `Due ${formatDate(payment.due_date)} • ${daysOverdue(payment)} days overdue`
                : `Due ${formatDate(payment.due_date)}${
                    daysUntilDue(payment) >= 0 ? ` • in ${daysUntilDue(payment)} days` : ""
                  }`}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-sm font-bold ${AMOUNT_COLOR[status]}`}>
            {status === "paid" ? "+" : ""}
            {formatCurrency(payment.amount_due)}
          </div>
          {status === "paid" ? (
            onUndo ? (
              <button onClick={onUndo} className="mt-1 text-[10px] font-semibold text-gray-400 underline">
                Undo
              </button>
            ) : null
          ) : status === "pending" ? (
            onRemind ? (
              <button onClick={onRemind} className="mt-1 rounded border border-amber-300 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                Remind
              </button>
            ) : null
          ) : (
            <div className="mt-1 flex gap-1.5">
              {onRemind ? (
                <button onClick={onRemind} className="rounded border border-red-300 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                  Remind
                </button>
              ) : null}
              {onMarkPaid ? (
                <button onClick={onMarkPaid} className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                  Mark Paid
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
