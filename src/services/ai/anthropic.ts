import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { aiInsightsSchema, type AiRequest } from "./schemas";
import { buildUserPrompt, SYSTEM_PROMPT } from "./prompt";
import type { AiProvider, AiResult } from "./types";

const DEFAULT_MODEL = "claude-opus-5";

/**
 * Proveedor real sobre la API de Anthropic.
 *
 * El módulo es `server-only`: importarlo desde un componente de cliente es un
 * error de compilación, de modo que la clave no puede acabar en el bundle del
 * navegador ni por descuido.
 *
 * La respuesta se pide con salida estructurada validada contra el esquema, así
 * que o encaja o se descarta; no hay parseo de texto libre.
 */
export class AnthropicAiProvider implements AiProvider {
  readonly id = "anthropic" as const;

  private readonly client: Anthropic;
  private readonly model: string;

  constructor(apiKey: string, model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async enrich(request: AiRequest): Promise<AiResult> {
    const response = await this.client.messages.parse({
      model: this.model,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "medium",
        format: zodOutputFormat(aiInsightsSchema),
      },
      messages: [{ role: "user", content: buildUserPrompt(request) }],
    });

    if (response.stop_reason === "refusal") {
      throw new Error(
        `El modelo ha rechazado la petición (${response.stop_details?.category ?? "sin categoría"}).`,
      );
    }

    const parsed = response.parsed_output;
    if (!parsed) {
      throw new Error("El modelo no ha devuelto un JSON válido para el esquema.");
    }

    return {
      insights: parsed,
      provider: "anthropic",
      isModelGenerated: true,
      model: response.model,
    };
  }
}
