import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RecommendationCard } from "@/components/analysis/recommendation-card";
import {
  Badge,
  Card,
  CardHeader,
  ConfidenceBadge,
  PageHeader,
  ProvenanceTag,
  SeverityBadge,
  StatTile,
} from "@/components/ui";
import { loadAnalysis } from "@/lib/analysis/load";
import { requireUser } from "@/lib/auth/session";
import { requireMetric } from "@/lib/metrics/catalog";
import { formatAbsoluteDelta, formatMetric, formatRelative } from "@/lib/metrics/format";
import { AREA_META } from "@/lib/metrics/types";
import { enrichAnalysis } from "@/services/ai";

export const metadata: Metadata = { title: "Análisis del problema" };

export default async function ProblemPage({
  params,
}: {
  params: Promise<{ id: string; metricId: string }>;
}) {
  const { id, metricId } = await params;
  const user = await requireUser();
  const loaded = await loadAnalysis(user.id, id);
  if (!loaded) notFound();

  const finding = loaded.result.findings.find((f) => f.metricId === metricId);
  if (!finding) notFound();

  const metric = requireMetric(metricId);
  const { input } = loaded;
  const ai = await enrichAnalysis(input, loaded.result);
  const diagnosis = ai.insights.diagnoses.find((d) => d.findingId === finding.id);
  const aiHypotheses = ai.insights.additionalHypotheses.filter(
    (h) => h.findingId === finding.id,
  );

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href={`/analisis/${id}`} className="hover:text-ink">
            ← Volver a la comparación
          </Link>
        }
        title={`${AREA_META[finding.area].icon} ${metric.label}`}
        description={metric.help}
        action={<SeverityBadge level={finding.severity} />}
      />

      <div className="space-y-6">
        <Card>
          <CardHeader title="Situación" />
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile
              label={input.own.name}
              value={formatMetric(metric, finding.gap.ownValue)}
              accent="own"
              hint={<ProvenanceTag provenance={finding.gap.ownProvenance} />}
            />
            <StatTile
              label={input.rival.name}
              value={formatMetric(metric, finding.gap.rivalValue)}
              accent="rival"
              hint={<ProvenanceTag provenance={finding.gap.rivalProvenance} />}
            />
            <StatTile
              label="Diferencia"
              value={formatAbsoluteDelta(metric, finding.gap.absoluteGap)}
              hint={formatRelative(finding.gap.relativeGap)}
            />
          </div>

          <div className="mt-5 rounded-lg border border-line bg-surface-2 p-4">
            <p className="text-sm font-medium text-ink">
              Cómo se ha calculado el impacto: {finding.impactScore} sobre 100
            </p>
            <p className="mt-1 text-sm text-ink-2">{finding.impactRationale}</p>
          </div>

          {diagnosis ? (
            <div className="mt-5 border-t border-line pt-5">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-ink">
                  ¿Qué puede explicar esta diferencia?
                </p>
                <Badge tone="neutral">
                  {ai.isModelGenerated ? "Inferencia de IA" : "Lectura del motor"}
                </Badge>
              </div>
              <p className="text-sm leading-relaxed text-ink-2">
                {diagnosis.interpretation}
              </p>
            </div>
          ) : null}
        </Card>

        <Card>
          <CardHeader
            title="Posibles causas"
            description="Cada causa indica en qué se apoya, con qué confianza y qué falta por comprobar. Ninguna se presenta como un hecho."
          />

          <ol className="space-y-4">
            {finding.hypotheses.map((hypothesis, index) => (
              <li
                key={hypothesis.id}
                className="rounded-lg border border-line bg-surface-2 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">
                    {index + 1}. {hypothesis.statement}
                  </p>
                  <ConfidenceBadge level={hypothesis.confidence} />
                </div>

                <p className="mt-2 text-sm text-ink-2">{hypothesis.rationale}</p>

                <div className="mt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                    Evidencia disponible
                  </p>
                  {hypothesis.evidence.length === 0 ? (
                    <p className="mt-1 text-sm text-ink-2">
                      Ningún dato del análisis sostiene ni descarta esta causa.
                    </p>
                  ) : (
                    <ul className="mt-1 space-y-1">
                      {hypothesis.evidence.map((item) => (
                        <li key={item.metricId} className="text-sm text-ink-2">
                          · {item.note}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <p className="mt-3 text-xs text-ink-muted">
                  {hypothesis.confidenceRationale}
                </p>

                <div className="mt-4 border-t border-line pt-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                    Qué habría que comprobar
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {hypothesis.checks.map((check) => (
                      <li
                        key={check.question}
                        className="flex items-start gap-2 text-sm text-ink-2"
                      >
                        <span
                          aria-hidden
                          className="mt-1 size-3 shrink-0 rounded-[3px] border border-line-strong"
                        />
                        {check.question}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}

            {aiHypotheses.map((hypothesis, index) => (
              <li
                key={`ai-${index}`}
                className="rounded-lg border border-dashed border-line-strong bg-surface-2 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">
                    {finding.hypotheses.length + index + 1}. {hypothesis.statement}
                  </p>
                  <div className="flex gap-2">
                    <Badge tone="neutral">Inferencia de IA</Badge>
                    <ConfidenceBadge level={hypothesis.confidence} />
                  </div>
                </div>
                <p className="mt-2 text-sm text-ink-2">{hypothesis.rationale}</p>
                {hypothesis.checks.length > 0 ? (
                  <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
                    {hypothesis.checks.map((check) => (
                      <li key={check} className="flex items-start gap-2 text-sm text-ink-2">
                        <span
                          aria-hidden
                          className="mt-1 size-3 shrink-0 rounded-[3px] border border-line-strong"
                        />
                        {check}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>
        </Card>

        <section>
          <h2 className="mb-1 text-base font-semibold text-ink">Qué puedes hacer</h2>
          <p className="mb-4 text-sm text-ink-2">
            Acciones concretas ordenadas de menor a mayor esfuerzo. Ninguna
            garantiza un resultado: lo que se describe es el efecto plausible y
            qué medir para saber si está funcionando.
          </p>
          <div className="space-y-4">
            {finding.recommendations.map((recommendation) => (
              <RecommendationCard
                key={recommendation.id}
                recommendation={recommendation}
                analysisId={id}
              />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
