import { requireMetric } from "@/lib/metrics/catalog";
import { formatMetric, formatRelative } from "@/lib/metrics/format";
import { LEVEL_LABEL } from "@/lib/analysis/types";
import type { AnalysisInput, AnalysisResult } from "@/lib/analysis/types";
import type { AiRequest } from "./schemas";

/**
 * Convierte el resultado del motor determinista en la entrada del modelo.
 *
 * Solo viaja lo necesario para interpretar: nombres de empresa, cifras ya
 * formateadas y los hallazgos. No se envían datos de la cuenta del usuario ni
 * identificadores internos más allá del id del hallazgo, que hace falta para
 * poder asociar la respuesta.
 */
export function buildAiRequest(
  input: AnalysisInput,
  result: AnalysisResult,
): AiRequest {
  return {
    own: {
      name: input.own.name,
      sector: input.own.sector ?? null,
      country: input.own.country ?? null,
    },
    rival: {
      name: input.rival.name,
      sector: input.rival.sector ?? null,
      country: input.rival.country ?? null,
    },
    coverage: {
      known: result.coverage.known,
      total: result.coverage.total,
      unknownMetrics: [
        ...new Set([...result.coverage.unknownOwn, ...result.coverage.unknownRival]),
      ].map((id) => requireMetric(id).label),
    },
    revenueDecomposition: result.revenue.available
      ? {
          note: result.revenue.note,
          factors: result.revenue.factors.map((factor) => {
            const metric = requireMetric(factor.metricId);
            return {
              metric: metric.label,
              ownValue: formatMetric(metric, factor.ownValue),
              rivalValue: formatMetric(metric, factor.rivalValue),
              contributionPct: Math.round(factor.contribution * 100),
            };
          }),
        }
      : null,
    findings: result.findings.slice(0, 12).map((finding) => {
      const metric = requireMetric(finding.metricId);
      return {
        findingId: finding.id,
        metric: metric.label,
        area: finding.area,
        ownValue: formatMetric(metric, finding.gap.ownValue),
        rivalValue: formatMetric(metric, finding.gap.rivalValue),
        gap: formatRelative(finding.gap.relativeGap),
        severity: LEVEL_LABEL[finding.severity],
        impactScore: finding.impactScore,
        existingHypotheses: finding.hypotheses.map((h) => h.statement),
      };
    }),
    strengths: result.strengths.slice(0, 6).map((gap) => {
      const metric = requireMetric(gap.metricId);
      return {
        metric: metric.label,
        ownValue: formatMetric(metric, gap.ownValue),
        rivalValue: formatMetric(metric, gap.rivalValue),
      };
    }),
  };
}
