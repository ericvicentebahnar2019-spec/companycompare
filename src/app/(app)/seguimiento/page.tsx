import type { Metadata } from "next";

import { EvolutionLine } from "@/components/charts/evolution-line";
import { MeasurementForm } from "@/components/tracking/measurement-form";
import {
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  StatTile,
} from "@/components/ui";
import { loadLatestAnalysis } from "@/lib/analysis/load";
import { requireUser } from "@/lib/auth/session";
import { getStore } from "@/lib/db";
import { requireMetric } from "@/lib/metrics/catalog";
import { formatAbsoluteDelta, formatMetric } from "@/lib/metrics/format";

export const metadata: Metadata = { title: "Seguimiento" };

/** Métricas que tiene sentido medir de forma periódica. */
const TRACKED = [
  "facturacion",
  "beneficio",
  "margen",
  "numClientes",
  "tasaRecompra",
  "ticketMedio",
  "cac",
  "conversion",
];

export default async function TrackingPage() {
  const user = await requireUser();
  const latest = await loadLatestAnalysis(user.id);

  if (!latest) {
    return (
      <>
        <PageHeader
          title="Seguimiento"
          description="Registra cómo evolucionan tus métricas después de ejecutar las acciones."
        />
        <EmptyState
          title="Todavía no hay nada que seguir"
          description="El seguimiento se apoya en los datos de tu empresa. Crea un análisis primero."
          action={<ButtonLink href="/analisis/nuevo">Crear análisis</ButtonLink>}
        />
      </>
    );
  }

  const snapshots = await getStore().listSnapshots(user.id, latest.stored.own.id);

  const series = TRACKED.map((metricId) => {
    const points = snapshots
      .filter((snapshot) => snapshot.metricId === metricId)
      .map((snapshot) => ({ date: snapshot.recordedAt, value: snapshot.value }));
    return { metricId, points };
  }).filter((entry) => entry.points.length > 0);

  const withHistory = series.filter((entry) => entry.points.length >= 2);

  return (
    <>
      <PageHeader
        title="Seguimiento"
        description={`Evolución de ${latest.input.own.name}. Registra una medición nueva cada vez que cierres un periodo o completes una acción.`}
      />

      <div className="space-y-6">
        <Card>
          <CardHeader
            title="Registrar una medición"
            description="El valor anterior y el nuevo se comparan automáticamente."
          />
          <MeasurementForm
            companyId={latest.stored.own.id}
            metricIds={TRACKED}
            currentValues={Object.fromEntries(
              TRACKED.map((metricId) => {
                const entry = latest.input.own.values[metricId];
                return [
                  metricId,
                  typeof entry?.value === "number" ? entry.value : null,
                ];
              }),
            )}
          />
        </Card>

        {withHistory.length > 0 ? (
          <Card>
            <CardHeader
              title="Cambio desde la primera medición"
              description="Diferencia entre el primer valor registrado y el más reciente."
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {withHistory.map(({ metricId, points }) => {
                const metric = requireMetric(metricId);
                const first = points[0].value;
                const last = points[points.length - 1].value;
                return (
                  <StatTile
                    key={metricId}
                    label={metric.label}
                    value={formatMetric(metric, last)}
                    hint={`${formatMetric(metric, first)} → ${formatMetric(metric, last)} · ${formatAbsoluteDelta(metric, last - first)}`}
                  />
                );
              })}
            </div>
          </Card>
        ) : null}

        <Card>
          <CardHeader title="Evolución" />
          {withHistory.length === 0 ? (
            <EmptyState
              title="Hacen falta al menos dos mediciones"
              description="Registra un segundo valor de cualquier métrica y aquí aparecerá su evolución."
            />
          ) : (
            <div className="grid gap-10 lg:grid-cols-2">
              {withHistory.map(({ metricId, points }) => (
                <EvolutionLine key={metricId} metricId={metricId} points={points} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
