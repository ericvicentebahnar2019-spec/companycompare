import type { Metadata } from "next";

import {
  Badge,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { getStore } from "@/lib/db";

export const metadata: Metadata = { title: "Empresas" };

export default async function CompaniesPage() {
  const user = await requireUser();
  const companies = await getStore().listCompanies(user.id);

  const own = companies.filter((company) => company.role === "own");
  const rivals = companies.filter((company) => company.role === "rival");

  return (
    <>
      <PageHeader
        title="Empresas"
        description="Las empresas que aparecen en tus análisis, tanto las tuyas como las de la competencia."
        action={<ButtonLink href="/analisis/nuevo">Nuevo análisis</ButtonLink>}
      />

      {companies.length === 0 ? (
        <EmptyState
          title="Todavía no hay empresas"
          description="Las empresas se crean al hacer un análisis."
          action={<ButtonLink href="/analisis/nuevo">Crear análisis</ButtonLink>}
        />
      ) : (
        <div className="space-y-6">
          <CompanyGroup title="Tus empresas" companies={own} />
          <CompanyGroup title="Competidores" companies={rivals} />
        </div>
      )}
    </>
  );
}

function CompanyGroup({
  title,
  companies,
}: {
  title: string;
  companies: Awaited<ReturnType<ReturnType<typeof getStore>["listCompanies"]>>;
}) {
  if (companies.length === 0) return null;

  return (
    <Card>
      <CardHeader title={title} description={`${companies.length} en total.`} />
      <ul className="grid gap-3 sm:grid-cols-2">
        {companies.map((company) => (
          <li key={company.id} className="rounded-lg border border-line bg-surface-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-ink">{company.name}</p>
              {company.isDemo ? <Badge tone="neutral">Demo</Badge> : null}
            </div>
            <dl className="mt-2 space-y-0.5 text-xs text-ink-2">
              {company.sector ? <Detail term="Sector" value={company.sector} /> : null}
              {company.country ? <Detail term="País" value={company.country} /> : null}
              {company.employees !== null ? (
                <Detail term="Empleados" value={String(company.employees)} />
              ) : null}
              {company.foundedAt !== null ? (
                <Detail term="Desde" value={String(company.foundedAt)} />
              ) : null}
            </dl>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Detail({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-ink-muted">{term}:</dt>
      <dd className="text-ink-2">{value}</dd>
    </div>
  );
}
