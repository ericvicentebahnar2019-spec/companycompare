"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button, Card, CardHeader, cx } from "@/components/ui";
import { Input, Select } from "@/components/ui/form";
import { setMetricValueAction } from "@/lib/actions/metrics";
import type { DataGap } from "@/lib/analysis/next-question";
import { requireMetric } from "@/lib/metrics/catalog";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="px-3 py-1.5 text-xs">
      {pending ? "Guardando…" : "Guardar"}
    </Button>
  );
}

const MISSING_LABEL = {
  own: "de tu empresa",
  rival: "del competidor",
  both: "de las dos empresas",
} as const;

/**
 * Pide el siguiente dato, de uno en uno y diciendo qué se gana.
 *
 * Solo aparecen métricas que resolverían una duda que el análisis ya tiene
 * abierta. Si no hay ninguna, la tarjeta no se muestra: no tiene sentido pedir
 * datos porque sí.
 */
export function NextQuestions({
  gaps,
  analysisId,
  ownName,
  rivalName,
}: {
  gaps: DataGap[];
  analysisId: string;
  ownName: string;
  rivalName: string;
}) {
  if (gaps.length === 0) return null;

  return (
    <Card>
      <CardHeader
        title="Un dato más y afinamos el diagnóstico"
        description="Estos son los únicos datos que ahora mismo cambiarían algo. Cada uno dice qué duda resolvería."
      />
      <ul className="space-y-3">
        {gaps.map((gap) => (
          <GapRow
            key={gap.metricId}
            gap={gap}
            analysisId={analysisId}
            ownName={ownName}
            rivalName={rivalName}
          />
        ))}
      </ul>
    </Card>
  );
}

function GapRow({
  gap,
  analysisId,
  ownName,
  rivalName,
}: {
  gap: DataGap;
  analysisId: string;
  ownName: string;
  rivalName: string;
}) {
  const [state, formAction] = useActionState(setMetricValueAction, {});
  const [open, setOpen] = useState(false);
  const metric = requireMetric(gap.metricId);

  // Cuando falta en las dos, se pregunta primero por la propia: es el dato que
  // el empresario puede consultar sin salir de su casa.
  const role = gap.missingFor === "rival" ? "rival" : "own";
  const company = role === "own" ? ownName : rivalName;

  return (
    <li className="rounded-lg border border-line bg-surface-2 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">
            {metric.label}{" "}
            <span className="font-normal text-ink-muted">
              {MISSING_LABEL[gap.missingFor]}
            </span>
          </p>
          <p className="mt-1 text-sm text-ink-2">
            <span className="text-ink-muted">Serviría para confirmar o descartar: </span>
            {gap.reason}
          </p>
        </div>
        {!open ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(true)}
            className="px-3 py-1.5 text-xs"
          >
            Lo sé
          </Button>
        ) : null}
      </div>

      {open ? (
        <form action={formAction} className="mt-4 border-t border-line pt-4">
          <input type="hidden" name="analysisId" value={analysisId} />
          <input type="hidden" name="role" value={role} />
          <input type="hidden" name="metricId" value={metric.id} />

          <p className="mb-2 text-xs text-ink-2">
            {metric.help} Se guardará como dato de{" "}
            <strong className="font-medium text-ink">{company}</strong>.
          </p>

          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-32 flex-1">
              <span className="sr-only">{metric.label}</span>
              <Input
                name="value"
                inputMode="decimal"
                autoFocus
                placeholder={metric.unit ?? "Valor"}
                required
              />
            </label>

            {role === "rival" ? (
              <Select name="provenance" defaultValue="estimate" className="w-40 text-xs">
                <option value="estimate">Estimación propia</option>
                <option value="public">Dato público</option>
                <option value="user">Dato confirmado</option>
              </Select>
            ) : (
              <input type="hidden" name="provenance" value="user" />
            )}

            <Submit />
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 text-xs"
            >
              Cancelar
            </Button>
          </div>

          {state.error || state.message ? (
            <p
              role="status"
              className={cx(
                "mt-2 text-xs",
                state.error ? "text-[var(--critical)]" : "text-[var(--good-text)]",
              )}
            >
              {state.error ?? state.message}
            </p>
          ) : null}
        </form>
      ) : null}
    </li>
  );
}
