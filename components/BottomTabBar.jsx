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
    <nav className="fixed bottom-0 left-0 right-0 z-10 border-t-2 border-gray-200 bg-white">
      <div className="mx-auto flex max-w-md divide-x divide-gray-200">
        {TABS.map((tab) => {
          const active =
            tab.href === "/properties/new"
              ? pathname === "/properties/new"
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-3 text-xs font-semibold transition-colors ${
                active ? "bg-blue-50 text-blue-600" : "text-gray-400"
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
