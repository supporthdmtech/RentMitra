import {
  daysOverdue,
  daysUntilDue,
  formatCurrency,
  formatMonthLabel,
  paymentStatus,
} from "@/lib/dueDate";

const BG = {
  paid: "bg-green-50",
  pending: "bg-amber-50",
  overdue: "bg-red-50",
};
const AMOUNT_COLOR = { paid: "text-green-600", pending: "text-amber-600", overdue: "text-red-600" };

// A single cycle, shown compactly inside a TenantPaymentGroup (no avatar or
// tenant name here — the group header already has those).
export default function PaymentCycleRow({ payment, onMarkPaid, onUndo, onRemind }) {
  const status = paymentStatus(payment);

  return (
    <div className={`flex items-center justify-between rounded-lg px-2.5 py-2 ${BG[status]}`}>
      <div>
        <div className="text-xs font-bold">{formatMonthLabel(payment.due_date)}</div>
        <div className="text-[10px] text-gray-500">
          {status === "paid"
            ? "Paid"
            : status === "overdue"
            ? `${daysOverdue(payment)} days overdue`
            : daysUntilDue(payment) >= 0
            ? `Due in ${daysUntilDue(payment)} days`
            : "Due"}
        </div>
      </div>
      <div className="text-right">
        <div className={`text-xs font-bold ${AMOUNT_COLOR[status]}`}>
          {status === "paid" ? "+" : ""}
          {formatCurrency(payment.amount_due)}
        </div>
        {status === "paid" ? (
          onUndo ? (
            <button onClick={onUndo} className="mt-0.5 text-[10px] font-semibold text-gray-400 underline">
              Undo
            </button>
          ) : null
        ) : (
          <div className="mt-0.5 flex justify-end gap-1">
            {status === "overdue" && onRemind ? (
              <button onClick={onRemind} className="rounded border border-red-300 px-1.5 py-0.5 text-[9px] font-semibold text-red-600">
                Remind
              </button>
            ) : null}
            {onMarkPaid ? (
              <button
                onClick={onMarkPaid}
                className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                  status === "overdue" ? "bg-red-600 text-white" : "border border-amber-300 text-amber-600"
                }`}
              >
                Mark Paid
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
