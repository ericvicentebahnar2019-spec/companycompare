import { DERIVED_METRICS } from "./catalog";
import type { MetricValueMap } from "./types";

function num(values: MetricValueMap, id: string): number | null {
  const entry = values[id];
  if (!entry || entry.value === null || typeof entry.value !== "number") return null;
  if (!Number.isFinite(entry.value)) return null;
  return entry.value;
}

/** Fórmulas de las métricas derivadas. Devuelven `null` si falta un ingrediente. */
const FORMULAS: Record<string, (v: MetricValueMap) => number | null> = {
  facturacionPorEmpleado: (v) => {
    const facturacion = num(v, "facturacion");
    const empleados = num(v, "empleados");
    if (facturacion === null || empleados === null || empleados <= 0) return null;
    return facturacion / empleados;
  },
  valorAnualCliente: (v) => {
    const ticket = num(v, "ticketMedio");
    const frecuencia = num(v, "frecuenciaCompra");
    if (ticket === null || frecuencia === null) return null;
    return ticket * frecuencia;
  },
  ratioValorCac: (v) => {
    const ticket = num(v, "ticketMedio");
    const frecuencia = num(v, "frecuenciaCompra");
    const cac = num(v, "cac");
    if (ticket === null || frecuencia === null || cac === null || cac <= 0) return null;
    return (ticket * frecuencia) / cac;
  },
  ingresoPorVisita: (v) => {
    const conversion = num(v, "conversion");
    const ticket = num(v, "ticketMedio");
    if (conversion === null || ticket === null) return null;
    return (conversion / 100) * ticket;
  },
};

/**
 * Añade al mapa las métricas derivadas que se puedan calcular.
 *
 * No sobrescribe un valor ya presente y marca todo lo que calcula como
 * `derived`, de modo que la interfaz pueda distinguirlo de un dato
 * introducido por el usuario.
 */
export function withDerivedMetrics(values: MetricValueMap): MetricValueMap {
  const result: MetricValueMap = { ...values };

  for (const metric of DERIVED_METRICS) {
    if (result[metric.id]?.value !== undefined && result[metric.id]?.value !== null) {
      continue;
    }
    const formula = FORMULAS[metric.id];
    if (!formula) continue;

    const value = formula(result);
    result[metric.id] = {
      metricId: metric.id,
      value,
      provenance: value === null ? "unknown" : "derived",
      note:
        value === null
          ? `No se puede calcular: faltan datos de ${(metric.derivedFrom ?? []).join(", ")}.`
          : null,
    };
  }

  return result;
}
