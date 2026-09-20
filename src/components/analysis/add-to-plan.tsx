"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button, cx } from "@/components/ui";
import { addRecommendationToPlan } from "@/lib/actions/tasks";
import type { Recommendation } from "@/lib/analysis/types";

function Submit({ label, variant }: { label: string; variant: "primary" | "secondary" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? "Añadiendo…" : label}
    </Button>
  );
}

/**
 * Convierte una recomendación en tareas del plan.
 *
 * Los pasos viajan como campos ocultos para que el servidor no tenga que
 * volver a ejecutar el análisis solo para saber qué tareas crear.
 */
export function AddToPlan({
  recommendation,
  analysisId,
  label = "Añadir al plan de acción",
  variant = "secondary",
}: {
  recommendation: Recommendation;
  analysisId: string;
  label?: string;
  variant?: "primary" | "secondary";
}) {
  const [state, formAction] = useActionState(addRecommendationToPlan, {});

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="analysisId" value={analysisId} />
      <input type="hidden" name="recommendationId" value={recommendation.id} />
      <input type="hidden" name="title" value={recommendation.title} />
      {recommendation.steps.map((step) => (
        <input key={step} type="hidden" name="step" value={step} />
      ))}

      <Submit label={label} variant={variant} />

      {state.message || state.error ? (
        <span
          role="status"
          className={cx(
            "text-sm",
            state.error ? "text-[var(--critical)]" : "text-[var(--good-text)]",
          )}
        >
          {state.error ?? state.message}
        </span>
      ) : null}
    </form>
  );
}
