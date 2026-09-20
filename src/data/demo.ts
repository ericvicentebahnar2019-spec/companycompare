import type { MetricValue, MetricValueMap, Provenance } from "@/lib/metrics/types";
import type { NewAnalysisInput } from "@/lib/db/types";

/**
 * Datos de la demostración.
 *
 * Son FICTICIOS y así se marcan en toda la aplicación (`isDemo`). Sirven para
 * poder recorrer el producto completo sin haber introducido nada todavía.
 * Están construidos para ser internamente coherentes: la facturación de cada
 * empresa cuadra con el producto de sus clientes, su ticket medio y su
 * frecuencia de compra, de modo que la descomposición de la brecha no arrastra
 * un residuo artificial.
 */

export const DEMO_EMAIL = "demo@companycompare.app";
export const DEMO_PASSWORD = "demo1234";
export const DEMO_USER_NAME = "Carlos";

function v(
  metricId: string,
  value: number | string | null,
  provenance: Provenance = "user",
  note?: string,
): [string, MetricValue] {
  return [metricId, { metricId, value, provenance, note: note ?? null }];
}

/** NovaTech: la empresa del usuario. Todos sus datos son propios. */
const NOVATECH_VALUES: MetricValueMap = Object.fromEntries([
  v("nombre", "NovaTech"),
  v("sector", "Comercio electrónico B2C"),
  v("pais", "España"),
  v("tamano", "Pequeña"),
  v("empleados", 12),
  v("anioCreacion", 2018),

  v("facturacion", 245000),
  v("beneficio", 34790),
  v("margen", 14.2),
  v("costes", 210210),
  v("deuda", 48000),
  v("flujoCaja", 21500),
  v("crecimientoAnual", 8.4),

  v("numClientes", 1240),
  v("ticketMedio", 68),
  v("frecuenciaCompra", 2.9),
  v("tasaRecompra", 31),
  v("retencion", 44),
  v("cac", 41),
  v("satisfaccion", 7.6),

  v("numProductos", 85),
  v("precioMedio", 52),
  v("calidadPercibida", 7.8),
  v("frecuenciaLanzamiento", 4),
  v("diferenciacion", 5.5),

  v("presupuestoMarketing", 32000),
  v("canalesSociales", 2),
  v("seguidores", 8400),
  v("traficoWeb", 18500),
  v("conversion", 1.6),
  v("seo", 34),
  v("inversionPublicidad", 21000),
  v("coberturaEmail", 38),
  v("colaboracionesInfluencers", 2),

  v("costeProduccion", 27),
  v("tiempoEntrega", 4.5),
  v("devoluciones", 9.2),
  v("rotacionInventario", 4.1),
  v("costeLogistico", 11.5),

  v("automatizacion", 4),
  v("usoIA", 2),
  v("crm", 3),
  v("analytics", 4),
  v("software", "Tienda online, gestor de email, hoja de cálculo"),
]);

/**
 * AlphaTech: el competidor.
 *
 * Refleja la situación real de un análisis competitivo: parte de los datos son
 * públicos, parte son estimaciones del propio empresario y algunos
 * sencillamente no se conocen. Cada valor lleva su procedencia, y los
 * desconocidos se quedan en `null` en lugar de rellenarse.
 */
