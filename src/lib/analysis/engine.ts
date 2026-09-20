import { requireMetric } from "@/lib/metrics/catalog";
import { formatMetric } from "@/lib/metrics/format";
import type { AreaId, MetricValueMap } from "@/lib/metrics/types";
import { CAUSE_RULES, FALLBACK_RULE, type CauseRule } from "./knowledge";
import { decomposeRevenueGap } from "./revenue";
import {
  assessImpact,
  computeAllGaps,
  computeAreaScores,
  computeCoverage,
  computeStrengths,
  computeGap,
} from "./scoring";
import type {
  AnalysisInput,
  AnalysisResult,
  CheckItem,
  EvidenceItem,
  Finding,
  Gap,
  Hypothesis,
  Level,
  Recommendation,
} from "./types";

const LEVEL_VALUE: Record<Level, number> = { low: 1, medium: 2, high: 3 };

/** Esfuerzo 0-100 a partir de coste y dificultad, con el mismo peso cada uno. */
function effortScore(cost: Level, difficulty: Level): number {
  return Math.round(((LEVEL_VALUE[cost] + LEVEL_VALUE[difficulty]) / 6) * 100);
}

function numeric(values: MetricValueMap, id: string): number | null {
  const entry = values[id];
  if (!entry || typeof entry.value !== "number" || !Number.isFinite(entry.value)) {
    return null;
  }
  return entry.value;
}

/**
 * Evalúa una regla contra los datos y devuelve la evidencia encontrada.
 *
 * Dos clases de señal cuentan como evidencia:
 * - la empresa propia está también por detrás en una métrica de apoyo;
 * - un indicador propio está por debajo de un umbral absoluto, lo que señala
 *   la ausencia de un habilitador (no hay CRM, casi nadie recibe emails...).
 */
function gatherEvidence(
  rule: CauseRule,
  own: MetricValueMap,
  rival: MetricValueMap,
): { evidence: EvidenceItem[]; missing: string[] } {
  const evidence: EvidenceItem[] = [];
  const missing: string[] = [];

  for (const support of rule.supports ?? []) {
    const metric = requireMetric(support.metricId);
    const gap = computeGap(metric, own, rival);
    if (!gap.known) {
      missing.push(support.metricId);
      continue;
    }
    if (gap.favors === "rival") {
      evidence.push({
        metricId: support.metricId,
        note: `${support.reading} (${formatMetric(metric, gap.ownValue)} frente a ${formatMetric(metric, gap.rivalValue)}).`,
      });
    }
  }

  for (const signal of rule.absoluteSignals ?? []) {
    const value = numeric(own, signal.metricId);
    if (value === null) {
      missing.push(signal.metricId);
      continue;
    }
    if (value < signal.below) {
      const metric = requireMetric(signal.metricId);
      evidence.push({
        metricId: signal.metricId,
        note: `${signal.reading} (valor actual: ${formatMetric(metric, value)}).`,
      });
    }
  }

  return { evidence, missing: [...new Set(missing)] };
}

/**
 * Nivel de confianza de una hipótesis, con el criterio expuesto:
 * - Alta: dos o más señales independientes en los datos la sostienen.
 * - Media: una sola señal la sostiene.
 * - Baja: ninguna señal en los datos; queda como hipótesis por comprobar.
 */
function confidenceFrom(
  evidenceCount: number,
  missingCount: number,
): { level: Level; rationale: string } {
  if (evidenceCount >= 2) {
    return {
      level: "high",
      rationale: `Confianza alta: ${evidenceCount} señales independientes de los datos introducidos apuntan en la misma dirección. Criterio: alta con dos o más señales, media con una, baja sin ninguna.`,
    };
  }
  if (evidenceCount === 1) {
    return {
      level: "medium",
      rationale:
        "Confianza media: solo una señal de los datos sostiene esta hipótesis. Criterio: alta con dos o más señales, media con una, baja sin ninguna.",
    };
  }
  const missingNote =
    missingCount > 0
      ? ` Faltan ${missingCount} ${missingCount === 1 ? "dato" : "datos"} que permitirían comprobarla.`
      : "";
  return {
    level: "low",
    rationale: `Confianza baja: ningún dato del análisis sostiene ni descarta esta causa, así que es una hipótesis por comprobar.${missingNote} Criterio: alta con dos o más señales, media con una, baja sin ninguna.`,
  };
}

function buildRecommendation(
  rule: CauseRule,
  findingId: string,
  impact: Level,
): Recommendation {
  const template = rule.recommendation;
  return {
    id: `${findingId}__${rule.id}`,
    title: template.title,
    summary: template.summary,
    steps: [...template.steps],
    cost: template.cost,
    difficulty: template.difficulty,
    impact,
    expectedEffect: template.expectedEffect,
    kpis: [...template.kpis],
    effortScore: effortScore(template.cost, template.difficulty),
  };
}

