import { ALL_METRICS, requireMetric } from "@/lib/metrics/catalog";
import { formatMetric, formatRelative } from "@/lib/metrics/format";
import type { MetricDefinition, MetricValueMap } from "@/lib/metrics/types";
import type { AreaId } from "@/lib/metrics/types";
import type { AreaScore, CompanyProfile, DataCoverage, Gap, Level } from "./types";

/** Umbrales de severidad sobre la puntuación de impacto 0-100. */
export const SEVERITY_THRESHOLDS = { high: 66, medium: 33 } as const;

/**
 * Múltiplo de la materialidad en el que la brecha satura la escala. Una
 * brecha de 4× el umbral de la métrica ya puntúa el máximo por magnitud: a
 * partir de ahí lo que cambia el orden de prioridad es el peso de la métrica,
 * no seguir creciendo.
 */
export const SATURATION_MULTIPLE = 4;

function numeric(values: MetricValueMap, id: string): number | null {
  const entry = values[id];
  if (!entry || entry.value === null || typeof entry.value !== "number") return null;
  return Number.isFinite(entry.value) ? entry.value : null;
}

function provenanceOf(values: MetricValueMap, id: string) {
  return values[id]?.provenance ?? "unknown";
}

/** Calcula la brecha de una métrica entre las dos empresas. */
export function computeGap(
  metric: MetricDefinition,
  own: MetricValueMap,
  rival: MetricValueMap,
): Gap {
  const ownValue = numeric(own, metric.id);
  const rivalValue = numeric(rival, metric.id);
  const known = ownValue !== null && rivalValue !== null;

  const base: Gap = {
    metricId: metric.id,
    area: metric.area,
    ownValue,
    rivalValue,
    ownProvenance: provenanceOf(own, metric.id),
    rivalProvenance: provenanceOf(rival, metric.id),
    relativeGap: null,
    absoluteGap: null,
    favors: "unknown",
    known,
  };

  if (!known || ownValue === null || rivalValue === null) return base;

  const absoluteGap = ownValue - rivalValue;

  // La brecha relativa se mide contra el competidor. Con base cero o signos
  // opuestos el cociente deja de tener sentido, así que se omite.
  let relativeGap: number | null = null;
  if (rivalValue !== 0 && ownValue * rivalValue >= 0) {
    relativeGap = (ownValue - rivalValue) / Math.abs(rivalValue);
  }

  let favors: Gap["favors"] = "tie";
  if (absoluteGap !== 0 && metric.direction !== "neutral") {
    const ownIsBetter =
      metric.direction === "higher" ? absoluteGap > 0 : absoluteGap < 0;
    favors = ownIsBetter ? "own" : "rival";
  }

  return { ...base, absoluteGap, relativeGap, favors };
}

/** Escala efectiva de la métrica: explícita si la declara, si no por formato. */
export function gapScaleOf(metric: MetricDefinition): "points" | "relative" {
  return metric.gapScale ?? (metric.format === "percent" ? "points" : "relative");
}

/**
 * Cuántas veces la brecha supera el umbral de materialidad de la métrica,
 * medida en la escala que corresponda. Devuelve `null` si no hay brecha en la
 * dirección pedida o si faltan datos.
 */
function gapMultiple(
  metric: MetricDefinition,
  gap: Gap,
  side: "rival" | "own",
): number | null {
  if (!gap.known || gap.favors !== side) return null;
  if (metric.materiality <= 0) return null;

  if (gapScaleOf(metric) === "points") {
    if (gap.absoluteGap === null) return null;
    return Math.abs(gap.absoluteGap) / (metric.materiality * 100);
  }

  if (gap.relativeGap === null) return null;
  return Math.abs(gap.relativeGap) / metric.materiality;
}

/** Magnitud de la desventaja propia, normalizada al umbral de la métrica. */
function disadvantageMagnitude(metric: MetricDefinition, gap: Gap): number | null {
  return gapMultiple(metric, gap, "rival");
}

export interface ImpactAssessment {
  score: number;
  severity: Level;
  rationale: string;
  /** Cuántas veces la brecha supera el umbral de materialidad. */
  materialityMultiple: number;
}

/**
 * Traduce una brecha en una puntuación de impacto explicable.
 *
 * score = 100 × magnitud × (0,4 + 0,6 × peso/3)
 *
 * donde `magnitud` es la brecha dividida entre el umbral de materialidad de
 * la métrica, recortada a 1 cuando alcanza 4 veces ese umbral. El factor de
 * peso hace que una métrica de apoyo (peso 1) no pueda superar 40 sobre 100 y
 * por tanto nunca se clasifique como impacto alto.
 */
