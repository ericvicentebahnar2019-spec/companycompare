import Link from "next/link";

import { Badge, SeverityBadge } from "@/components/ui";
import { requireMetric } from "@/lib/metrics/catalog";
import { formatAbsoluteDelta, formatMetric, formatRelative } from "@/lib/metrics/format";
import { AREA_META } from "@/lib/metrics/types";
import type { Finding } from "@/lib/analysis/types";

/**
 * Lista de hallazgos: cada brecha relevante con su impacto, la causa mejor
 * sostenida y un enlace al análisis a fondo.
 */
export function FindingsList({
  findings,
  analysisId,
  ownName,
  rivalName,
  limit,
}: {
  findings: Finding[];
  analysisId: string;
  ownName: string;
  rivalName: string;
  limit?: number;
}) {
  const visible = limit ? findings.slice(0, limit) : findings;

  return (
    <ul className="space-y-3">
      {visible.map((finding) => {
        const metric = requireMetric(finding.metricId);
        const leading = finding.hypotheses[0];

        return (
          <li key={finding.id}>
            <Link
              href={`/analisis/${analysisId}/problema/${finding.metricId}`}
              className="block rounded-xl border border-line bg-surface p-4 transition-colors hover:bg-surface-hover"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    {AREA_META[finding.area].icon} {metric.label}
                  </p>
                  <p className="tabular mt-1 text-sm text-ink-2">
                    {ownName}: {formatMetric(metric, finding.gap.ownValue)} ·{" "}
                    {rivalName}: {formatMetric(metric, finding.gap.rivalValue)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">
                    {formatAbsoluteDelta(metric, finding.gap.absoluteGap)} ·{" "}
                    {formatRelative(finding.gap.relativeGap)}
                  </Badge>
                  <SeverityBadge level={finding.severity} />
                </div>
              </div>

              {leading ? (
                <p className="mt-3 border-t border-line pt-3 text-sm text-ink-2">
                  <span className="text-ink-muted">Posible causa: </span>
                  {leading.statement}
                </p>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
