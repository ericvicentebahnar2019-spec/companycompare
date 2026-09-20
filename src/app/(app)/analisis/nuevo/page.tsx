import type { Metadata } from "next";

import { NewAnalysisForm } from "@/components/analysis/new-analysis-form";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Nuevo análisis" };

export default function NewAnalysisPage() {
  return (
    <>
      <PageHeader
        title="Nuevo análisis"
        description="Tres números de tu empresa y tres del competidor bastan para empezar. Lo que no sepas de la competencia puedes marcarlo como desconocido: el análisis lo tendrá en cuenta en lugar de inventarlo."
      />
      <NewAnalysisForm />
    </>
  );
}
