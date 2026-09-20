import type { Metadata } from "next";

import { NewAnalysisForm } from "@/components/analysis/new-analysis-form";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Nuevo análisis" };

export default function NewAnalysisPage() {
  return (
    <>
      <PageHeader
        title="Nuevo análisis"
        description="Introduce los datos de tu empresa y los del competidor con el que quieres compararte. No hace falta tenerlo todo: lo que falte se marca como desconocido."
      />
      <NewAnalysisForm />
    </>
  );
}