const ALPHATECH_VALUES: MetricValueMap = Object.fromEntries([
  v("nombre", "AlphaTech", "public"),
  v("sector", "Comercio electrónico B2C", "public"),
  v("pais", "España", "public"),
  v("tamano", "Pequeña", "estimate"),
  v("empleados", 17, "public", "Según el número de perfiles que declaran trabajar allí."),
  v("anioCreacion", 2016, "public"),

  v("facturacion", 410000, "public", "Cuentas depositadas en el registro mercantil."),
  v("beneficio", 89380, "public"),
  v("margen", 21.8, "public"),
  v("costes", 320620, "public"),
  v("deuda", 145000, "public", "Deuda financiera declarada en las últimas cuentas."),
  v("flujoCaja", null, "unknown"),
  v("crecimientoAnual", 19.5, "public"),

  v("numClientes", 1680, "estimate", "Estimado a partir del volumen de reseñas y pedidos visibles."),
  v("ticketMedio", 89, "estimate", "Media de la cesta observada en su tienda."),
  v("frecuenciaCompra", 2.74, "estimate"),
  v("tasaRecompra", 47, "estimate", "Estimado a partir de su programa de puntos y de las reseñas repetidas."),
  v("retencion", 61, "estimate"),
  v("cac", 34, "estimate"),
  v("satisfaccion", 8.7, "public", "Media de valoraciones públicas."),

  v("numProductos", 140, "public"),
  v("precioMedio", 71, "public"),
  v("calidadPercibida", 8.6, "public", "Media de las reseñas de producto."),
  v("frecuenciaLanzamiento", 11, "public"),
  v("diferenciacion", 7.5, "estimate"),

  v("presupuestoMarketing", 58000, "estimate"),
  v("canalesSociales", 4, "public"),
  v("seguidores", 41000, "public"),
  v("traficoWeb", 47000, "estimate", "Estimación de una herramienta de analítica de terceros."),
  v("conversion", 2.4, "estimate"),
  v("seo", 68, "public"),
  v("inversionPublicidad", 29000, "estimate"),
  v("coberturaEmail", 74, "estimate"),
  v("colaboracionesInfluencers", 9, "public"),

  v("costeProduccion", null, "unknown"),
  v("tiempoEntrega", 2.1, "public", "Plazo que anuncian en su web y confirman las reseñas."),
  v("devoluciones", 5.4, "estimate"),
  v("rotacionInventario", 6.8, "estimate"),
  v("costeLogistico", 8.7, "estimate"),

  v("automatizacion", 7, "estimate"),
  v("usoIA", 6, "estimate"),
  v("crm", 8, "estimate"),
  v("analytics", 8, "estimate"),
  v("software", null, "unknown"),
]);

export const DEMO_ANALYSIS: NewAnalysisInput = {
  title: "NovaTech frente a AlphaTech",
  notes:
    "Análisis de demostración con datos ficticios. Sirve para recorrer el producto de principio a fin antes de introducir datos reales.",
  own: {
    name: "NovaTech",
    role: "own",
    sector: "Comercio electrónico B2C",
    country: "España",
    sizeLabel: "Pequeña",
    employees: 12,
    foundedAt: 2018,
    website: null,
    values: NOVATECH_VALUES,
  },
  rival: {
    name: "AlphaTech",
    role: "rival",
    sector: "Comercio electrónico B2C",
    country: "España",
    sizeLabel: "Pequeña",
    employees: 17,
    foundedAt: 2016,
    website: null,
    values: ALPHATECH_VALUES,
  },
};

/**
 * Histórico de la empresa propia para la pantalla de seguimiento. Doce meses
 * de evolución mensual coherentes con los valores actuales del análisis.
 */
export const DEMO_HISTORY: { metricId: string; points: [string, number][] }[] = [
  {
    metricId: "facturacion",
    points: months([196000, 201000, 205000, 209000, 214000, 218000, 223000, 228000, 232000, 237000, 241000, 245000]),
  },
  {
    metricId: "margen",
    points: months([12.1, 12.3, 12.6, 12.8, 13.0, 13.1, 13.4, 13.6, 13.8, 13.9, 14.1, 14.2]),
  },
  {
    metricId: "numClientes",
    points: months([1012, 1035, 1061, 1088, 1110, 1134, 1157, 1178, 1195, 1212, 1228, 1240]),
  },
  {
    metricId: "tasaRecompra",
    points: months([26, 26.5, 27, 27.4, 28, 28.3, 28.9, 29.2, 29.8, 30.2, 30.6, 31]),
  },
  {
    metricId: "ticketMedio",
    points: months([61, 61.5, 62, 63, 63.5, 64, 65, 65.5, 66, 67, 67.5, 68]),
  },
  {
    metricId: "cac",
    points: months([48, 47.5, 47, 46, 45.5, 45, 44, 43.5, 43, 42.5, 42, 41]),
  },
  {
    metricId: "conversion",
    points: months([1.3, 1.32, 1.35, 1.38, 1.4, 1.42, 1.45, 1.48, 1.5, 1.53, 1.57, 1.6]),
  },
  {
    metricId: "beneficio",
    points: months([23716, 24723, 25830, 26752, 27820, 28558, 29882, 31008, 32016, 32943, 33981, 34790]),
  },
];

/** Reparte doce valores en los doce meses anteriores a hoy. */
function months(values: number[]): [string, number][] {
  const now = new Date();
  return values.map((value, index) => {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (values.length - 1 - index), 1),
    );
    return [date.toISOString(), value];
  });
}
