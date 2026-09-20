import { z } from "zod";

/**
 * Contrato de datos con la capa de IA.
 *
 * La entrada y la salida son JSON estructurado y validado en los dos
 * sentidos. Si el modelo devuelve algo que no encaja en el esquema, se
 * descarta: la aplicación prefiere quedarse sin comentario de IA antes que
 * mostrar texto no verificado.
 */

export const confidenceSchema = z.enum(["low", "medium", "high"]);

/** Interpretación de una brecha concreta ya calculada por el motor. */
export const diagnosisSchema = z.object({
  findingId: z
    .string()
    .describe("Identificador del hallazgo, copiado tal cual de la entrada."),
  interpretation: z
    .string()
    .describe(
      "Dos o tres frases que expliquen qué puede haber detrás de esta diferencia, en español de España, sin afirmar nada que no esté en los datos.",
    ),
});

/** Causa adicional que el motor determinista no contempla. */
export const aiHypothesisSchema = z.object({
  findingId: z.string().describe("Hallazgo al que pertenece esta causa."),
  statement: z.string().describe("La causa, en una frase."),
  rationale: z
    .string()
    .describe("Por qué esta causa podría explicar la diferencia observada."),
  confidence: confidenceSchema.describe(
    "low si ningún dato la sostiene, medium si hay una señal, high si hay dos o más.",
  ),
  checks: z
    .array(z.string())
    .max(4)
    .describe("Preguntas concretas que permitirían confirmarla o descartarla."),
});

export const aiInsightsSchema = z.object({
  executiveSummary: z
    .string()
    .describe(
      "Resumen ejecutivo de 4 a 6 frases dirigido a un empresario: dónde está la distancia mayor, qué parece explicarla y por dónde empezar.",
    ),
  diagnoses: z.array(diagnosisSchema).max(12),
  additionalHypotheses: z.array(aiHypothesisSchema).max(8),
  /** Riesgos o matices que el análisis numérico no captura. */
  caveats: z
    .array(z.string())
    .max(5)
    .describe(
      "Advertencias sobre los límites de la comparación: datos que faltan, diferencias de contexto entre las dos empresas, etc.",
    ),
});

export type AiInsights = z.infer<typeof aiInsightsSchema>;
export type AiDiagnosis = z.infer<typeof diagnosisSchema>;
export type AiHypothesis = z.infer<typeof aiHypothesisSchema>;

/** Entrada que se envía al modelo: ya viene resumida y sin datos personales. */
export const aiRequestSchema = z.object({
  own: z.object({
    name: z.string(),
    sector: z.string().nullable(),
    country: z.string().nullable(),
  }),
  rival: z.object({
    name: z.string(),
    sector: z.string().nullable(),
    country: z.string().nullable(),
  }),
  coverage: z.object({
    known: z.number(),
    total: z.number(),
    unknownMetrics: z.array(z.string()),
  }),
  revenueDecomposition: z
    .object({
      note: z.string(),
      factors: z.array(
        z.object({
          metric: z.string(),
          ownValue: z.string(),
          rivalValue: z.string(),
          contributionPct: z.number(),
        }),
      ),
    })
    .nullable(),
  findings: z.array(
    z.object({
      findingId: z.string(),
      metric: z.string(),
      area: z.string(),
      ownValue: z.string(),
      rivalValue: z.string(),
      gap: z.string(),
      severity: z.string(),
      impactScore: z.number(),
      existingHypotheses: z.array(z.string()),
    }),
  ),
  strengths: z.array(
    z.object({ metric: z.string(), ownValue: z.string(), rivalValue: z.string() }),
  ),
});

export type AiRequest = z.infer<typeof aiRequestSchema>;
