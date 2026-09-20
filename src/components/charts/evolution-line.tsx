"use client";

import { useMemo, useState } from "react";

import { requireMetric } from "@/lib/metrics/catalog";
import { formatMetric } from "@/lib/metrics/format";

export interface SeriesPoint {
  date: string;
  value: number;
}

const WIDTH = 640;
const HEIGHT = 200;
const PAD = { top: 16, right: 16, bottom: 28, left: 56 };

/**
 * Evolución de una métrica en el tiempo.
 *
 * Una sola serie, así que no lleva leyenda: el título ya la nombra. El eje
 * vertical no arranca forzosamente en cero, pero cuando no lo hace se dice
 * expresamente debajo, porque un eje recortado exagera la pendiente.
 */
export function EvolutionLine({
  metricId,
  points,
}: {
  metricId: string;
  points: SeriesPoint[];
}) {
  const [active, setActive] = useState<number | null>(null);
  const metric = requireMetric(metricId);

  const geometry = useMemo(() => {
    if (points.length < 2) return null;

    const values = points.map((p) => p.value);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const span = rawMax - rawMin || Math.abs(rawMax) || 1;

    // Margen del 10 % arriba y abajo para que la línea no toque el borde.
    const min = rawMin - span * 0.1;
    const max = rawMax + span * 0.1;
    const zeroBased = min <= 0 && rawMin >= 0;

    const innerW = WIDTH - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;

    const x = (index: number) =>
      PAD.left + (index / (points.length - 1)) * innerW;
    const y = (value: number) =>
      PAD.top + innerH - ((value - min) / (max - min)) * innerH;

    const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.value)}`).join(" ");
    const area = `${path} L${x(points.length - 1)},${PAD.top + innerH} L${x(0)},${PAD.top + innerH} Z`;

    return {
      x,
      y,
      path,
      area,
      min,
      max,
      zeroBased,
      ticks: [max, (max + min) / 2, min],
    };
  }, [points]);

  if (!geometry) {
    return (
      <p className="text-sm text-ink-2">
        Hacen falta al menos dos mediciones para dibujar la evolución.
      </p>
    );
  }

  const first = points[0];
  const last = points[points.length - 1];
  const change = last.value - first.value;

  return (
    <figure className="m-0">
      <figcaption className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-ink">{metric.label}</span>
        <span className="tabular text-sm text-ink-2">
          {formatMetric(metric, first.value)} → {formatMetric(metric, last.value)}
          <span
            className={
              (metric.direction === "lower" ? -change : change) >= 0
                ? " text-[var(--good-text)]"
                : " text-[var(--critical)]"
            }
          >
            {" "}
            ({change >= 0 ? "+" : "−"}
            {formatMetric(metric, Math.abs(change))})
          </span>
        </span>
      </figcaption>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Evolución de ${metric.label} en ${points.length} mediciones, de ${formatMetric(metric, first.value)} a ${formatMetric(metric, last.value)}.`}
        onMouseLeave={() => setActive(null)}
      >
        {geometry.ticks.map((tick, index) => (
          <g key={index}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={geometry.y(tick)}
              y2={geometry.y(tick)}
              stroke="var(--line)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={geometry.y(tick) + 4}
              textAnchor="end"
              className="tabular"
              fontSize={11}
              fill="var(--ink-muted)"
            >
              {formatMetric(metric, tick)}
            </text>
          </g>
        ))}

        <defs>
          <linearGradient id={`fade-${metricId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--series-own)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--series-own)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={geometry.area} fill={`url(#fade-${metricId})`} />
        <path
          d={geometry.path}
          fill="none"
          stroke="var(--series-own)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {active !== null ? (
          <g>
            <line
              x1={geometry.x(active)}
              x2={geometry.x(active)}
              y1={PAD.top}
              y2={HEIGHT - PAD.bottom}
              stroke="var(--line-strong)"
              strokeWidth={1}
            />
            <circle
              cx={geometry.x(active)}
              cy={geometry.y(points[active].value)}
              r={5}
              fill="var(--series-own)"
              stroke="var(--surface-1)"
              strokeWidth={2}
            />
          </g>
        ) : null}

        {/* Zonas de captura del puntero: más anchas que la marca. */}
        {points.map((point, index) => (
          <rect
            key={point.date}
            x={geometry.x(index) - (WIDTH - PAD.left - PAD.right) / (points.length * 2)}
            y={PAD.top}
            width={(WIDTH - PAD.left - PAD.right) / points.length}
            height={HEIGHT - PAD.top - PAD.bottom}
            fill="transparent"
            onMouseEnter={() => setActive(index)}
          />
        ))}

        <text x={PAD.left} y={HEIGHT - 8} fontSize={11} fill="var(--ink-muted)">
          {formatMonth(first.date)}
        </text>
        <text
          x={WIDTH - PAD.right}
          y={HEIGHT - 8}
          textAnchor="end"
          fontSize={11}
          fill="var(--ink-muted)"
        >
          {formatMonth(last.date)}
        </text>
      </svg>

      <p className="mt-1 text-xs text-ink-muted">
        {active !== null
          ? `${formatMonth(points[active].date)}: ${formatMetric(metric, points[active].value)}`
          : geometry.zeroBased
            ? "Eje vertical desde cero."
            : "El eje vertical no arranca en cero: la pendiente exagera el cambio real."}
      </p>
    </figure>
  );
}

function formatMonth(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    month: "short",
    year: "2-digit",
  });
}
