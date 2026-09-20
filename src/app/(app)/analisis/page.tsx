import type { Metadata } from "next";
import Link from "next/link";

import { Badge, ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { getStore } from "@/lib/db";

export const metadata: Metadata = { title: "Análisis" };

export default async function AnalysesPage() {
  const user = await requireUser();
  const summaries = await getStore().listAnalyses(user.id);

  return (
    <>
      <PageHeader
        title="Análisis"
        description="Todas tus comparaciones, de la más reciente a la más antigua."
        action={<ButtonLink href="/analisis/nuevo">Nuevo análisis</ButtonLink>}
      />

      {summaries.length === 0 ? (
        <EmptyState
          title="No hay ningún análisis"
          description="Crea una comparación entre tu empresa y un competidor para empezar."
          action={<ButtonLink href="/analisis/nuevo">Crear análisis</ButtonLink>}
        />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {summaries.map((summary) => (
              <li key={summary.id}>
                <Link
                  href={`/analisis/${summary.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-surface-hover"
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
      )}
    </>
  );
}
