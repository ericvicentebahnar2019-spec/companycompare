"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { getStore } from "@/lib/db";
import { getMetric } from "@/lib/metrics/catalog";

export interface MetricValueState {
  error?: string;
  message?: string;
}

const schema = z.object({
  analysisId: z.string().min(1),
  role: z.enum(["own", "rival"]),
  metricId: z.string().min(1),
  value: z.string().trim(),
  provenance: z.enum(["user", "public", "estimate"]),
});

/** Acepta coma decimal y separadores de miles del formato español. */
function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  if (cleaned === "") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/**
 * Completa un dato suelto de un análisis ya creado.
 *
 * Es lo que permite pedir los datos de uno en uno, cuando el motor detecta que
 * ese en concreto resolvería una duda abierta, en lugar de exigirlos todos por
 * adelantado.
 */
export async function setMetricValueAction(
  _prev: MetricValueState,
  formData: FormData,
): Promise<MetricValueState> {
  const user = await requireUser();

  const parsed = schema.safeParse({
    analysisId: formData.get("analysisId"),
    role: formData.get("role"),
    metricId: formData.get("metricId"),
    value: formData.get("value") ?? "",
    provenance: formData.get("provenance") ?? "user",
  });
  if (!parsed.success) return { error: "No se ha podido guardar el dato." };

  const metric = getMetric(parsed.data.metricId);
  if (!metric) return { error: "Métrica desconocida." };

  const value = parseNumber(parsed.data.value);
  if (value === null) return { error: "Escribe un número." };

  if (metric.min !== undefined && value < metric.min) {
    return { error: `No puede ser menor que ${metric.min}.` };
  }
  if (metric.max !== undefined && value > metric.max) {
    return { error: `No puede ser mayor que ${metric.max}.` };
  }

  const saved = await getStore().setMetricValue(
    user.id,
    parsed.data.analysisId,
    parsed.data.role,
    { metricId: metric.id, value, provenance: parsed.data.provenance },
  );
  if (!saved) return { error: "No se ha encontrado el análisis." };

  revalidatePath(`/analisis/${parsed.data.analysisId}`);
  return { message: `${metric.label} guardado. El análisis ya lo tiene en cuenta.` };
}
