import type { Metadata } from "next";
import Link from "next/link";

import { EvolutionLine } from "@/components/charts/evolution-line";
import {
  Badge,
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
import { formatMetric } from "@/lib/metrics/format";

export const metadata: Metadata = { title: "Resumen" };

const HEADLINE_METRICS = [
  "facturacion",
  "margen",
  "numClientes",
  "tasaRecompra",
  "ticketMedio",
];

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "Buenas noches";
  if (hour < 14) return "Buenos días";
  if (hour < 21) return "Buenas tardes";
  return "Buenas noches";
}

export default async function DashboardPage() {
  const user = await requireUser();
  const store = getStore();

  const [summaries, companies, latest] = await Promise.all([
    store.listAnalyses(user.id),
    store.listCompanies(user.id),
    loadLatestAnalysis(user.id),
  ]);

  const tasks = latest ? await store.listTasks(user.id, latest.stored.id) : [];
  const pendingTasks = tasks.filter((task) => task.status !== "DONE" && task.status !== "DISCARDED");

  const snapshots = latest
    ? await store.listSnapshots(user.id, latest.stored.own.id)
    : [];

  const highFindings = latest
    ? latest.result.findings.filter((f) => f.severity === "high")
    : [];

  return (
    <>
      <PageHeader
        eyebrow={greeting()}
        title={user.name}
        description="Así está tu empresa frente a la competencia ahora mismo."
        action={<ButtonLink href="/analisis/nuevo">Nuevo análisis</ButtonLink>}
      />

      {!latest ? (
        <EmptyState
          title="Todavía no has hecho ningún análisis"
          description="Crea el primero con los datos de tu empresa y los de un competidor. Lo que no sepas del competidor puedes dejarlo en blanco."
          action={<ButtonLink href="/analisis/nuevo">Crear el primer análisis</ButtonLink>}
        />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader
              title={`Resumen de ${latest.input.own.name}`}
              description="Cifras actuales de tu empresa según el último análisis."
              action={
                latest.stored.isDemo ? <Badge tone="neutral">Datos de demostración</Badge> : null
              }
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {HEADLINE_METRICS.map((metricId) => {
                const metric = requireMetric(metricId);
                const entry = latest.input.own.values[metricId];
                return (
                  <StatTile
                    key={metricId}
                    label={metric.label}
                    value={formatMetric(metric, entry?.value ?? null)}
                  />
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Último análisis"
              description={latest.stored.title}
              action={<ButtonLink href={`/analisis/${latest.stored.id}`}>Ver análisis</ButtonLink>}
            />

            <div className="overflow-hidden rounded-lg border border-line">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-line bg-surface-2 px-4 py-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{ background: "var(--series-own)" }}
                  />
                  {latest.input.own.name}
                </span>
                <span />
                <span className="inline-flex items-center justify-end gap-1.5 text-right">
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{ background: "var(--series-rival)" }}
                  />
                  {latest.input.rival.name}
                </span>
              </div>

              {["facturacion", "margen", "tasaRecompra"].map((metricId) => {
                const metric = requireMetric(metricId);
                const gap = latest.result.gaps.find((g) => g.metricId === metricId);
                return (
                  <div
                    key={metricId}
                    className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-line px-4 py-3 last:border-b-0"
                  >
                    <span className="tabular text-sm font-medium text-ink">
                      {formatMetric(metric, gap?.ownValue ?? null)}
                    </span>
                    <span className="px-2 text-center text-xs text-ink-muted">
                      {metric.label}
                    </span>
                    <span className="tabular text-right text-sm font-medium text-ink">
                      {formatMetric(metric, gap?.rivalValue ?? null)}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="mt-4 text-sm text-ink-2">
              {highFindings.length > 0 ? (
                <>
                  <strong className="font-semibold text-ink">
                    {highFindings.length}{" "}
                    {highFindings.length === 1 ? "área crítica detectada" : "áreas críticas detectadas"}
                  </strong>
                  : {highFindings.slice(0, 3).map((f) => requireMetric(f.metricId).label.toLowerCase()).join(", ")}
                  {highFindings.length > 3 ? " y otras" : ""}.
                </>
              ) : (
                "No se ha detectado ninguna brecha de impacto alto con los datos disponibles."
              )}
            </p>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Empresas analizadas" value={companies.length} />
            <StatTile label="Comparaciones" value={summaries.length} />
            <StatTile
              label="Problemas detectados"
              value={latest.result.findings.length}
              hint={`${highFindings.length} de impacto alto`}
            />
            <StatTile
              label="Acciones pendientes"
              value={pendingTasks.length}
              hint={tasks.length > 0 ? `de ${tasks.length} en el plan` : "Sin plan todavía"}
            />
          </div>

          {snapshots.length > 0 ? (
            <Card>
              <CardHeader
                title="Evolución de métricas"
                description="Cómo se han movido tus indicadores en los últimos meses."
                action={<ButtonLink href="/seguimiento" variant="secondary">Ver seguimiento</ButtonLink>}
              />
              <div className="grid gap-8 lg:grid-cols-2">
                {["facturacion", "tasaRecompra"].map((metricId) => {
                  const points = snapshots
                    .filter((s) => s.metricId === metricId)
                    .map((s) => ({ date: s.recordedAt, value: s.value }));
                  if (points.length < 2) return null;
                  return (
                    <EvolutionLine key={metricId} metricId={metricId} points={points} />
                  );
                })}
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Análisis recientes" />
            <ul className="divide-y divide-line">
              {summaries.slice(0, 5).map((summary) => (
                <li key={summary.id}>
                  <Link
                    href={`/analisis/${summary.id}`}
                    className="-mx-2 flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-3 hover:bg-surface-hover"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">
                        {summary.title}
                      </span>
                      <span className="block text-xs text-ink-muted">
                        {summary.ownName} frente a {summary.rivalName} ·{" "}
                        {new Date(summary.createdAt).toLocaleDateString("es-ES")}
                      </span>
                    </span>
                    {summary.isDemo ? <Badge tone="neutral">Demo</Badge> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}
