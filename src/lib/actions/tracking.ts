"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { getStore } from "@/lib/db";
import { getMetric } from "@/lib/metrics/catalog";

export interface TrackingState {
  error?: string;
  message?: string;
}

const schema = z.object({
  companyId: z.string().min(1),
  metricId: z.string().min(1),
  value: z.coerce.number().finite(),
  recordedAt: z.string().trim().optional().or(z.literal("")),
  note: z.string().trim().max(300).optional().or(z.literal("")),
});

/** Registra una nueva medición de una métrica para el seguimiento. */
export async function addMeasurementAction(
  _prev: TrackingState,
  formData: FormData,
): Promise<TrackingState> {
  const user = await requireUser();

  const parsed = schema.safeParse({
    companyId: formData.get("companyId"),
    metricId: formData.get("metricId"),
    value: formData.get("value"),
    recordedAt: formData.get("recordedAt") ?? "",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) {
    return { error: "Revisa el valor introducido: debe ser un número." };
  }

  const metric = getMetric(parsed.data.metricId);
  if (!metric) return { error: "Métrica desconocida." };

  if (metric.min !== undefined && parsed.data.value < metric.min) {
    return { error: `El valor no puede ser menor que ${metric.min}.` };
  }
  if (metric.max !== undefined && parsed.data.value > metric.max) {
    return { error: `El valor no puede ser mayor que ${metric.max}.` };
  }

  try {
    await getStore().addSnapshot(user.id, parsed.data.companyId, {
      metricId: parsed.data.metricId,
      value: parsed.data.value,
      recordedAt: parsed.data.recordedAt
        ? new Date(parsed.data.recordedAt).toISOString()
        : undefined,
      note: parsed.data.note || null,
    });
  } catch {
    return { error: "No se ha podido guardar la medición." };
  }

  revalidatePath("/seguimiento");
  revalidatePath("/dashboard");
  return { message: `Medición de ${metric.label.toLowerCase()} registrada.` };
}