export function assessImpact(
  metric: MetricDefinition,
  gap: Gap,
): ImpactAssessment | null {
  const raw = disadvantageMagnitude(metric, gap);
  if (raw === null || raw < 1) return null;

  const magnitude = Math.min(1, raw / SATURATION_MULTIPLE);
  const weightFactor = 0.4 + 0.6 * (metric.weight / 3);
  const score = Math.round(100 * magnitude * weightFactor);

  const severity: Level =
    score >= SEVERITY_THRESHOLDS.high
      ? "high"
      : score >= SEVERITY_THRESHOLDS.medium
        ? "medium"
        : "low";

  const usesPoints = gapScaleOf(metric) === "points";

  const gapText =
    usesPoints && gap.absoluteGap !== null
      ? `${Math.abs(gap.absoluteGap).toLocaleString("es-ES", { maximumFractionDigits: 1 })} puntos porcentuales`
      : formatRelative(gap.relativeGap);

  const thresholdText = usesPoints
    ? `${(metric.materiality * 100).toLocaleString("es-ES", { maximumFractionDigits: 1 })} puntos`
    : `${(metric.materiality * 100).toLocaleString("es-ES", { maximumFractionDigits: 0 })} %`;

  const es = (value: number, digits = 2) =>
    value.toLocaleString("es-ES", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });

  const rationale = [
    `La diferencia es de ${gapText}, ${es(raw, 1)} veces el umbral de materialidad de esta métrica (${thresholdText}).`,
    `Esa proporción, recortada al saturar en ${SATURATION_MULTIPLE} veces el umbral, da una magnitud de ${es(magnitude)}.`,
    `El peso de la métrica es ${metric.weight} sobre 3, que aporta un factor de ${es(weightFactor)}.`,
    `Impacto = 100 × ${es(magnitude)} × ${es(weightFactor)} = ${score} sobre 100.`,
    `Criterio: alto a partir de ${SEVERITY_THRESHOLDS.high}, medio a partir de ${SEVERITY_THRESHOLDS.medium}, bajo por debajo.`,
  ].join(" ");

  return { score, severity, rationale, materialityMultiple: raw };
}

/** Todas las brechas del análisis, incluidas las no comparables o desconocidas. */
export function computeAllGaps(own: CompanyProfile, rival: CompanyProfile): Gap[] {
  return ALL_METRICS.filter((m) => m.comparable).map((m) =>
    computeGap(m, own.values, rival.values),
  );
}

export function computeCoverage(gaps: Gap[]): DataCoverage {
  const unknownOwn = gaps.filter((g) => g.ownValue === null).map((g) => g.metricId);
  const unknownRival = gaps.filter((g) => g.rivalValue === null).map((g) => g.metricId);
  const known = gaps.filter((g) => g.known).length;

  return {
    total: gaps.length,
    known,
    unknownOwn,
    unknownRival,
    ratio: gaps.length > 0 ? known / gaps.length : 0,
  };
}

/**
 * Balance por área: media de las brechas conocidas ponderada por el peso de
 * cada métrica, recortada a ±1. Negativo significa desventaja.
 */
export function computeAreaScores(gaps: Gap[], findingsByArea: Map<AreaId, number>): AreaScore[] {
  const byArea = new Map<AreaId, Gap[]>();
  for (const gap of gaps) {
    const list = byArea.get(gap.area) ?? [];
    list.push(gap);
    byArea.set(gap.area, list);
  }

  const scores: AreaScore[] = [];
  for (const [area, areaGaps] of byArea) {
    const known = areaGaps.filter((g) => g.known);
    let balance: number | null = null;

    if (known.length > 0) {
      let weighted = 0;
      let weights = 0;
      for (const gap of known) {
        const metric = requireMetric(gap.metricId);
        if (metric.direction === "neutral") continue;
        const magnitude = disadvantageMagnitude(metric, gap);
        const advantage =
          gap.favors === "own"
            ? Math.min(1, (magnitudeFavourable(metric, gap) ?? 0) / SATURATION_MULTIPLE)
            : -Math.min(1, (magnitude ?? 0) / SATURATION_MULTIPLE);
        weighted += advantage * metric.weight;
        weights += metric.weight;
      }
      balance = weights > 0 ? weighted / weights : null;
    }

    scores.push({
      area,
      balance,
      findings: findingsByArea.get(area) ?? 0,
      known: known.length,
      total: areaGaps.length,
    });
  }

  return scores;
}

/** Magnitud de la ventaja, simétrica a `disadvantageMagnitude`. */
function magnitudeFavourable(metric: MetricDefinition, gap: Gap): number | null {
  return gapMultiple(metric, gap, "own");
}

/** Fortalezas: brechas materiales a favor de la empresa propia. */
export function computeStrengths(gaps: Gap[]): Gap[] {
  return gaps
    .filter((gap) => {
      if (gap.favors !== "own") return false;
      const metric = requireMetric(gap.metricId);
      const magnitude = magnitudeFavourable(metric, gap);
      return magnitude !== null && magnitude >= 1;
    })
    .sort((a, b) => {
      const ma = magnitudeFavourable(requireMetric(a.metricId), a) ?? 0;
      const mb = magnitudeFavourable(requireMetric(b.metricId), b) ?? 0;
      return mb - ma;
    });
}

/** Texto corto "245.000 € frente a 410.000 €" para cabeceras. */
export function describeGap(gap: Gap): string {
  const metric = requireMetric(gap.metricId);
  return `${formatMetric(metric, gap.ownValue)} frente a ${formatMetric(metric, gap.rivalValue)}`;
}
