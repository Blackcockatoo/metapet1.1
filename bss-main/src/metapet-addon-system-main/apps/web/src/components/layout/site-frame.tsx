"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { ROUTE_PATHS } from "@bluesnake-studios/config";

const navigation = [
  { href: ROUTE_PATHS.home, label: "Overview" },
  { href: ROUTE_PATHS.shop, label: "Shop" },
  { href: ROUTE_PATHS.inventory, label: "Inventory" },
  { href: ROUTE_PATHS.admin, label: "Admin" }
];

export function SiteFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="site-frame">
      <header className="site-header">
        <div>
          <p className="site-brand">BlueSnake Studios</p>
          <h1 className="site-title">Meta-Pet Add-on System</h1>
        </div>
        <nav className="site-nav">
          {navigation.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="site-main">{children}</main>
    </div>
  );
}