function buildHypothesis(
  rule: CauseRule,
  findingId: string,
  own: MetricValueMap,
  rival: MetricValueMap,
): Hypothesis {
  const { evidence, missing } = gatherEvidence(rule, own, rival);
  const confidence = confidenceFrom(evidence.length, missing.length);

  const checks: CheckItem[] = rule.checks.map((question) => ({ question }));
  for (const metricId of missing) {
    const metric = requireMetric(metricId);
    checks.push({
      question: `Falta el dato de ${metric.label.toLowerCase()}: añadirlo permitiría confirmar o descartar esta causa.`,
      metricId,
    });
  }

  return {
    id: `${findingId}__${rule.id}`,
    statement: rule.statement,
    rationale: rule.mechanism,
    confidence: confidence.level,
    confidenceRationale: confidence.rationale,
    evidence,
    checks,
  };
}

/** Reglas aplicables a una métrica, ordenadas por evidencia disponible. */
function rulesFor(metricId: string): CauseRule[] {
  return CAUSE_RULES.filter((rule) => rule.metrics.includes(metricId));
}

function buildFinding(gap: Gap, own: MetricValueMap, rival: MetricValueMap): Finding | null {
  const metric = requireMetric(gap.metricId);
  const impact = assessImpact(metric, gap);
  if (!impact) return null;

  const findingId = `f_${gap.metricId}`;
  const applicable = rulesFor(gap.metricId);

  const hypotheses = applicable.map((rule) =>
    buildHypothesis(rule, findingId, own, rival),
  );

  // Las hipótesis mejor sostenidas primero: es el orden en que un consultor
  // las plantearía.
  const order: Record<Level, number> = { high: 0, medium: 1, low: 2 };
  hypotheses.sort((a, b) => {
    const byConfidence = order[a.confidence] - order[b.confidence];
    if (byConfidence !== 0) return byConfidence;
    return b.evidence.length - a.evidence.length;
  });

  const recommendations = applicable.map((rule) =>
    buildRecommendation(rule, findingId, impact.severity),
  );

  if (hypotheses.length === 0) {
    const fallback: CauseRule = { ...FALLBACK_RULE, metrics: [gap.metricId] };
    hypotheses.push(buildHypothesis(fallback, findingId, own, rival));
    recommendations.push(buildRecommendation(fallback, findingId, impact.severity));
  }

  // Ordena las acciones por relación entre impacto y esfuerzo.
  recommendations.sort((a, b) => a.effortScore - b.effortScore);

  return {
    id: findingId,
    metricId: gap.metricId,
    area: metric.area,
    gap,
    severity: impact.severity,
    impactScore: impact.score,
    impactRationale: impact.rationale,
    hypotheses,
    recommendations,
  };
}

/**
 * Ejecuta el análisis completo de forma determinista.
 *
 * No hay ninguna llamada externa ni ningún número inventado: todo sale de los
 * datos introducidos y de reglas explícitas. La capa de IA trabaja después
 * sobre este resultado y sus aportaciones quedan marcadas como inferencias.
 */
export function runAnalysis(input: AnalysisInput): AnalysisResult {
  const own = input.own.values;
  const rival = input.rival.values;

  const gaps = computeAllGaps(input.own, input.rival);

  const findings = gaps
    .map((gap) => buildFinding(gap, own, rival))
    .filter((f): f is Finding => f !== null)
    .sort((a, b) => b.impactScore - a.impactScore);

  const findingsByArea = new Map<AreaId, number>();
  for (const finding of findings) {
    findingsByArea.set(finding.area, (findingsByArea.get(finding.area) ?? 0) + 1);
  }

  return {
    analysisId: input.id,
    generatedAt: new Date().toISOString(),
    gaps,
    findings,
    areaScores: computeAreaScores(gaps, findingsByArea),
    revenue: decomposeRevenueGap(own, rival),
    coverage: computeCoverage(gaps),
    strengths: computeStrengths(gaps),
  };
}

/** Acciones únicas de todo el análisis, con su hallazgo de origen. */
export function collectRecommendations(
  result: AnalysisResult,
): { finding: Finding; recommendation: Recommendation }[] {
  const seen = new Set<string>();
  const out: { finding: Finding; recommendation: Recommendation }[] = [];

  for (const finding of result.findings) {
    for (const recommendation of finding.recommendations) {
      const key = recommendation.title;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ finding, recommendation });
    }
  }

  // Primero lo de mayor impacto y menor esfuerzo.
  return out.sort((a, b) => {
    const scoreA = a.finding.impactScore - a.recommendation.effortScore;
    const scoreB = b.finding.impactScore - b.recommendation.effortScore;
    return scoreB - scoreA;
  });
}
