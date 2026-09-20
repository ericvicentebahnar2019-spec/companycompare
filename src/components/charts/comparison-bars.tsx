"use client";

import { useState } from "react";

import { requireMetric } from "@/lib/metrics/catalog";
import { formatAbsoluteDelta, formatMetric, formatRelative } from "@/lib/metrics/format";
import { PROVENANCE_LABEL } from "@/lib/metrics/types";
import type { Gap } from "@/lib/analysis/types";
import { cx } from "@/components/ui";

export interface ComparisonBarsProps {
  gaps: Gap[];
  ownName: string;
  rivalName: string;
}

/**
 * Barras comparativas por métrica.
 *
 * Cada métrica se escala contra el mayor de los dos valores, porque comparar
 * facturación y tasa de recompra en un mismo eje no significaría nada. Las dos
 * barras llevan etiqueta directa, de modo que el color solo refuerza la
 * identidad: nunca es el único canal.
 */
export function ComparisonBars({ gaps, ownName, rivalName }: ComparisonBarsProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const visible = gaps.filter((gap) => gap.ownValue !== null || gap.rivalValue !== null);
  if (visible.length === 0) return null;

  return (
    <div>
      <Legend ownName={ownName} rivalName={rivalName} />

      <ul className="mt-5 space-y-5">
        {visible.map((gap) => {
          const metric = requireMetric(gap.metricId);
          const own = gap.ownValue ?? 0;
          const rival = gap.rivalValue ?? 0;
          const scale = Math.max(Math.abs(own), Math.abs(rival), 1);
          const isHovered = hovered === gap.metricId;

          return (
            <li
              key={gap.metricId}
              className="relative"
              onMouseEnter={() => setHovered(gap.metricId)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(gap.metricId)}
              onBlur={() => setHovered(null)}
            >
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-sm font-medium text-ink">{metric.label}</p>
                <p
                  className={cx(
                    "tabular text-sm",
                    gap.favors === "rival"
                      ? "text-[var(--critical)]"
                      : gap.favors === "own"
                        ? "text-[var(--good-text)]"
                        : "text-ink-2",
                  )}
                >
                  {gap.known
                    ? `${formatRelative(gap.relativeGap)} · ${formatAbsoluteDelta(metric, gap.absoluteGap)}`
                    : "Dato desconocido"}
                </p>
              </div>

              <Bar
                label={ownName}
                value={gap.ownValue}
                display={formatMetric(metric, gap.ownValue)}
                fraction={gap.ownValue === null ? 0 : Math.abs(own) / scale}
                color="var(--series-own)"
                tabIndex={0}
              />
              <div className="h-0.5" />
              <Bar
                label={rivalName}
                value={gap.rivalValue}
                display={formatMetric(metric, gap.rivalValue)}
                fraction={gap.rivalValue === null ? 0 : Math.abs(rival) / scale}
                color="var(--series-rival)"
              />

              {isHovered ? (
                <div
                  role="status"
                  className="pointer-events-none absolute right-0 top-full z-10 mt-1 w-64 rounded-lg border border-line bg-surface p-3 text-xs shadow-lg"
                >
                  <p className="font-semibold text-ink">{metric.label}</p>
                  <p className="mt-1 text-ink-2">{metric.help}</p>
                  <dl className="mt-2 space-y-1">
                    <Row
                      term={ownName}
                      value={formatMetric(metric, gap.ownValue)}
                      note={PROVENANCE_LABEL[gap.ownProvenance]}
                    />
                    <Row
                      term={rivalName}
                      value={formatMetric(metric, gap.rivalValue)}
                      note={PROVENANCE_LABEL[gap.rivalProvenance]}
                    />
                  </dl>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Row({ term, value, note }: { term: string; value: string; note: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-ink-2">{term}</dt>
      <dd className="tabular text-right text-ink">
        {value} <span className="text-ink-muted">· {note}</span>
      </dd>
    </div>
  );
}

function Bar({
  label,
  value,
  display,
  fraction,
  color,
  tabIndex,
}: {
  label: string;
  value: number | null;
  display: string;
  fraction: number;
  color: string;
  tabIndex?: number;
}) {
  const width = Math.max(fraction * 100, value === null ? 0 : 1.5);

  return (
    <div className="flex items-center gap-3" tabIndex={tabIndex}>
      <span className="w-24 shrink-0 truncate text-xs text-ink-2 sm:w-28">{label}</span>
      <div className="relative h-3 flex-1 rounded-full bg-surface-2">
        {value === null ? (
          <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-[11px] text-ink-muted">
            sin dato
          </span>
        ) : (
          <div
            className="h-3 rounded-full transition-[width] duration-500"
            style={{ width: `${width}%`, background: color }}
          />
        )}
      </div>
      <span className="tabular w-24 shrink-0 text-right text-xs font-medium text-ink sm:w-28">
        {display}
      </span>
    </div>
  );
}

export function Legend({ ownName, rivalName }: { ownName: string; rivalName: string }) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-ink-2">
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden
          className="size-2.5 rounded-full"
          style={{ background: "var(--series-own)" }}
        />
        {ownName}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden
          className="size-2.5 rounded-full"
          style={{ background: "var(--series-rival)" }}
        />
        {rivalName}
      </span>
    </div>
  );
}
