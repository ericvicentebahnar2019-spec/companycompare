import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ImpactEffortMatrix } from "@/components/charts/impact-effort-matrix";
import { TaskBoard } from "@/components/plan/task-board";
import { ButtonLink, Card, CardHeader, InfoNote, PageHeader } from "@/components/ui";
import { collectRecommendations } from "@/lib/analysis/engine";
import { loadAnalysis } from "@/lib/analysis/load";
import { requireUser } from "@/lib/auth/session";
import { getStore } from "@/lib/db";
import { requireMetric } from "@/lib/metrics/catalog";

export const metadata: Metadata = { title: "Plan de acción" };

export default async function PlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const loaded = await loadAnalysis(user.id, id);
  if (!loaded) notFound();

  const tasks = await getStore().listTasks(user.id, id);
  const ranked = collectRecommendations(loaded.result).slice(0, 8);

  const points = ranked.map(({ finding, recommendation }) => ({
    id: recommendation.id,
    label: recommendation.title,
    impact: finding.impactScore,
    effort: recommendation.effortScore,
    severity: finding.severity,
    metricLabel: requireMetric(finding.metricId).label,
  }));

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href={`/analisis/${id}`} className="hover:text-ink">
            ← Volver a la comparación
          </Link>
        }
        title="Plan de acción"
        description={`${loaded.input.own.name} frente a ${loaded.input.rival.name}`}
        action={<ButtonLink href={`/analisis/${id}/informe`} variant="secondary">Ver informe</ButtonLink>}
      />

      <div className="space-y-6">
        <Card>
          <CardHeader
            title="Priorización: impacto frente a esfuerzo"
            description="El impacto viene del tamaño de la brecha y del peso de la métrica; el esfuerzo, del coste y la dificultad de la acción."
          />
          {points.length === 0 ? (
            <InfoNote>
              No hay acciones que priorizar: el análisis no ha detectado
              diferencias materiales.
            </InfoNote>
          ) : (
            <>
              <ImpactEffortMatrix points={points} />
              <p className="mt-4 text-xs text-ink-muted">
                Esta matriz ordena el trabajo, no promete resultados. Dos acciones
                en el mismo cuadrante pueden comportarse de forma muy distinta
                según el negocio.
              </p>
            </>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Tareas"
            description="Marca lo que vayas completando y asigna fecha y responsable a cada paso."
          />
          <TaskBoard analysisId={id} tasks={tasks} />
        </Card>
      </div>
    </>
  );
}
