"use client";

import { ComparisonBars } from "@/components/charts/comparison-bars";
import { Badge } from "@/components/ui";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { AREA_META, type AreaId } from "@/lib/metrics/types";
import type { AreaScore, Gap } from "@/lib/analysis/types";

/**
 * Comparación por áreas. Cada pestaña muestra las métricas de un área con sus
 * barras y el número de hallazgos que contiene.
 */
export function AreaTabs({
  gaps,
  areaScores,
  ownName,
  rivalName,
}: {
  gaps: Gap[];
  areaScores: AreaScore[];
  ownName: string;
  rivalName: string;
}) {
  const items: TabItem[] = areaScores
    .filter((score) => score.total > 0)
    .map((score) => {
      const areaGaps = gaps.filter((gap) => gap.area === score.area);
      return {
        id: score.area,
        label: `${AREA_META[score.area as AreaId].icon} ${AREA_META[score.area as AreaId].label}`,
        badge:
          score.findings > 0 ? (
            <Badge tone="serious">{score.findings}</Badge>
          ) : null,
        content: (
          <div>
            <p className="mb-5 text-sm text-ink-2">
              {AREA_META[score.area as AreaId].description}{" "}
              {score.known < score.total ? (
                <span className="text-ink-muted">
                  Hay datos comparables en {score.known} de {score.total} métricas
                  de esta área.
                </span>
              ) : null}
            </p>
            <ComparisonBars gaps={areaGaps} ownName={ownName} rivalName={rivalName} />
          </div>
        ),
      };
    });

  return <Tabs items={items} />;
}
