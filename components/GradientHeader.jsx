import Link from "next/link";

const GRADIENTS = {
  blue: "from-blue-600 to-blue-800",
  purple: "from-purple-600 to-purple-800",
  orange: "from-orange-500 to-pink-500",
  green: "from-emerald-600 to-emerald-500",
  red: "from-red-600 to-red-700",
};

export default function GradientHeader({
  title,
  subtitle,
  gradient = "blue",
  backHref,
  actions,
}) {
  return (
    <div
      className={`bg-gradient-to-br ${GRADIENTS[gradient]} px-5 pb-6 pt-6 text-white`}
    >
      <div className="mb-3 flex items-center justify-between">
        {backHref ? (
          <Link
            href={backHref}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white"
          >
            ←
          </Link>
        ) : (
          <span />
        )}
        {actions}
      </div>
      <div className="font-heading text-xl font-bold">{title}</div>
      {subtitle ? (
        <div className="mt-1 text-xs opacity-90">{subtitle}</div>
      ) : null}
    </div>
  );
}
