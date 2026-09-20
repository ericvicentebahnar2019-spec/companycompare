"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button, cx } from "@/components/ui";
import { Field, Input, Select } from "@/components/ui/form";
import { addMeasurementAction } from "@/lib/actions/tracking";
import { requireMetric } from "@/lib/metrics/catalog";
import { formatAbsoluteDelta, formatMetric } from "@/lib/metrics/format";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : "Registrar medición"}
    </Button>
  );
}

export function MeasurementForm({
  companyId,
  metricIds,
  currentValues,
}: {
  companyId: string;
  metricIds: string[];
  currentValues: Record<string, number | null>;
}) {
  const [state, formAction] = useActionState(addMeasurementAction, {});
  const [metricId, setMetricId] = useState(metricIds[0]);
  const [value, setValue] = useState("");

  const metric = requireMetric(metricId);
  const current = currentValues[metricId] ?? null;
  const parsed = value.trim() === "" ? null : Number(value.replace(",", "."));
  const delta =
    current !== null && parsed !== null && Number.isFinite(parsed)
      ? parsed - current
      : null;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="companyId" value={companyId} />

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Métrica" htmlFor="metricId">
          <Select
            id="metricId"
            name="metricId"
            value={metricId}
            onChange={(event) => setMetricId(event.target.value)}
          >
            {metricIds.map((id) => (
              <option key={id} value={id}>
                {requireMetric(id).label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Nuevo valor"
          htmlFor="value"
          hint={
            current !== null
              ? `Valor actual: ${formatMetric(metric, current)}`
              : "No hay valor previo registrado."
          }
        >
          <Input
            id="value"
            name="value"
            inputMode="decimal"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            required
          />
        </Field>

        <Field label="Fecha" htmlFor="recordedAt" hint="Si se deja vacía, se usa hoy.">
          <Input id="recordedAt" name="recordedAt" type="date" />
        </Field>
      </div>

      {delta !== null ? (
        <p className="tabular rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm">
          <span className="text-ink-2">
            {formatMetric(metric, current)} → {formatMetric(metric, parsed)}
          </span>{" "}
          <span
            className={cx(
              "font-medium",
              (metric.direction === "lower" ? -delta : delta) >= 0
                ? "text-[var(--good-text)]"
                : "text-[var(--critical)]",
            )}
          >
            {formatAbsoluteDelta(metric, delta)}
          </span>
        </p>
      ) : null}

      <Field label="Nota" htmlFor="note" hint="Opcional: qué acción puede explicar el cambio.">
        <Input id="note" name="note" maxLength={300} />
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <Submit />
        {state.error ? (
          <span role="alert" className="text-sm text-[var(--critical)]">
            {state.error}
          </span>
        ) : null}
        {state.message ? (
          <span role="status" className="text-sm text-[var(--good-text)]">
            {state.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
