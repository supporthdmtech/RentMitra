const STYLES = {
  paid: "bg-green-50 text-green-700",
  pending: "bg-amber-50 text-amber-600",
  overdue: "bg-red-50 text-red-600",
};

const LABELS = {
  paid: "Paid",
  pending: "Pending",
  overdue: "Overdue",
};

export default function StatusPill({ status, suffix }) {
  return (
    <span
      className={`inline-block rounded-lg px-2.5 py-1 text-xs font-bold ${STYLES[status]}`}
    >
      {LABELS[status]}
      {suffix ? ` ${suffix}` : ""}
    </span>
  );
}
