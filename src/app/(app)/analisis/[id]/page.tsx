import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AreaTabs } from "@/components/analysis/area-tabs";
import { FindingsList } from "@/components/analysis/findings-list";
import { RevenueBreakdown } from "@/components/analysis/revenue-breakdown";
import {
  Badge,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  InfoNote,
  PageHeader,
} from "@/components/ui";
import { loadAnalysis } from "@/lib/analysis/load";
import { requireUser } from "@/lib/auth/session";
import { requireMetric } from "@/lib/metrics/catalog";
import { formatMetric, formatRelative } from "@/lib/metrics/format";
import { enrichAnalysis } from "@/services/ai";

export const metadata: Metadata = { title: "Comparación" };

export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const loaded = await loadAnalysis(user.id, id);
  if (!loaded) notFound();

  const { stored, input, result } = loaded;
  const ai = await enrichAnalysis(input, result);
  const coveragePct = Math.round(result.coverage.ratio * 100);

  const bySeverity = {
    high: result.findings.filter((f) => f.severity === "high").length,
    medium: result.findings.filter((f) => f.severity === "medium").length,
    low: result.findings.filter((f) => f.severity === "low").length,
  };

  return (
    <>
      <PageHeader
        eyebrow={`${input.own.name} frente a ${input.rival.name}`}
        title={stored.title}
        description={`Creado el ${new Date(stored.createdAt).toLocaleDateString("es-ES")}. ${result.findings.length} diferencias por encima del umbral: ${bySeverity.high} de impacto alto, ${bySeverity.medium} medio y ${bySeverity.low} bajo.`}
        action={
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={`/analisis/${id}/plan`} variant="secondary">
              Plan de acción
            </ButtonLink>
            <ButtonLink href={`/analisis/${id}/informe`}>Ver informe</ButtonLink>
          </div>
        }
      />

      {stored.isDemo ? (
        <div className="mb-6">
          <InfoNote>
            Este análisis usa <strong className="text-ink">datos ficticios</strong> de
            demostración. Sirve para recorrer el producto; no representa a ninguna
            empresa real.
          </InfoNote>
        </div>
      ) : null}

      <div className="space-y-6">
        <Card>
          <CardHeader
            title="Resumen ejecutivo"
            action={
              <Badge tone="neutral">
                {ai.isModelGenerated
                  ? `Interpretación de IA · ${ai.model ?? "modelo"}`
                  : "Análisis determinista, sin IA"}
              </Badge>
            }
          />
          <p className="text-sm leading-relaxed text-ink-2">{ai.insights.executiveSummary}</p>

          {ai.fallbackReason ? (
            <p className="mt-4 text-xs text-ink-muted">{ai.fallbackReason}</p>
          ) : null}

          {ai.insights.caveats.length > 0 ? (
            <ul className="mt-4 space-y-1.5 border-t border-line pt-4">
              {ai.insights.caveats.map((caveat) => (
                <li key={caveat} className="text-xs text-ink-muted">
                  · {caveat}
                </li>
              ))}
            </ul>
          ) : null}
        </Card>

        <Card>
          <CardHeader
            title="¿Dónde estamos perdiendo ventaja?"
            description="Diferencias que superan el umbral de materialidad de su métrica, ordenadas por impacto."
          />
          {result.findings.length === 0 ? (
            <EmptyState
              title="Ninguna brecha material"
              description="Con los datos introducidos no hay diferencias lo bastante grandes como para considerarlas un problema. Añadir más datos puede cambiarlo."
            />
          ) : (
            <FindingsList
              findings={result.findings}
              analysisId={id}
              ownName={input.own.name}
              rivalName={input.rival.name}
              limit={8}
            />
          )}
        </Card>

        <Card>
          <CardHeader
            title="¿De dónde sale la diferencia de facturación?"
            description="Facturación ≈ nº de clientes × ticket medio × frecuencia de compra."
          />
          <RevenueBreakdown
            revenue={result.revenue}
            ownName={input.own.name}
            rivalName={input.rival.name}
          />
        </Card>

        <Card>
          <CardHeader
            title="Comparación por áreas"
            description="Todas las métricas comparables, agrupadas por área de negocio."
          />
          <AreaTabs
            gaps={result.gaps}
            areaScores={result.areaScores}
            ownName={input.own.name}
            rivalName={input.rival.name}
          />
        </Card>

        {result.strengths.length > 0 ? (
          <Card>
            <CardHeader
              title="Dónde vas por delante"
              description="Ventajas que conviene no perder mientras se corrige el resto."
            />
            <ul className="grid gap-3 sm:grid-cols-2">
              {result.strengths.slice(0, 6).map((gap) => {
                const metric = requireMetric(gap.metricId);
                return (
                  <li
                    key={gap.metricId}
                    className="rounded-lg border border-line bg-surface-2 p-3"
                  >
                    <p className="text-sm font-medium text-ink">{metric.label}</p>
                    <p className="tabular mt-1 text-sm text-ink-2">
                      {formatMetric(metric, gap.ownValue)} frente a{" "}
                      {formatMetric(metric, gap.rivalValue)}{" "}
                      <span className="text-[var(--good-text)]">
                        ({formatRelative(gap.relativeGap)})
                      </span>
                    </p>
                  </li>
                );
              })}
            </ul>
          </Card>
        ) : null}

        <Card>
          <CardHeader
            title="Cobertura de datos"
            description={`Hay datos de las dos empresas en ${result.coverage.known} de ${result.coverage.total} métricas comparables (${coveragePct} %).`}
          />

          <div
            className="h-3 rounded-full bg-surface-2"
            role="img"
            aria-label={`Cobertura de datos: ${coveragePct} por ciento.`}
          >
            <div
              className="h-3 rounded-full"
              style={{ width: `${coveragePct}%`, background: "var(--accent)" }}
            />
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <UnknownList
              title={`Sin dato en ${input.own.name}`}
              metricIds={result.coverage.unknownOwn}
            />
            <UnknownList
              title={`Sin dato en ${input.rival.name}`}
              metricIds={result.coverage.unknownRival}
            />
          </div>

          <p className="mt-5 text-xs text-ink-muted">
            Los datos desconocidos no se rellenan con estimaciones automáticas.
            Completarlos más adelante puede cambiar el orden de prioridades, así
            que conviene volver al análisis cuando se consigan.
          </p>
        </Card>
      </div>
    </>
  );
}

function UnknownList({ title, metricIds }: { title: string; metricIds: string[] }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-ink">{title}</p>
      {metricIds.length === 0 ? (
        <p className="text-sm text-ink-2">Ninguno: están todas las métricas.</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {metricIds.map((metricId) => (
            <li
              key={metricId}
              className="rounded border border-dashed border-line-strong px-1.5 py-0.5 text-[11px] text-ink-muted"
            >
              {requireMetric(metricId).label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
