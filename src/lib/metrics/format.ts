import type { MetricDefinition } from "./types";

const currency = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const currencyPrecise = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

const decimal = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });

/** Formatea un valor según la definición de su métrica. */
export function formatMetric(
  metric: MetricDefinition,
  value: number | string | null | undefined,
): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") return value;

  switch (metric.format) {
    case "currency":
      return Math.abs(value) < 100 ? currencyPrecise.format(value) : currency.format(value);
    case "percent":
      return `${decimal.format(value)} %`;
    case "days":
      return `${decimal.format(value)} ${value === 1 ? "día" : "días"}`;
    case "score":
      return `${decimal.format(value)}${metric.max ? ` / ${metric.max}` : ""}`;
    case "perYear":
      return `${decimal.format(value)}${metric.unit ? ` ${metric.unit}` : ""}`;
    case "number":
      return `${integer.format(value)}${metric.unit ? ` ${metric.unit}` : ""}`;
    default:
      return String(value);
  }
}

/**
 * Formatea una diferencia relativa (0,402 → "+40,2 %").
 *
 * Usa el signo menos tipográfico (−), no el guion, para que coincida con el
 * resto de diferencias de la interfaz y no se confunda con un separador.
 */
export function formatRelative(ratio: number | null): string {
  if (ratio === null || !Number.isFinite(ratio)) return "—";
  const pct = ratio * 100;
  const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
  return `${sign}${decimal.format(Math.abs(pct))} %`;
}

/**
 * Diferencia en la unidad propia de la métrica. En porcentajes se expresa en
 * puntos porcentuales, que es lo correcto: pasar de 31 % a 47 % son 16 puntos,
 * no 16 %.
 */
export function formatAbsoluteDelta(
  metric: MetricDefinition,
  delta: number | null,
): string {
  if (delta === null || !Number.isFinite(delta)) return "—";
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
  const magnitude = Math.abs(delta);

  if (metric.format === "percent") {
    return `${sign}${decimal.format(magnitude)} p.p.`;
  }
  return `${sign}${formatMetric(metric, magnitude)}`;
}

export function formatCurrency(value: number): string {
  return currency.format(value);
}

export function formatNumber(value: number): string {
  return integer.format(value);
}

export function formatDecimal(value: number): string {
  return decimal.format(value);
}
