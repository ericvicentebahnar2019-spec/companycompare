import { requireMetric } from "@/lib/metrics/catalog";
import type { AnalysisResult } from "./types";

export interface DataGap {
  metricId: string;
  /** De qué empresa falta el dato. */
  missingFor: "own" | "rival" | "both";
  /** Qué se gana al aportarlo, en lenguaje de negocio. */
  reason: string;
  /** Hallazgo al que afecta, para poder enlazarlo. */
  findingMetricId: string;
  /** Solo para ordenar; no se muestra. */
  score: number;
}

/**
 * Decide qué dato pedir a continuación.
 *
 * No se trata de completar el formulario por completarlo. El motor ya anota,
 * en las comprobaciones de cada hipótesis, qué métricas le faltan para poder
 * confirmarla o descartarla; esas son exactamente las preguntas que compensa
 * hacer. Se ordenan por el impacto del hallazgo al que afectan y por el peso
 * de la métrica, de modo que la primera pregunta sea la que más cambia el
 * diagnóstico.
 *
 * Un dato que no resolvería ninguna duda abierta no se pide, por mucho que el
 * catálogo lo contemple.
 */
export function suggestNextData(result: AnalysisResult, limit = 3): DataGap[] {
  const byMetric = new Map<string, DataGap>();

  for (const finding of result.findings) {
    for (const hypothesis of finding.hypotheses) {
      for (const check of hypothesis.checks) {
        if (!check.metricId) continue;

        const metric = requireMetric(check.metricId);
        const gap = result.gaps.find((g) => g.metricId === check.metricId);
        if (!gap) continue;

        // Si ya se conocen los dos valores no hay nada que pedir.
        const missingOwn = gap.ownValue === null;
        const missingRival = gap.rivalValue === null;
        if (!missingOwn && !missingRival) continue;

        const score = finding.impactScore * metric.weight;
        const existing = byMetric.get(check.metricId);
        if (existing && existing.score >= score) continue;

        byMetric.set(check.metricId, {
          metricId: check.metricId,
          missingFor: missingOwn && missingRival ? "both" : missingOwn ? "own" : "rival",
          reason: hypothesis.statement,
          findingMetricId: finding.metricId,
          score,
        });
      }
    }
  }

  return [...byMetric.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}
