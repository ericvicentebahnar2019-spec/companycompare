import type { AreaId, MetricValueMap, Provenance } from "@/lib/metrics/types";

export type Level = "low" | "medium" | "high";

export const LEVEL_LABEL: Record<Level, string> = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
};

export const LEVEL_LABEL_F: Record<Level, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

export interface CompanyProfile {
  id: string;
  name: string;
  role: "own" | "rival";
  sector?: string | null;
  country?: string | null;
  website?: string | null;
  values: MetricValueMap;
}

export interface AnalysisInput {
  id: string;
  title: string;
  createdAt: string;
  isDemo: boolean;
  own: CompanyProfile;
  rival: CompanyProfile;
}

/** Diferencia calculada para una métrica concreta. */
export interface Gap {
  metricId: string;
  area: AreaId;
  ownValue: number | null;
  rivalValue: number | null;
  ownProvenance: Provenance;
  rivalProvenance: Provenance;
  /**
   * Brecha relativa con signo desde el punto de vista del usuario:
   * negativa = la empresa propia está peor. Es `null` si falta algún valor o
   * si la base es cero.
   */
  relativeGap: number | null;
  /** Diferencia en unidades de la métrica (propia − competidor). */
  absoluteGap: number | null;
  favors: "own" | "rival" | "tie" | "unknown";
  /** `false` cuando alguno de los dos valores es desconocido. */
  known: boolean;
}

export interface EvidenceItem {
  metricId: string;
  note: string;
}

export interface CheckItem {
  question: string;
  metricId?: string;
}

export interface Hypothesis {
  id: string;
  statement: string;
  rationale: string;
  confidence: Level;
  /** Por qué la confianza es esa y no otra. */
  confidenceRationale: string;
  evidence: EvidenceItem[];
  checks: CheckItem[];
}

export interface Recommendation {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  cost: Level;
  difficulty: Level;
  impact: Level;
  /** Efecto plausible, redactado sin garantizar resultados. */
  expectedEffect: string;
  kpis: string[];
  /** Esfuerzo combinado (coste + dificultad), 0-100, para la matriz. */
  effortScore: number;
}

export interface Finding {
  id: string;
  metricId: string;
  area: AreaId;
  gap: Gap;
  severity: Level;
  /** 0-100. La fórmula está documentada en `impactRationale`. */
  impactScore: number;
  impactRationale: string;
  hypotheses: Hypothesis[];
  recommendations: Recommendation[];
}

/**
 * Descomposición de la brecha de facturación en sus tres factores
 * multiplicativos: clientes × ticket medio × frecuencia de compra.
 */
export interface RevenueDecomposition {
  available: boolean;
  /** Facturación implícita = clientes × ticket × frecuencia. */
  ownImplied: number | null;
  rivalImplied: number | null;
  /** Diferencia entre facturación declarada e implícita, en tanto por uno. */
  ownResidual: number | null;
  rivalResidual: number | null;
  factors: {
    metricId: string;
    ownValue: number;
    rivalValue: number;
    ratio: number;
    /** Parte de la brecha total atribuible a este factor (0-1). */
    contribution: number;
  }[];
  note: string;
}

export interface DataCoverage {
  total: number;
  known: number;
  unknownOwn: string[];
  unknownRival: string[];
  /** 0-1 */
  ratio: number;
}

export interface AreaScore {
  area: AreaId;
  /** Media ponderada de las brechas conocidas del área, −1..1. */
  balance: number | null;
  findings: number;
  known: number;
  total: number;
}

export interface AnalysisResult {
  analysisId: string;
  generatedAt: string;
  gaps: Gap[];
  findings: Finding[];
  areaScores: AreaScore[];
  revenue: RevenueDecomposition;
  coverage: DataCoverage;
  /** Puntos donde la empresa propia va por delante. */
  strengths: Gap[];
}
