"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { Badge, Button, Card, CardHeader, cx, ErrorNote, InfoNote } from "@/components/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { createAnalysisAction } from "@/lib/actions/analysis";
import { metricsBySection } from "@/lib/metrics/catalog";
import {
  SECTIONS,
  SECTION_META,
  type MetricDefinition,
  type SectionId,
} from "@/lib/metrics/types";

const STEPS = [
  { id: "own", label: "Tu empresa" },
  { id: "rival", label: "Competidor" },
  { id: "review", label: "Revisar" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Analizando…" : "Crear análisis"}
    </Button>
  );
}

/**
 * Formulario de captura por categorías.
 *
 * Los tres pasos viven en el mismo formulario y se ocultan con CSS en lugar de
 * desmontarse: así nada de lo escrito se pierde al navegar entre pasos y el
 * envío manda siempre el conjunto completo.
 */
export function NewAnalysisForm() {
  const [state, formAction] = useActionState(createAnalysisAction, {});
  const [step, setStep] = useState<StepId>("own");

  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <nav aria-label="Pasos" className="flex flex-wrap gap-2">
        {STEPS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setStep(item.id)}
            aria-current={step === item.id ? "step" : undefined}
            className={cx(
              "rounded-lg border px-3 py-1.5 text-sm transition-colors",
              step === item.id
                ? "border-accent bg-surface-2 font-medium text-ink"
                : "border-line text-ink-2 hover:bg-surface-hover",
            )}
          >
            <span className="tabular text-ink-muted">{index + 1}.</span> {item.label}
          </button>
        ))}
      </nav>

      {state.error ? <ErrorNote>{state.error}</ErrorNote> : null}

      <div hidden={step !== "own"} className="space-y-5">
        <InfoNote>
          Rellena lo que sepas de tu empresa. Lo que dejes en blanco se marcará
          como desconocido y podrás añadirlo más adelante.
        </InfoNote>
        {SECTIONS.map((section) => (
          <SectionCard
            key={section}
            section={section}
            prefix="own"
            errors={errors}
          />
        ))}
        <div className="flex justify-end">
          <Button type="button" onClick={() => setStep("rival")}>
            Continuar con el competidor
          </Button>
        </div>
      </div>

      <div hidden={step !== "rival"} className="space-y-5">
        <InfoNote>
          Del competidor rara vez se sabe todo. Marca{" "}
          <strong className="text-ink">No lo sé</strong> en lo que desconozcas: el
          análisis lo tratará como dato desconocido en lugar de inventarlo, y te
          dirá cuánto ganaría de precisión si lo completas después.
        </InfoNote>
        {SECTIONS.map((section) => (
          <SectionCard
            key={section}
            section={section}
            prefix="rival"
            errors={errors}
          />
        ))}
        <div className="flex justify-between">
          <Button type="button" variant="secondary" onClick={() => setStep("own")}>
            Volver
          </Button>
          <Button type="button" onClick={() => setStep("review")}>
            Revisar y crear
          </Button>
        </div>
      </div>

      <div hidden={step !== "review"} className="space-y-5">
        <Card>
          <CardHeader
            title="Últimos detalles"
            description="Ponle nombre al análisis para reconocerlo más adelante."
          />
          <div className="space-y-4">
            <Field
              label="Título del análisis"
              htmlFor="title"
              hint="Si lo dejas vacío se usará «Tu empresa frente al competidor»."
            >
              <Input id="title" name="title" maxLength={120} />
            </Field>
            <Field
              label="Notas"
              htmlFor="notes"
              hint="Opcional: contexto que te ayude a interpretar el análisis dentro de unos meses."
            >
              <Textarea id="notes" name="notes" maxLength={1000} />
            </Field>
          </div>
        </Card>

        <div className="flex justify-between">
          <Button type="button" variant="secondary" onClick={() => setStep("rival")}>
            Volver
          </Button>
          <SubmitButton />
        </div>
      </div>
    </form>
  );
}

function SectionCard({
  section,
  prefix,
  errors,
}: {
  section: SectionId;
  prefix: "own" | "rival";
  errors: Record<string, string>;
}) {
  const meta = SECTION_META[section];
  const metrics = metricsBySection(section);

  return (
    <Card>
      <CardHeader title={meta.label} description={meta.description} />
      <div className="grid gap-4 sm:grid-cols-2">
        {metrics.map((metric) => (
          <MetricField
            key={metric.id}
            metric={metric}
            prefix={prefix}
            error={errors[`${prefix}.${metric.id}`]}
          />
        ))}
      </div>
    </Card>
  );
}

function MetricField({
  metric,
  prefix,
  error,
}: {
  metric: MetricDefinition;
  prefix: "own" | "rival";
  error?: string;
}) {
  const [unknown, setUnknown] = useState(false);
  const key = `${prefix}.${metric.id}`;
  const required = metric.id === "nombre";

  return (
    <Field
      label={
        <span className="flex items-center gap-2">
          {metric.label}
          {metric.unit ? (
            <span className="text-xs font-normal text-ink-muted">({metric.unit})</span>
          ) : null}
        </span>
      }
      htmlFor={key}
      hint={metric.help}
      error={error}
      action={
        prefix === "rival" && !required ? (
          <label className="flex items-center gap-1.5 text-xs text-ink-2">
            <input
              type="checkbox"
              name={`${key}.unknown`}
              checked={unknown}
              onChange={(event) => setUnknown(event.target.checked)}
              className="size-3.5 accent-[var(--accent)]"
            />
            No lo sé
          </label>
        ) : null
      }
    >
      {unknown ? (
        <div className="rounded-lg border border-dashed border-line-strong bg-surface-2 px-3 py-2">
          <Badge tone="neutral">Dato desconocido</Badge>
        </div>
      ) : (
        <>
          {metric.format === "enum" ? (
            <Select id={key} name={key} defaultValue="">
              <option value="">Sin especificar</option>
              {(metric.options ?? []).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              id={key}
              name={key}
              required={required}
              inputMode={metric.format === "text" ? "text" : "decimal"}
              placeholder={placeholderFor(metric)}
            />
          )}

          {prefix === "rival" && metric.format !== "text" ? (
            <Select
              name={`${key}.prov`}
              defaultValue="estimate"
              aria-label={`Procedencia del dato de ${metric.label}`}
              className="mt-1.5 text-xs"
            >
              <option value="estimate">Estimación propia</option>
              <option value="public">Dato público</option>
              <option value="user">Dato confirmado</option>
            </Select>
          ) : null}
        </>
      )}
    </Field>
  );
}

/**
 * Pista de formato, no un ejemplo con cifra.
 *
 * Un ejemplo numérico concreto sirve para la facturación y es absurdo para el
 * coste de adquisición, así que se indica la unidad esperada en lugar de
 * sugerir una magnitud que puede desorientar.
 */
function placeholderFor(metric: MetricDefinition): string {
  switch (metric.format) {
    case "currency":
      return "Importe en euros";
    case "percent":
      return "Porcentaje (14,2)";
    case "score":
      return `De 0 a ${metric.max ?? 10}`;
    case "days":
      return "Número de días";
    case "perYear":
      return metric.unit ?? "Veces al año";
    case "number":
      return "Cantidad";
    default:
      return "";
  }
}
