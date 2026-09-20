import type { AiInsights, AiRequest } from "./schemas";

/** Identificador del proveedor que ha producido un resultado. */
export type AiProviderId = "mock" | "anthropic";

export interface AiResult {
  insights: AiInsights;
  provider: AiProviderId;
  /**
   * `true` cuando el texto procede de un modelo de lenguaje. La interfaz lo
   * usa para etiquetar el contenido como inferencia y no como dato.
   */
  isModelGenerated: boolean;
  model?: string;
  /** Motivo por el que se ha usado el proveedor de respaldo, si aplica. */
  fallbackReason?: string;
}

/**
 * Contrato que debe cumplir cualquier proveedor de IA.
 *
 * Mantener la interfaz mínima permite cambiar de modelo o de proveedor sin
 * tocar ni el motor de análisis ni la interfaz.
 */
export interface AiProvider {
  readonly id: AiProviderId;
  /** Enriquece un análisis ya calculado con interpretación en lenguaje natural. */
  enrich(request: AiRequest): Promise<AiResult>;
}
