import type { AiInsights, AiRequest } from "./schemas";
import type { AiProvider, AiResult } from "./types";

/**
 * Proveedor por defecto: no llama a ningún modelo.
 *
 * Redacta la interpretación a partir de los números que ya ha calculado el
 * motor determinista. El texto es plantilla rellenada con datos reales, así
 * que nunca afirma nada que no esté en el análisis. La interfaz lo etiqueta
 * como "análisis sin IA" precisamente por eso.
 */
export class MockAiProvider implements AiProvider {
  readonly id = "mock" as const;

  async enrich(request: AiRequest): Promise<AiResult> {
    return {
      insights: compose(request),
      provider: "mock",
      isModelGenerated: false,
    };
  }
}

function compose(request: AiRequest): AiInsights {
  const top = request.findings.slice(0, 3);
  const { own, rival, coverage } = request;

  const summaryParts: string[] = [];

  if (top.length === 0) {
    summaryParts.push(
      `Con los datos disponibles no se detecta ninguna diferencia material entre ${own.name} y ${rival.name}.`,
    );
  } else {
    const first = top[0];
    summaryParts.push(
      `La mayor distancia entre ${own.name} y ${rival.name} está en ${first.metric.toLowerCase()}: ${first.ownValue} frente a ${first.rivalValue}.`,
    );
    if (top.length > 1) {
      const rest = top.slice(1).map((f) => f.metric.toLowerCase());
      summaryParts.push(
        `Le siguen ${rest.join(" y ")}, ${top.length === 2 ? "que apunta" : "que apuntan"} en la misma dirección.`,
      );
    }
  }

  const revenue = request.revenueDecomposition;
  if (revenue && revenue.factors.length > 0) {
    const leader = [...revenue.factors].sort(
      (a, b) => b.contributionPct - a.contributionPct,
    )[0];
    if (leader.contributionPct > 0) {
      summaryParts.push(
        `De la diferencia de facturación, la mayor parte (${leader.contributionPct} %) se explica por ${leader.metric.toLowerCase()}: ${leader.ownValue} frente a ${leader.rivalValue}.`,
      );
    }
  }

  if (request.strengths.length > 0) {
    const strength = request.strengths[0];
    summaryParts.push(
      `No todo es desventaja: en ${strength.metric.toLowerCase()} la posición propia es mejor (${strength.ownValue} frente a ${strength.rivalValue}).`,
    );
  }

  if (top.length > 0) {
    summaryParts.push(
      `Conviene empezar por ${top[0].metric.toLowerCase()}, que es donde la combinación de tamaño de la brecha y peso de la métrica da el impacto más alto.`,
    );
  }

  const diagnoses = request.findings.map((finding) => ({
    findingId: finding.findingId,
    interpretation: buildInterpretation(finding, own.name, rival.name),
  }));

  const caveats: string[] = [];
  if (coverage.total > 0 && coverage.known / coverage.total < 0.8) {
    caveats.push(
      `Solo hay datos comparables en ${coverage.known} de ${coverage.total} métricas. Completar los que faltan puede cambiar el orden de prioridades.`,
    );
  }
  if (coverage.unknownMetrics.length > 0) {
    caveats.push(
      `Faltan datos de: ${coverage.unknownMetrics.slice(0, 6).join(", ")}${coverage.unknownMetrics.length > 6 ? " y otros" : ""}.`,
    );
  }
  if (own.sector && rival.sector && own.sector !== rival.sector) {
    caveats.push(
      `Las dos empresas operan en sectores distintos (${own.sector} y ${rival.sector}), así que algunas métricas no son directamente comparables.`,
    );
  }
  caveats.push(
    "Este texto se ha generado a partir de los cálculos del análisis, sin intervención de un modelo de lenguaje.",
  );

  return {
    executiveSummary: summaryParts.join(" "),
    diagnoses,
    // El proveedor determinista no inventa causas nuevas: las hipótesis salen
    // de las reglas del motor, que ya vienen con evidencia asociada.
    additionalHypotheses: [],
    caveats: caveats.slice(0, 5),
  };
}

function buildInterpretation(
  finding: AiRequest["findings"][number],
  ownName: string,
  rivalName: string,
): string {
  const parts = [
    `${rivalName} está por delante en ${finding.metric.toLowerCase()} (${finding.rivalValue} frente a los ${finding.ownValue} de ${ownName}), una diferencia de ${finding.gap}.`,
  ];

  if (finding.existingHypotheses.length > 0) {
    parts.push(
      `Las causas que encajan con los datos disponibles son: ${finding.existingHypotheses
        .slice(0, 3)
        .map((h) => h.replace(/\.$/, "").toLowerCase())
        .join("; ")}.`,
    );
  }

  parts.push(
    `El impacto se ha valorado en ${finding.impactScore} sobre 100 (${finding.severity.toLowerCase()}).`,
  );

  return parts.join(" ");
}
