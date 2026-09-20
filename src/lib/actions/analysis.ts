"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { getStore } from "@/lib/db";
import type { NewCompanyInput } from "@/lib/db/types";
import { METRICS } from "@/lib/metrics/catalog";
import type { MetricDefinition, MetricValueMap, Provenance } from "@/lib/metrics/types";

export interface AnalysisFormState {
  error?: string;
  /** Errores por campo, con la clave del formulario (`own.facturacion`). */
  fieldErrors?: Record<string, string>;
}

const RIVAL_PROVENANCES: Provenance[] = ["user", "public", "estimate"];

/** Acepta coma decimal y separadores de miles del formato español. */
function parseNumber(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  if (cleaned === "") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

interface ExtractResult {
  values: MetricValueMap;
  errors: Record<string, string>;
}

/**
 * Lee del formulario los valores de una de las dos empresas.
 *
 * Un campo vacío o marcado como desconocido se guarda con valor `null` y
 * procedencia `unknown`: nunca se sustituye por un cero ni por una media.
 */
function extractCompany(
  formData: FormData,
  prefix: "own" | "rival",
): ExtractResult {
  const values: MetricValueMap = {};
  const errors: Record<string, string> = {};

  for (const metric of METRICS) {
    const key = `${prefix}.${metric.id}`;
    const unknown = formData.get(`${key}.unknown`) === "on";
    const raw = String(formData.get(key) ?? "");

    if (unknown || raw.trim() === "") {
      values[metric.id] = {
        metricId: metric.id,
        value: null,
        provenance: "unknown",
        note: null,
      };
      continue;
    }

    if (metric.format === "text" || metric.format === "enum") {
      values[metric.id] = {
        metricId: metric.id,
        value: raw.trim().slice(0, 200),
        provenance: readProvenance(formData, key, prefix),
        note: null,
      };
      continue;
    }

    const value = parseNumber(raw);
    if (value === null) {
      errors[key] = "Escribe un número.";
      continue;
    }

    const rangeError = checkRange(metric, value);
    if (rangeError) {
      errors[key] = rangeError;
      continue;
    }

    values[metric.id] = {
      metricId: metric.id,
      value,
      provenance: readProvenance(formData, key, prefix),
      note: null,
    };
  }

  return { values, errors };
}

function readProvenance(
  formData: FormData,
  key: string,
  prefix: "own" | "rival",
): Provenance {
  if (prefix === "own") return "user";
  const raw = String(formData.get(`${key}.prov`) ?? "estimate") as Provenance;
  return RIVAL_PROVENANCES.includes(raw) ? raw : "estimate";
}

function checkRange(metric: MetricDefinition, value: number): string | null {
  if (metric.min !== undefined && value < metric.min) {
    return `No puede ser menor que ${metric.min}.`;
  }
  if (metric.max !== undefined && value > metric.max) {
    return `No puede ser mayor que ${metric.max}.`;
  }
  return null;
}

function textValue(values: MetricValueMap, metricId: string): string | null {
  const entry = values[metricId];
  return typeof entry?.value === "string" ? entry.value : null;
}

function numberValue(values: MetricValueMap, metricId: string): number | null {
  const entry = values[metricId];
  return typeof entry?.value === "number" ? entry.value : null;
}

export async function createAnalysisAction(
  _prev: AnalysisFormState,
  formData: FormData,
): Promise<AnalysisFormState> {
  const user = await requireUser();

  const own = extractCompany(formData, "own");
  const rival = extractCompany(formData, "rival");
  const fieldErrors = { ...own.errors, ...rival.errors };

  const ownName = textValue(own.values, "nombre");
  const rivalName = textValue(rival.values, "nombre");

  if (!ownName) fieldErrors["own.nombre"] = "El nombre de tu empresa es obligatorio.";
  if (!rivalName) fieldErrors["rival.nombre"] = "El nombre del competidor es obligatorio.";

  if (Object.keys(fieldErrors).length > 0) {
    return {
      error: "Hay campos que revisar. Los errores están señalados junto a cada uno.",
      fieldErrors,
    };
  }

  const build = (
    values: MetricValueMap,
    name: string,
    role: "own" | "rival",
  ): NewCompanyInput => ({
    name,
    role,
    sector: textValue(values, "sector"),
    country: textValue(values, "pais"),
    sizeLabel: textValue(values, "tamano"),
    employees: numberValue(values, "empleados"),
    foundedAt: numberValue(values, "anioCreacion"),
    website: null,
    values,
  });

  const title =
    String(formData.get("title") ?? "").trim() ||
    `${ownName} frente a ${rivalName}`;

  let analysisId: string;
  try {
    analysisId = await getStore().createAnalysis(user.id, {
      title,
      notes: String(formData.get("notes") ?? "").trim() || null,
      own: build(own.values, ownName!, "own"),
      rival: build(rival.values, rivalName!, "rival"),
    });
  } catch {
    return { error: "No se ha podido guardar el análisis. Inténtalo de nuevo." };
  }

  revalidatePath("/analisis");
  revalidatePath("/dashboard");
  redirect(`/analisis/${analysisId}`);
}
