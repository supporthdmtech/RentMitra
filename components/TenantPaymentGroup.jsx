import PaymentCycleRow from "./PaymentCycleRow";

// Every cycle belonging to one tenant, shown together under a single
// header — so a tenant behind on 2 months shows up as one card with 2
// rows, instead of 2 separate cards scattered through the list.
export default function TenantPaymentGroup({
  tenantName,
  propertyName,
  payments,
  onMarkPaid,
  onUndo,
  onRemind,
}) {
  return (
    <div className="rounded-xl border border-gray-100 p-3.5">
      <div className="mb-2.5 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-[11px] font-bold text-indigo-700">
          {(tenantName || "?").slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="text-sm font-bold">{tenantName}</div>
          <div className="text-[11px] text-gray-400">{propertyName}</div>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {payments.map((payment) => (
          <PaymentCycleRow
            key={payment.id}
            payment={payment}
            onMarkPaid={onMarkPaid ? () => onMarkPaid(payment) : undefined}
            onUndo={onUndo ? () => onUndo(payment) : undefined}
            onRemind={onRemind ? () => onRemind(payment) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
