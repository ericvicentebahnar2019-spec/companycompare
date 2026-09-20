"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { cx } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { href: "/dashboard", label: "Resumen" },
  { href: "/analisis", label: "Análisis" },
  { href: "/empresas", label: "Empresas" },
  { href: "/seguimiento", label: "Seguimiento" },
];

export function AppShell({
  userName,
  plan,
  ephemeral,
  logout,
  children,
}: {
  userName: string;
  plan: string;
  ephemeral: boolean;
  logout: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <header className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3 lg:hidden">
        <Link href="/dashboard" className="text-sm font-semibold text-ink">
          CompanyCompare
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="nav-principal"
          className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink"
        >
          {menuOpen ? "Cerrar" : "Menú"}
        </button>
      </header>

      <nav
        id="nav-principal"
        className={cx(
          "shrink-0 border-line bg-surface lg:block lg:w-60 lg:border-r",
          menuOpen ? "block border-b" : "hidden",
        )}
      >
        {/* Al pulsar cualquier enlace se cierra el menú móvil; si no, se
            quedaría abierto encima de la página nueva. */}
        <div
          onClick={() => setMenuOpen(false)}
          className="flex h-full flex-col gap-6 p-4 lg:sticky lg:top-0 lg:h-dvh"
        >
          <Link
            href="/dashboard"
            className="hidden items-center gap-2 px-2 py-1 text-sm font-semibold text-ink lg:flex"
          >
            <span
              aria-hidden
              className="size-2.5 rounded-full"
              style={{ background: "var(--accent)" }}
            />
            CompanyCompare
          </Link>

          <ul className="space-y-1">
            {NAV.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "block rounded-lg px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-surface-2 font-medium text-ink"
                        : "text-ink-2 hover:bg-surface-hover hover:text-ink",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <Link
            href="/analisis/nuevo"
            className="rounded-lg bg-accent px-3 py-2 text-center text-sm font-medium text-accent-ink transition-opacity hover:opacity-90"
          >
            Nuevo análisis
          </Link>

          <div className="mt-auto space-y-3 border-t border-line pt-4">
            {ephemeral ? (
              <p className="rounded-lg border border-dashed border-line-strong px-3 py-2 text-[11px] leading-relaxed text-ink-muted">
                Sin base de datos configurada: los datos viven en memoria y se
                pierden al reiniciar el servidor.
              </p>
            ) : null}
            <div className="px-1">
              <p className="truncate text-sm font-medium text-ink">{userName}</p>
              <p className="text-xs text-ink-muted">Plan {plan}</p>
            </div>
            <ThemeToggle />
            {logout}
          </div>
        </div>
      </nav>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
