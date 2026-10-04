"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/payments", label: "Dues", icon: "💳" },
  { href: "/properties/new", label: "Add", icon: "➕" },
  { href: "/reports", label: "Reports", icon: "📊" },
  { href: "/profile", label: "Settings", icon: "⚙️" },
];

export default function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 px-3 pb-3 pt-1">
      <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white shadow-lg">
        <div className="flex justify-around px-1 py-1">
          {TABS.map((tab) => {
            // For /properties/new: exact match only (so /properties/[id] doesn't light up Add).
            // For everything else: prefix match is fine.
            const active =
              tab.href === "/properties/new"
                ? pathname === "/properties/new"
                : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-semibold ${
                  active ? "text-blue-600" : "text-gray-400"
                }`}
              >
                <span className="text-lg leading-none">{tab.icon}</span>
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
