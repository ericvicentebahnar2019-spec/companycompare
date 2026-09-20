import "server-only";

import { getStore } from "@/lib/db";
import type { StoredAnalysis } from "@/lib/db/types";
import { withDerivedMetrics } from "@/lib/metrics/derive";
import { runAnalysis } from "./engine";
import type { AnalysisInput, AnalysisResult } from "./types";

export interface LoadedAnalysis {
  stored: StoredAnalysis;
  input: AnalysisInput;
  result: AnalysisResult;
}

/**
 * Carga un análisis del usuario y lo ejecuta.
 *
 * El cálculo es barato y determinista, así que se hace en cada petición en
 * lugar de guardar los hallazgos: así un cambio en las reglas del motor se
 * refleja inmediatamente sin migrar datos antiguos.
 */
export async function loadAnalysis(
  userId: string,
  analysisId: string,
): Promise<LoadedAnalysis | null> {
  const stored = await getStore().getAnalysis(userId, analysisId);
  if (!stored) return null;

  const input: AnalysisInput = {
    id: stored.id,
    title: stored.title,
    createdAt: stored.createdAt,
    isDemo: stored.isDemo,
    own: {
      id: stored.own.id,
      name: stored.own.name,
      role: "own",
      sector: stored.own.sector,
      country: stored.own.country,
      website: stored.own.website,
      values: withDerivedMetrics(stored.own.values),
    },
    rival: {
      id: stored.rival.id,
      name: stored.rival.name,
      role: "rival",
      sector: stored.rival.sector,
      country: stored.rival.country,
      website: stored.rival.website,
      values: withDerivedMetrics(stored.rival.values),
    },
  };

  return { stored, input, result: runAnalysis(input) };
}

/** El análisis más reciente del usuario, ya ejecutado. */
export async function loadLatestAnalysis(
  userId: string,
): Promise<LoadedAnalysis | null> {
  const summaries = await getStore().listAnalyses(userId);
  if (summaries.length === 0) return null;
  return loadAnalysis(userId, summaries[0].id);
}
