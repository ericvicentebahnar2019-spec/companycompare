import { AddToPlan } from "@/components/analysis/add-to-plan";
import { Badge, Card } from "@/components/ui";
import { LEVEL_LABEL, LEVEL_LABEL_F, type Level, type Recommendation } from "@/lib/analysis/types";
import { getMetric } from "@/lib/metrics/catalog";

const LEVEL_TONE: Record<Level, "good" | "warning" | "critical"> = {
  low: "good",
  medium: "warning",
  high: "critical",
};

/**
 * Una acción recomendada, con todo lo que hace falta para decidir si merece la
 * pena: los pasos, lo que cuesta, lo difícil que es, qué efecto es plausible y
 * qué KPI hay que vigilar después.
 */
export function RecommendationCard({
  recommendation,
  analysisId,
}: {
  recommendation: Recommendation;
  analysisId: string;
}) {
  return (
    <Card className="bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-ink">{recommendation.title}</h3>
          <p className="mt-1 text-sm text-ink-2">{recommendation.summary}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge tone={LEVEL_TONE[recommendation.cost]}>
          Coste {LEVEL_LABEL[recommendation.cost].toLowerCase()}
        </Badge>
        <Badge tone={LEVEL_TONE[recommendation.difficulty]}>
          Dificultad {LEVEL_LABEL_F[recommendation.difficulty].toLowerCase()}
        </Badge>
        <Badge tone={LEVEL_TONE[recommendation.impact]}>
          Impacto potencial {LEVEL_LABEL[recommendation.impact].toLowerCase()}
        </Badge>
      </div>

      <div className="mt-5">
        <p className="text-sm font-medium text-ink">Cómo hacerlo</p>
        <ol className="mt-2 space-y-2">
          {recommendation.steps.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm text-ink-2">
              <span className="tabular mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-semibold text-ink">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-5 rounded-lg border border-line bg-surface-2 p-3">
        <p className="text-sm font-medium text-ink">Qué efecto es plausible</p>
        <p className="mt-1 text-sm text-ink-2">{recommendation.expectedEffect}</p>
      </div>

      {recommendation.kpis.length > 0 ? (
        <div className="mt-5">
          <p className="text-sm font-medium text-ink">KPI que hay que vigilar</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {recommendation.kpis.map((kpi) => {
              const metric = getMetric(kpi);
              if (!metric) return null;
              return (
                <li key={kpi}>
                  <Badge tone="neutral">{metric.label}</Badge>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="mt-5">
        <AddToPlan recommendation={recommendation} analysisId={analysisId} />
      </div>
    </Card>
  );
}
