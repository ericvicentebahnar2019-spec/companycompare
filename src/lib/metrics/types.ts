/**
 * Tipos base del catálogo de métricas.
 *
 * Todo el producto gira alrededor de estas definiciones: el formulario de
 * entrada, la pantalla de comparación, el motor de análisis y el contrato con
 * la capa de IA leen el mismo catálogo, de modo que añadir una métrica nueva
 * se hace en un único sitio.
 */

/** Áreas de análisis (sección 7 del producto). */
export const AREAS = [
  "finanzas",
  "clientes",
  "producto",
  "marketing",
  "digital",
  "operaciones",
  "organizacion",
] as const;

export type AreaId = (typeof AREAS)[number];

/** Secciones del formulario de captura de datos. */
export const SECTIONS = [
  "general",
  "finanzas",
  "clientes",
  "producto",
  "marketing",
  "operaciones",
  "tecnologia",
] as const;

export type SectionId = (typeof SECTIONS)[number];

/** Cómo se presenta el valor en pantalla. */
export type MetricFormat =
  | "currency"
  | "percent"
  | "number"
  | "days"
  | "score"
  | "perYear"
  | "text"
  | "enum";

/**
 * De qué lado está "mejor". Determina el signo de una brecha: en `lower` un
 * valor más bajo es ventaja (coste de adquisición, devoluciones, plazo de
 * entrega...).
 */
export type MetricDirection = "higher" | "lower" | "neutral";

/**
 * Escala en la que se mide la brecha de una métrica.
 *
 * - `points`: diferencia en puntos porcentuales. Correcto para porcentajes que
 *   describen una proporción de la base de clientes (recompra, retención): ir
 *   del 31 % al 47 % son 16 puntos, y esos 16 puntos significan lo mismo
 *   independientemente del punto de partida.
 * - `relative`: diferencia en tanto por uno sobre el valor del competidor.
 *   Correcto para el resto, incluidos los porcentajes pequeños: una conversión
 *   del 1,6 % frente al 2,4 % son solo 0,8 puntos, pero es un 33 % menos de
 *   ventas por visita.
 *
 * Si no se indica, los porcentajes usan `points` y el resto `relative`.
 */
export type GapScale = "points" | "relative";

/**
 * Origen de un dato. Es obligatorio y nunca se infiere: el producto se apoya
 * en no presentar jamás una estimación como un hecho.
 *
 * - `user`      → lo ha introducido el empresario.
 * - `public`    → recogido de una fuente pública (web, redes, reseñas).
 * - `estimate`  → estimación calculada a partir de otros datos conocidos.
 * - `inference` → deducción del modelo de IA.
 * - `derived`   → calculado de forma determinista desde otras métricas.
 * - `unknown`   → el usuario ha indicado que no conoce el dato.
 */
export type Provenance =
  | "user"
  | "public"
  | "estimate"
  | "inference"
  | "derived"
  | "unknown";

export const PROVENANCE_LABEL: Record<Provenance, string> = {
  user: "Dato introducido",
  public: "Dato público",
  estimate: "Estimación",
  inference: "Inferencia de IA",
  derived: "Calculado",
  unknown: "Dato desconocido",
};

/**
 * Peso de la métrica al valorar el impacto de una brecha.
 * 3 = mueve directamente el resultado del negocio; 1 = indicador de apoyo.
 */
export type MetricWeight = 1 | 2 | 3;

export interface MetricDefinition {
  id: string;
  label: string;
  /** Texto corto que explica qué es y de dónde sacar el dato. */
  help: string;
  section: SectionId;
  area: AreaId;
  format: MetricFormat;
  direction: MetricDirection;
  weight: MetricWeight;
  /**
   * Brecha relativa mínima (0-1) a partir de la cual la diferencia se
   * considera material y merece aparecer como hallazgo. Evita marcar como
   * problema el ruido de medición.
   */
  materiality: number;
  /** Escala en la que se interpreta `materiality`. Ver `GapScale`. */
  gapScale?: GapScale;
  /** Sufijo de unidad para los formatos que lo necesitan. */
  unit?: string;
  min?: number;
  max?: number;
  /** Opciones cuando `format` es `enum`. */
  options?: readonly string[];
  /** Si es `false`, se muestra pero no entra en el cálculo de brechas. */
  comparable: boolean;
  /**
   * Presente solo en métricas derivadas: ids de las métricas necesarias para
   * calcularla.
   */
  derivedFrom?: readonly string[];
}

/** Un valor concreto de una métrica para una empresa. */
export interface MetricValue {
  metricId: string;
  /** `null` significa desconocido; nunca se rellena con un valor inventado. */
  value: number | string | null;
  provenance: Provenance;
  /** Nota opcional del usuario o justificación de la estimación. */
  note?: string | null;
}

/** Conjunto de valores de una empresa, indexado por id de métrica. */
export type MetricValueMap = Record<string, MetricValue>;

export const AREA_META: Record<
  AreaId,
  { label: string; icon: string; description: string }
> = {
  finanzas: {
    label: "Finanzas",
    icon: "💰",
    description: "Facturación, beneficio, margen, costes y crecimiento.",
  },
  clientes: {
    label: "Clientes",
    icon: "👥",
    description: "Adquisición, retención, recompra, ticket medio y satisfacción.",
  },
  producto: {
    label: "Producto",
    icon: "📦",
    description: "Precio, calidad, variedad, innovación y diferenciación.",
  },
  marketing: {
    label: "Marketing",
    icon: "📢",
    description: "Alcance, conversión, coste de adquisición, redes y publicidad.",
  },
  digital: {
    label: "Digital",
    icon: "🌐",
    description: "Web, conversión, experiencia de usuario y tecnología.",
  },
  operaciones: {
    label: "Operaciones",
    icon: "🚚",
    description: "Producción, logística, inventario, devoluciones y costes.",
  },
  organizacion: {
    label: "Organización",
    icon: "👨‍💼",
    description: "Equipo, productividad, procesos y automatización.",
  },
};

export const SECTION_META: Record<
  SectionId,
  { label: string; description: string }
> = {
  general: {
    label: "Información general",
    description: "Identifica la empresa y el contexto en el que compite.",
  },
  finanzas: {
    label: "Finanzas",
    description: "Cifras del último ejercicio cerrado o de los últimos 12 meses.",
  },
  clientes: {
    label: "Clientes",
    description: "Cómo se comporta la base de clientes y cuánto cuesta conseguirla.",
  },
  producto: {
    label: "Producto / servicio",
    description: "Qué se vende, a qué precio y con qué diferenciación.",
  },
  marketing: {
    label: "Marketing",
    description: "Inversión, canales y rendimiento de la captación.",
  },
  operaciones: {
    label: "Operaciones",
    description: "Cómo se produce y se entrega, y cuánto cuesta hacerlo.",
  },
  tecnologia: {
    label: "Tecnología",
    description: "Nivel de automatización y herramientas en uso.",
  },
};
