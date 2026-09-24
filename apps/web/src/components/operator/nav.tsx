"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Visão geral", short: "OV" },
  { href: "/hunter", label: "Hunter", short: "HU" },
  { href: "/distribution", label: "Distribuição", short: "DI" },
  { href: "/acquisition", label: "Aquisição", short: "AQ" },
  { href: "/experiments", label: "Experimentos", short: "EX" },
  { href: "/system", label: "Sistema", short: "SY" },
  { href: "/settings", label: "Configurações", short: "SE" }
] as const;

export function OperatorNav() {
  const pathname = usePathname();

  return (
    <nav className="side-nav" aria-label="Navegação principal">
      {items.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className="side-nav-item"
            data-active={active}
          >
            <span className="side-nav-icon">{item.short}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
