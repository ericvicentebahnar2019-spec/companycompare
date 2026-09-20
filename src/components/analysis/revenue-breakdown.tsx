import { requireMetric } from "@/lib/metrics/catalog";
import { formatCurrency, formatMetric } from "@/lib/metrics/format";
import type { RevenueDecomposition } from "@/lib/analysis/types";
import { cx, InfoNote } from "@/components/ui";

/**
 * Reparto de la brecha de facturación entre clientes, ticket medio y
 * frecuencia de compra. Es la pieza que convierte "facturas menos" en "facturas
 * menos por esto".
 */
export function RevenueBreakdown({
  revenue,
  ownName,
  rivalName,
}: {
  revenue: RevenueDecomposition;
  ownName: string;
  rivalName: string;
}) {
  if (!revenue.available) {
    return <InfoNote>{revenue.note}</InfoNote>;
  }

  const total = revenue.factors.reduce(
    (sum, factor) => sum + Math.max(factor.contribution, 0),
    0,
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-surface-2 p-3">
          <p className="text-xs text-ink-muted">{ownName} · facturación implícita</p>
          <p className="tabular mt-1 text-lg font-semibold text-ink">
            {revenue.ownImplied !== null ? formatCurrency(revenue.ownImplied) : "—"}
          </p>
          {revenue.ownResidual !== null ? (
            <p className="mt-1 text-xs text-ink-2">{residualNote(revenue.ownResidual)}</p>
          ) : null}
        </div>
        <div className="rounded-lg border border-line bg-surface-2 p-3">
          <p className="text-xs text-ink-muted">{rivalName} · facturación implícita</p>
          <p className="tabular mt-1 text-lg font-semibold text-ink">
            {revenue.rivalImplied !== null ? formatCurrency(revenue.rivalImplied) : "—"}
          </p>
          {revenue.rivalResidual !== null ? (
            <p className="mt-1 text-xs text-ink-2">{residualNote(revenue.rivalResidual)}</p>
          ) : null}
        </div>
      </div>

      <ul className="space-y-3">
        {revenue.factors.map((factor) => {
          const metric = requireMetric(factor.metricId);
          const share = factor.contribution;
          const width = total > 0 ? (Math.max(share, 0) / total) * 100 : 0;
          const favoursOwn = share < 0;

          return (
            <li key={factor.metricId}>
              <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-sm font-medium text-ink">{metric.label}</span>
                <span className="tabular text-sm text-ink-2">
                  {formatMetric(metric, factor.ownValue)} →{" "}
                  {formatMetric(metric, factor.rivalValue)}
                  <span
                    className={cx(
                      "ml-2 font-medium",
                      favoursOwn ? "text-[var(--good-text)]" : "text-ink",
                    )}
                  >
                    {favoursOwn
                      ? `reduce la brecha un ${Math.abs(Math.round(share * 100))} %`
                      : `aporta el ${Math.round(share * 100)} % de la brecha`}
                  </span>
                </span>
              </div>
              <div className="h-3 rounded-full bg-surface-2">
                <div
                  className="h-3 rounded-full"
                  style={{
                    width: `${Math.max(width, favoursOwn ? 0 : 1.5)}%`,
                    background: favoursOwn
                      ? "var(--series-own)"
                      : "var(--series-rival)",
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-ink-muted">{revenue.note}</p>
    </div>
  );
}

function residualNote(residual: number): string {
  const pct = Math.abs(residual) * 100;
  if (pct < 3) {
    return "Cuadra con la facturación declarada.";
  }
  return `La facturación declarada queda un ${pct.toLocaleString("es-ES", {
    maximumFractionDigits: 1,
  })} % ${residual > 0 ? "por encima" : "por debajo"} de lo que explican estos tres factores.`;
}
