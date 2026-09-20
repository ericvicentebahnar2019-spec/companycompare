import "server-only";

import type { AnalysisInput, AnalysisResult } from "@/lib/analysis/types";
import { AnthropicAiProvider } from "./anthropic";
import { MockAiProvider } from "./mock";
import { buildAiRequest } from "./payload";
import type { AiProvider, AiProviderId, AiResult } from "./types";

export type { AiResult, AiProvider, AiProviderId } from "./types";
export type { AiInsights, AiDiagnosis, AiHypothesis } from "./schemas";

const mock = new MockAiProvider();

/**
 * Elige el proveedor según la configuración.
 *
 * Con `AI_PROVIDER=anthropic` y una clave presente se usa el modelo; en
 * cualquier otro caso se usa el proveedor determinista. Cambiar de modelo o
 * añadir otro proveedor es tocar solo este fichero.
 */
function resolveProvider(): { provider: AiProvider; reason?: string } {
  const configured = (process.env.AI_PROVIDER ?? "mock").toLowerCase() as AiProviderId;

  if (configured !== "anthropic") {
    return { provider: mock };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      provider: mock,
      reason:
        "AI_PROVIDER está en anthropic pero falta ANTHROPIC_API_KEY, así que se ha usado el análisis determinista.",
    };
  }

  return { provider: new AnthropicAiProvider(apiKey) };
}

/**
 * Enriquece un análisis con interpretación en lenguaje natural.
 *
 * Si el proveedor configurado falla, se cae al determinista y se deja
 * constancia del motivo: la aplicación nunca se queda sin análisis por un
 * problema de red o de cuota.
 */
export async function enrichAnalysis(
  input: AnalysisInput,
  result: AnalysisResult,
): Promise<AiResult> {
  const request = buildAiRequest(input, result);
  const { provider, reason } = resolveProvider();

  if (reason) {
    const fallback = await mock.enrich(request);
    return { ...fallback, fallbackReason: reason };
  }

  try {
    return await provider.enrich(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "error desconocido";
    const fallback = await mock.enrich(request);
    return {
      ...fallback,
      fallbackReason: `No se ha podido contactar con el proveedor de IA (${message}). Se muestra el análisis determinista.`,
    };
  }
}

/** Proveedor activo, para mostrarlo en la interfaz sin ejecutar el análisis. */
export function activeProviderId(): AiProviderId {
  const configured = (process.env.AI_PROVIDER ?? "mock").toLowerCase();
  if (configured === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "mock";
}
