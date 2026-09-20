import Link from "next/link";

import { AddToPlan } from "@/components/analysis/add-to-plan";
import { Badge, Card } from "@/components/ui";
import { collectRecommendations } from "@/lib/analysis/engine";
import { LEVEL_LABEL, LEVEL_LABEL_F, type AnalysisResult } from "@/lib/analysis/types";
import { getMetric, requireMetric } from "@/lib/metrics/catalog";
import { formatAbsoluteDelta, formatMetric } from "@/lib/metrics/format";

/**
 * Lo primero que ve el empresario: una sola cosa que hacer.
 *
 * Un listado de treinta diferencias no ayuda a quien tiene poco tiempo y
 * necesita avanzar; paraliza. Aquí se elige la acción con mejor relación entre
 * impacto y esfuerzo y se explica de dónde sale, con los números delante. El
 * resto del análisis sigue estando debajo para quien quiera profundizar.
 */
export function NextAction({
  result,
  analysisId,
  ownName,
  rivalName,
}: {
  result: AnalysisResult;
  analysisId: string;
  ownName: string;
  rivalName: string;
}) {
  const best = collectRecommendations(result)[0];
  if (!best) return null;

  const { finding, recommendation } = best;
  const metric = requireMetric(finding.metricId);

  return (
    <Card className="border-accent/40 bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            Empieza por aquí
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">
            {recommendation.title}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={recommendation.cost === "low" ? "good" : "warning"}>
            Coste {LEVEL_LABEL[recommendation.cost].toLowerCase()}
          </Badge>
          <Badge tone={recommendation.difficulty === "low" ? "good" : "warning"}>
            Dificultad {LEVEL_LABEL_F[recommendation.difficulty].toLowerCase()}
          </Badge>
        </div>
      </div>

      <p className="mt-3 text-sm text-ink-2">{recommendation.summary}</p>

      <div className="mt-5 rounded-lg border border-line bg-surface-2 p-4">
        <p className="text-sm font-medium text-ink">Por qué esto y no otra cosa</p>
        <p className="tabular mt-1 text-sm text-ink-2">
          En {metric.label.toLowerCase()} vas por detrás:{" "}
          <strong className="font-medium text-ink">
            {formatMetric(metric, finding.gap.ownValue)}
          </strong>{" "}
          frente a los{" "}
          <strong className="font-medium text-ink">
            {formatMetric(metric, finding.gap.rivalValue)}
          </strong>{" "}
          de {rivalName} ({formatAbsoluteDelta(metric, finding.gap.absoluteGap)}). Es
          la diferencia con mayor impacto de las que se pueden corregir con menos
          esfuerzo.
        </p>
        {finding.hypotheses[0] ? (
          <p className="mt-2 text-sm text-ink-2">
            <span className="text-ink-muted">Causa más probable: </span>
            {finding.hypotheses[0].statement}
          </p>
        ) : null}
      </div>

      <div className="mt-5">
        <p className="text-sm font-medium text-ink">Los primeros pasos</p>
        <ol className="mt-2 space-y-2">
          {recommendation.steps.slice(0, 3).map((step, index) => (
            <li key={step} className="flex gap-3 text-sm text-ink-2">
              <span className="tabular mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-semibold text-ink">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        {recommendation.steps.length > 3 ? (
          <p className="mt-2 pl-8 text-xs text-ink-muted">
            {recommendation.steps.length - 3 === 1
              ? "Y un paso más, en el detalle del problema."
              : `Y ${recommendation.steps.length - 3} pasos más, en el detalle del problema.`}
          </p>
        ) : null}
      </div>

      {recommendation.kpis.length > 0 ? (
        <p className="mt-4 text-xs text-ink-muted">
          Para saber si funciona, vigila:{" "}
          {recommendation.kpis
            .map((kpi) => getMetric(kpi)?.label)
            .filter(Boolean)
            .join(", ")
            .toLowerCase()}
          .
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <AddToPlan
          recommendation={recommendation}
          analysisId={analysisId}
          label="Ponerlo en marcha"
          variant="primary"
        />
        <Link
          href={`/analisis/${analysisId}/problema/${finding.metricId}`}
          className="text-sm text-ink-2 underline hover:text-ink"
        >
          Ver el análisis completo de {metric.label.toLowerCase()}
        </Link>
      </div>

      <p className="sr-only">
        Recomendación calculada para {ownName} a partir de la comparación con{" "}
        {rivalName}.
      </p>
    </Card>
  );
}
