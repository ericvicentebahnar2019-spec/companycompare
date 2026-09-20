import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/report/print-button";
import {
  Badge,
  Card,
  CardHeader,
  ConfidenceBadge,
  DataTable,
  PageHeader,
  SeverityBadge,
} from "@/components/ui";
import { collectRecommendations } from "@/lib/analysis/engine";
import { loadAnalysis } from "@/lib/analysis/load";
import { LEVEL_LABEL, LEVEL_LABEL_F } from "@/lib/analysis/types";
import { requireUser } from "@/lib/auth/session";
import { getStore } from "@/lib/db";
import { getMetric, requireMetric } from "@/lib/metrics/catalog";
import { formatAbsoluteDelta, formatMetric, formatRelative } from "@/lib/metrics/format";
import { PROVENANCE_LABEL } from "@/lib/metrics/types";
import { enrichAnalysis } from "@/services/ai";

export const metadata: Metadata = { title: "Informe" };

export default async function ReportPage({
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
  const tasks = await getStore().listTasks(user.id, id);
  const ranked = collectRecommendations(result).slice(0, 6);

  const kpis = [
    ...new Set(ranked.flatMap(({ recommendation }) => recommendation.kpis)),
  ];

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href={`/analisis/${id}`} className="hover:text-ink">
            ← Volver a la comparación
          </Link>
        }
        title="Informe del análisis"
        description={`${input.own.name} frente a ${input.rival.name} · ${new Date(stored.createdAt).toLocaleDateString("es-ES")}`}
        action={<PrintButton />}
      />

      <div className="space-y-6">
        <Card>
          <CardHeader
            title="1. Resumen ejecutivo"
            action={
              <Badge tone="neutral">
                {ai.isModelGenerated ? "Interpretación de IA" : "Sin IA"}
              </Badge>
            }
          />
          <p className="text-sm leading-relaxed text-ink-2">
            {ai.insights.executiveSummary}
          </p>
          {ai.insights.caveats.length > 0 ? (
            <ul className="mt-4 space-y-1 border-t border-line pt-4 text-xs text-ink-muted">
              {ai.insights.caveats.map((caveat) => (
                <li key={caveat}>· {caveat}</li>
              ))}
            </ul>
          ) : null}
        </Card>

        <Card>
          <CardHeader
            title="2. Situación de ambas empresas"
            description="Métricas principales, con la procedencia de cada dato."
          />
          <DataTable
            head={["Métrica", input.own.name, input.rival.name, "Diferencia"]}
            caption="Comparación de métricas principales"
          >
            {result.gaps
              .filter((gap) => gap.ownValue !== null || gap.rivalValue !== null)
              .slice(0, 24)
              .map((gap) => {
                const metric = requireMetric(gap.metricId);
                return (
                  <tr key={gap.metricId} className="border-b border-line last:border-b-0">
                    <th scope="row" className="px-3 py-2 text-left font-normal text-ink">
                      {metric.label}
                    </th>
                    <td className="tabular px-3 py-2 text-right text-ink">
                      {formatMetric(metric, gap.ownValue)}
                      <span className="block text-[11px] text-ink-muted">
                        {PROVENANCE_LABEL[gap.ownProvenance]}
                      </span>
                    </td>
                    <td className="tabular px-3 py-2 text-right text-ink">
                      {formatMetric(metric, gap.rivalValue)}
                      <span className="block text-[11px] text-ink-muted">
                        {PROVENANCE_LABEL[gap.rivalProvenance]}
                      </span>
                    </td>
                    <td className="tabular px-3 py-2 text-right text-ink-2">
                      {gap.known ? formatRelative(gap.relativeGap) : "—"}
                    </td>
                  </tr>
                );
              })}
          </DataTable>
        </Card>

        <Card>
          <CardHeader
            title="3. Principales diferencias"
            description="Ordenadas por impacto, con el criterio de cálculo a la vista."
          />
          <ol className="space-y-4">
            {result.findings.slice(0, 6).map((finding) => {
              const metric = requireMetric(finding.metricId);
              return (
                <li key={finding.id} className="border-b border-line pb-4 last:border-b-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">{metric.label}</p>
                    <SeverityBadge level={finding.severity} />
                  </div>
                  <p className="tabular mt-1 text-sm text-ink-2">
                    {formatMetric(metric, finding.gap.ownValue)} frente a{" "}
                    {formatMetric(metric, finding.gap.rivalValue)} ·{" "}
                    {formatAbsoluteDelta(metric, finding.gap.absoluteGap)}
                  </p>
                  <p className="mt-2 text-xs text-ink-muted">{finding.impactRationale}</p>
                </li>
              );
            })}
          </ol>
        </Card>

        <Card>
          <CardHeader
            title="4. Posibles causas"
            description="Cada causa con su nivel de confianza. Ninguna es una conclusión cerrada."
          />
          <ul className="space-y-3">
            {result.findings.slice(0, 6).flatMap((finding) =>
              finding.hypotheses.slice(0, 2).map((hypothesis) => (
                <li
                  key={hypothesis.id}
                  className="rounded-lg border border-line bg-surface-2 p-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm text-ink">
                      <span className="text-ink-muted">
                        {requireMetric(finding.metricId).label}:{" "}
                      </span>
                      {hypothesis.statement}
                    </p>
                    <ConfidenceBadge level={hypothesis.confidence} />
                  </div>
                  {hypothesis.evidence.length > 0 ? (
                    <p className="mt-1 text-xs text-ink-muted">
                      {hypothesis.evidence[0].note}
                    </p>
                  ) : null}
                </li>
              )),
            )}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="5. Oportunidades"
            description="Dónde está el mayor recorrido según la relación entre impacto y esfuerzo."
          />
          <ol className="space-y-2">
            {ranked.map(({ finding, recommendation }, index) => (
              <li key={recommendation.id} className="flex items-start gap-3 text-sm">
                <span className="tabular mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-semibold text-ink">
                  {index + 1}
                </span>
                <span>
                  <span className="text-ink">{recommendation.title}</span>
                  <span className="tabular text-ink-muted">
                    {" "}
                    · impacto {finding.impactScore} · esfuerzo{" "}
                    {recommendation.effortScore}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </Card>

        <Card>
          <CardHeader title="6. Recomendaciones" />
          <div className="space-y-5">
            {ranked.map(({ recommendation }) => (
              <div key={recommendation.id} className="border-b border-line pb-5 last:border-b-0 last:pb-0">
                <p className="text-sm font-semibold text-ink">{recommendation.title}</p>
                <p className="mt-1 text-sm text-ink-2">{recommendation.summary}</p>
                <p className="mt-2 text-xs text-ink-muted">
                  Coste {LEVEL_LABEL[recommendation.cost].toLowerCase()} · dificultad{" "}
                  {LEVEL_LABEL_F[recommendation.difficulty].toLowerCase()} · impacto
                  potencial {LEVEL_LABEL[recommendation.impact].toLowerCase()}
                </p>
                <ol className="mt-3 space-y-1">
                  {recommendation.steps.map((step, index) => (
                    <li key={step} className="text-sm text-ink-2">
                      {index + 1}. {step}
                    </li>
                  ))}
                </ol>
                <p className="mt-3 text-xs text-ink-muted">
                  {recommendation.expectedEffect}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="7. Plan de acción"
            description={
              tasks.length === 0
                ? "Todavía no se ha creado ninguna tarea."
                : `${tasks.length} tareas, ${tasks.filter((t) => t.status === "DONE").length} completadas.`
            }
          />
          {tasks.length === 0 ? (
            <p className="text-sm text-ink-2">
              Las recomendaciones pueden convertirse en tareas desde la página de
              cada problema.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {tasks.map((task) => (
                <li key={task.id} className="text-sm text-ink-2">
                  <span className="text-ink-muted">Semana {task.week} · </span>
                  {task.status === "DONE" ? "✔ " : "☐ "}
                  {task.title}
                  {task.assignee ? (
                    <span className="text-ink-muted"> · {task.assignee}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="8. KPI que hay que seguir"
            description="Indicadores a vigilar para saber si las acciones están funcionando."
          />
          {kpis.length === 0 ? (
            <p className="text-sm text-ink-2">
              No hay KPI asociados todavía: dependen de las acciones que se
              elijan.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {kpis.map((kpi) => {
                const metric = getMetric(kpi);
                if (!metric) return null;
                return (
                  <li key={kpi}>
                    <Badge tone="neutral">{metric.label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <p className="text-xs text-ink-muted">
          Informe generado el{" "}
          {new Date(result.generatedAt).toLocaleString("es-ES")}. Las conclusiones
          se apoyan en los datos introducidos y en las reglas de análisis
          descritas en cada apartado; no constituyen una garantía de resultado.
          {stored.isDemo ? " Este informe usa datos ficticios de demostración." : ""}
        </p>
      </div>
    </>
  );
}
