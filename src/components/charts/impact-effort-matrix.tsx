"use client";

import { useState } from "react";

import { LEVEL_LABEL, type Level } from "@/lib/analysis/types";

export interface MatrixPoint {
  id: string;
  label: string;
  /** 0-100, procedente de la puntuación de impacto del hallazgo. */
  impact: number;
  /** 0-100, calculado a partir del coste y la dificultad de la acción. */
  effort: number;
  severity: Level;
  metricLabel: string;
}

const WIDTH = 600;
const HEIGHT = 420;
const PAD = { top: 28, right: 24, bottom: 44, left: 56 };

const SEVERITY_COLOR: Record<Level, string> = {
  high: "var(--critical)",
  medium: "var(--serious)",
  low: "var(--warning)",
};

/**
 * Matriz impacto / esfuerzo.
 *
 * Los dos ejes son puntuaciones calculadas por el motor, no estimaciones
 * sueltas: el impacto viene del tamaño de la brecha y del peso de la métrica,
 * y el esfuerzo del coste y la dificultad de la acción. El cuadrante superior
 * izquierdo es el de mejor relación, pero es una guía de orden de trabajo, no
 * una promesa de resultado.
 */
export function ImpactEffortMatrix({ points }: { points: MatrixPoint[] }) {
  const [active, setActive] = useState<string | null>(null);

  if (points.length === 0) return null;

  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;

  // Margen interior para que una marca en el extremo de la escala (impacto
  // 100, esfuerzo 0) no quede cortada por el borde del recuadro.
  const INSET = 16;
  const x = (effort: number) =>
    PAD.left + INSET + (effort / 100) * (innerW - INSET * 2);
  const y = (impact: number) =>
    PAD.top + innerH - INSET - (impact / 100) * (innerH - INSET * 2);

  const placed = spread(points, x, y);
  const activePoint = points.find((p) => p.id === active) ?? null;

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Matriz de impacto frente a esfuerzo con ${points.length} acciones.`}
      >
        <rect
          x={PAD.left}
          y={PAD.top}
          width={innerW / 2}
          height={innerH / 2}
          fill="var(--surface-2)"
        />

        <line
          x1={PAD.left + innerW / 2}
          x2={PAD.left + innerW / 2}
          y1={PAD.top}
          y2={PAD.top + innerH}
          stroke="var(--line)"
          strokeWidth={1}
        />
        <line
          x1={PAD.left}
          x2={PAD.left + innerW}
          y1={PAD.top + innerH / 2}
          y2={PAD.top + innerH / 2}
          stroke="var(--line)"
          strokeWidth={1}
        />

        <rect
          x={PAD.left}
          y={PAD.top}
          width={innerW}
          height={innerH}
          fill="none"
          stroke="var(--line-strong)"
          strokeWidth={1}
        />

        <text x={PAD.left + 8} y={PAD.top + 16} fontSize={11} fill="var(--ink-muted)">
          Empezar por aquí
        </text>
        <text
          x={PAD.left + innerW - 8}
          y={PAD.top + 16}
          textAnchor="end"
          fontSize={11}
          fill="var(--ink-muted)"
        >
          Planificar
        </text>
        <text
          x={PAD.left + 8}
          y={PAD.top + innerH - 8}
          fontSize={11}
          fill="var(--ink-muted)"
        >
          Rellenar huecos
        </text>
        <text
          x={PAD.left + innerW - 8}
          y={PAD.top + innerH - 8}
          textAnchor="end"
          fontSize={11}
          fill="var(--ink-muted)"
        >
          Descartar por ahora
        </text>

        <text
          transform={`translate(16, ${PAD.top + innerH / 2}) rotate(-90)`}
          textAnchor="middle"
          fontSize={12}
          fill="var(--ink-2)"
        >
          Impacto potencial →
        </text>
        <text
          x={PAD.left + innerW / 2}
          y={HEIGHT - 10}
          textAnchor="middle"
          fontSize={12}
          fill="var(--ink-2)"
        >
          Esfuerzo (coste + dificultad) →
        </text>

        {placed.map(({ point, cx, cy }, index) => {
          const isActive = point.id === active;
          return (
            <g
              key={point.id}
              onMouseEnter={() => setActive(point.id)}
              onMouseLeave={() => setActive(null)}
              tabIndex={0}
              onFocus={() => setActive(point.id)}
              onBlur={() => setActive(null)}
              role="button"
              aria-label={`${point.label}. Impacto ${point.impact} sobre 100, esfuerzo ${point.effort} sobre 100.`}
            >
              {/* Zona de captura mayor que la marca visible. */}
              <circle cx={cx} cy={cy} r={18} fill="transparent" />
              <circle
                cx={cx}
                cy={cy}
                r={isActive ? 11 : 9}
                fill={SEVERITY_COLOR[point.severity]}
                stroke="var(--surface-1)"
                strokeWidth={2}
              />
              <text
                x={cx}
                y={cy + 4}
                textAnchor="middle"
                fontSize={11}
                fontWeight={600}
                fill="#ffffff"
              >
                {index + 1}
              </text>
            </g>
          );
        })}
      </svg>

      <div
        role="status"
        className="mt-3 min-h-16 rounded-lg border border-line bg-surface-2 p-3 text-sm"
      >
        {activePoint ? (
          <>
            <p className="font-medium text-ink">{activePoint.label}</p>
            <p className="tabular mt-1 text-ink-2">
              {activePoint.metricLabel} · impacto {activePoint.impact}/100 ·
              esfuerzo {activePoint.effort}/100 ·{" "}
              {LEVEL_LABEL[activePoint.severity].toLowerCase()}
            </p>
          </>
        ) : (
          <p className="text-ink-2">
            Pasa el ratón o tabula por los puntos para ver a qué acción
            corresponde cada uno.
          </p>
        )}
      </div>

      <ol className="mt-4 space-y-2 text-sm">
        {points.map((point, index) => (
          <li key={point.id} className="flex items-start gap-3">
            <span
              className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
              style={{ background: SEVERITY_COLOR[point.severity] }}
            >
              {index + 1}
            </span>
            <span className="min-w-0">
              <span className="text-ink">{point.label}</span>{" "}
              <span className="tabular text-ink-muted">
                · impacto {point.impact} · esfuerzo {point.effort}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Distancia por debajo de la cual dos marcas se tapan entre sí. */
const COLLISION_DISTANCE = 22;

/**
 * Separa las marcas que caerían unas encima de otras.
 *
 * Dos acciones con impacto y esfuerzo parecidos se dibujan casi en el mismo
 * sitio y una tapa a la otra. Se agrupan las que caen a menos de
 * `COLLISION_DISTANCE` y se reparten en círculo alrededor del centro del
 * grupo: el desplazamiento es pequeño y determinista, así que no cambia el
 * cuadrante en el que se lee cada acción pero las deja todas visibles.
 */
function spread(
  points: MatrixPoint[],
  x: (effort: number) => number,
  y: (impact: number) => number,
): { point: MatrixPoint; cx: number; cy: number }[] {
  const clusters: { cx: number; cy: number; members: MatrixPoint[] }[] = [];

  for (const point of points) {
    const px = x(point.effort);
    const py = y(point.impact);

    const near = clusters.find(
      (cluster) => Math.hypot(cluster.cx - px, cluster.cy - py) < COLLISION_DISTANCE,
    );

    if (near) {
      near.members.push(point);
    } else {
      clusters.push({ cx: px, cy: py, members: [point] });
    }
  }

  const placed = new Map<string, { cx: number; cy: number }>();
  for (const cluster of clusters) {
    if (cluster.members.length === 1) {
      placed.set(cluster.members[0].id, { cx: cluster.cx, cy: cluster.cy });
      continue;
    }

    // Radio suficiente para que las marcas del grupo no se toquen entre sí.
    const radius = Math.max(13, (COLLISION_DISTANCE / 2) * (cluster.members.length / 3));
    cluster.members.forEach((point, index) => {
      const angle = (index / cluster.members.length) * Math.PI * 2 - Math.PI / 2;
      placed.set(point.id, {
        cx: cluster.cx + Math.cos(angle) * radius,
        cy: cluster.cy + Math.sin(angle) * radius,
      });
    });
  }

  return points.map((point) => {
    const position = placed.get(point.id);
    return {
      point,
      cx: position ? position.cx : x(point.effort),
      cy: position ? position.cy : y(point.impact),
    };
  });
}
