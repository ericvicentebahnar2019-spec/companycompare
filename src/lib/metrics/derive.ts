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
 * Identidades contables entre métricas que sí se piden en el formulario.
 *
 * Son despejes exactos, no estimaciones: si se conocen tres de los cuatro
 * factores de una identidad, el cuarto no hay que preguntarlo. Es lo que
 * permite que el arranque rápido pida tres números por empresa en lugar de
 * cuarenta y cuatro, sin perder precisión.
 */
const BACKFILL: Record<string, { formula: (v: MetricValueMap) => number | null; from: string[] }> = {
  // facturación = clientes × ticket medio × frecuencia
  frecuenciaCompra: {
    from: ["facturacion", "numClientes", "ticketMedio"],
    formula: (v) => {
      const facturacion = num(v, "facturacion");
      const clientes = num(v, "numClientes");
      const ticket = num(v, "ticketMedio");
      if (facturacion === null || clientes === null || ticket === null) return null;
      if (clientes <= 0 || ticket <= 0) return null;
      return facturacion / (clientes * ticket);
    },
  },
  ticketMedio: {
    from: ["facturacion", "numClientes", "frecuenciaCompra"],
    formula: (v) => {
      const facturacion = num(v, "facturacion");
      const clientes = num(v, "numClientes");
      const frecuencia = num(v, "frecuenciaCompra");
      if (facturacion === null || clientes === null || frecuencia === null) return null;
      if (clientes <= 0 || frecuencia <= 0) return null;
      return facturacion / (clientes * frecuencia);
    },
  },
  numClientes: {
    from: ["facturacion", "ticketMedio", "frecuenciaCompra"],
    formula: (v) => {
      const facturacion = num(v, "facturacion");
      const ticket = num(v, "ticketMedio");
      const frecuencia = num(v, "frecuenciaCompra");
      if (facturacion === null || ticket === null || frecuencia === null) return null;
      if (ticket <= 0 || frecuencia <= 0) return null;
      return facturacion / (ticket * frecuencia);
    },
  },

  // margen = beneficio / facturación
  margen: {
    from: ["beneficio", "facturacion"],
    formula: (v) => {
      const beneficio = num(v, "beneficio");
      const facturacion = num(v, "facturacion");
      if (beneficio === null || facturacion === null || facturacion <= 0) return null;
      return (beneficio / facturacion) * 100;
    },
  },
  beneficio: {
    from: ["facturacion", "margen"],
    formula: (v) => {
      const facturacion = num(v, "facturacion");
      const margen = num(v, "margen");
      if (facturacion === null || margen === null) return null;
      return facturacion * (margen / 100);
    },
  },
  costes: {
    from: ["facturacion", "beneficio"],
    formula: (v) => {
      const facturacion = num(v, "facturacion");
      const beneficio = num(v, "beneficio");
      if (facturacion === null || beneficio === null) return null;
      return facturacion - beneficio;
    },
  },
};

/**
 * Rellena las métricas que se pueden despejar de las demás.
 *
 * Todas las identidades se evalúan contra los valores ORIGINALES, nunca contra
 * los que acaba de rellenar esta misma pasada. Si no, con dos datos ausentes
 * podrían alimentarse entre sí y producir un par de cifras coherentes entre
 * ellas pero inventadas.
 */
function withBackfilledMetrics(values: MetricValueMap): MetricValueMap {
  const result: MetricValueMap = { ...values };

  for (const [metricId, { formula, from }] of Object.entries(BACKFILL)) {
    if (num(values, metricId) !== null) continue;

    const value = formula(values);
    if (value === null || !Number.isFinite(value)) continue;

    result[metricId] = {
      metricId,
      value,
      provenance: "derived",
      note: `Calculado a partir de ${from.join(", ")}: no hace falta introducirlo.`,
    };
  }

  return result;
}

/**
 * Añade al mapa las métricas derivadas que se puedan calcular.
 *
 * Primero despeja lo que se pueda de los datos introducidos y después calcula
 * las métricas compuestas. No sobrescribe ningún valor presente y marca todo
 * lo que calcula como `derived`, de modo que la interfaz pueda distinguirlo de
 * un dato introducido por el usuario.
 */
export function withDerivedMetrics(values: MetricValueMap): MetricValueMap {
  const result: MetricValueMap = withBackfilledMetrics(values);

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
