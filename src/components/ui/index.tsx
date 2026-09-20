import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { PROVENANCE_LABEL, type Provenance } from "@/lib/metrics/types";
import type { Level } from "@/lib/analysis/types";

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export { cx };

// ── Superficies ──────────────────────────────────────────────

export function Card({
  className,
  children,
  ...rest
}: ComponentProps<"section">) {
  return (
    <section
      {...rest}
      className={cx(
        "rounded-xl border border-line bg-surface p-5 sm:p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-ink-2">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm text-ink-2">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

// ── Botones ──────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-ink hover:opacity-90",
  secondary: "border border-line-strong bg-surface text-ink hover:bg-surface-hover",
  ghost: "text-ink-2 hover:bg-surface-hover hover:text-ink",
  danger: "border border-line-strong bg-surface text-[var(--critical)] hover:bg-surface-hover",
};

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export function Button({
  variant = "primary",
  className,
  ...rest
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button {...rest} className={cx(BUTTON_BASE, BUTTON_STYLES[variant], className)} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  ...rest
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link {...rest} className={cx(BUTTON_BASE, BUTTON_STYLES[variant], className)} />;
}

// ── Indicadores ──────────────────────────────────────────────

type BadgeTone = "neutral" | "own" | "rival" | "good" | "warning" | "serious" | "critical";

const BADGE_STYLES: Record<BadgeTone, string> = {
  neutral: "border-line bg-surface-2 text-ink-2",
  own: "border-line bg-surface-2 text-ink",
  rival: "border-line bg-surface-2 text-ink",
  good: "border-line bg-surface-2 text-ink",
  warning: "border-line bg-surface-2 text-ink",
  serious: "border-line bg-surface-2 text-ink",
  critical: "border-line bg-surface-2 text-ink",
};

const BADGE_DOT: Record<BadgeTone, string | null> = {
  neutral: null,
  own: "var(--series-own)",
  rival: "var(--series-rival)",
  good: "var(--good)",
  warning: "var(--warning)",
  serious: "var(--serious)",
  critical: "var(--critical)",
};

/**
 * Etiqueta con punto de color opcional.
 *
 * El color nunca va solo: siempre acompaña a un texto, de modo que la etiqueta
 * sigue siendo legible sin distinguir tonos.
 */
export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  const dot = BADGE_DOT[tone];
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        BADGE_STYLES[tone],
        className,
      )}
    >
      {dot ? (
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ background: dot }}
        />
      ) : null}
      {children}
    </span>
  );
}

const SEVERITY_TONE: Record<Level, BadgeTone> = {
  high: "critical",
  medium: "serious",
  low: "warning",
};

const SEVERITY_LABEL: Record<Level, string> = {
  high: "Impacto alto",
  medium: "Impacto medio",
  low: "Impacto bajo",
};

export function SeverityBadge({ level }: { level: Level }) {
  return <Badge tone={SEVERITY_TONE[level]}>{SEVERITY_LABEL[level]}</Badge>;
}

const CONFIDENCE_LABEL: Record<Level, string> = {
  high: "Confianza alta",
  medium: "Confianza media",
  low: "Confianza baja",
};

export function ConfidenceBadge({ level }: { level: Level }) {
  return <Badge tone={level === "high" ? "good" : level === "medium" ? "warning" : "neutral"}>{CONFIDENCE_LABEL[level]}</Badge>;
}

/**
 * Procedencia de un dato. Es una de las piezas centrales del producto: deja
 * claro de un vistazo si una cifra es un dato, una estimación o una inferencia.
 */
export function ProvenanceTag({
  provenance,
  note,
}: {
  provenance: Provenance;
  note?: string | null;
}) {
  const label = PROVENANCE_LABEL[provenance];
  return (
    <span
      title={note ?? label}
      className={cx(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium",
        provenance === "unknown"
          ? "border-dashed border-line-strong text-ink-muted"
          : "border-line text-ink-2",
      )}
    >
      {label}
    </span>
  );
}

// ── Estados ──────────────────────────────────────────────────

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong bg-surface-2 px-6 py-12 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-2">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cx("animate-pulse rounded-md bg-surface-2", className)}
    />
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-[var(--critical)]"
    >
      {children}
    </p>
  );
}

export function InfoNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink-2">
      {children}
    </p>
  );
}

// ── Datos ────────────────────────────────────────────────────

export function StatTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: "own" | "rival";
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="flex items-center gap-1.5">
        {accent ? (
          <span
            aria-hidden
            className="size-2 rounded-full"
            style={{
              background:
                accent === "own" ? "var(--series-own)" : "var(--series-rival)",
            }}
          />
        ) : null}
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
          {label}
        </p>
      </div>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-2">{hint}</p> : null}
    </div>
  );
}

export function DataTable({
  head,
  children,
  caption,
}: {
  head: ReactNode[];
  children: ReactNode;
  caption?: string;
}) {
  return (
    <div className="-mx-5 overflow-x-auto sm:mx-0">
      <table className="w-full min-w-[34rem] border-collapse text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-line text-left">
            {head.map((cell, index) => (
              <th
                key={index}
                scope="col"
                className={cx(
                  "px-3 py-2 text-xs font-medium uppercase tracking-wide text-ink-muted",
                  index > 0 && "text-right",
                )}
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
