"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { Badge, Button, Card, CardHeader, cx, ErrorNote } from "@/components/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { createAnalysisAction } from "@/lib/actions/analysis";
import { metricsBySection, requireMetric } from "@/lib/metrics/catalog";
import {
  SECTIONS,
  SECTION_META,
  type MetricDefinition,
  type SectionId,
} from "@/lib/metrics/types";

/**
 * Lo mínimo para que el análisis diga algo útil.
 *
 * Con facturación, clientes y ticket medio de cada empresa se despeja la
 * frecuencia de compra, y con ella funciona la descomposición de la brecha de
 * facturación, que es la pieza que de verdad explica de dónde viene la
 * diferencia. Todo lo demás afina, pero no hace falta para empezar.
 */
const ESSENTIAL_OWN = [
  "nombre",
  "sector",
  "facturacion",
  "numClientes",
  "ticketMedio",
] as const;

const ESSENTIAL_RIVAL = [
  "nombre",
  "facturacion",
  "numClientes",
  "ticketMedio",
] as const;

const ESSENTIAL_IDS = new Set<string>([...ESSENTIAL_OWN, ...ESSENTIAL_RIVAL]);

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Analizando…" : "Analizar"}
    </Button>
  );
}

/**
 * Formulario de nuevo análisis.
 *
 * Arranca pidiendo nueve datos, no ochenta y ocho. El resto del catálogo sigue
 * disponible plegado debajo: está siempre en el DOM, así que lo que se escriba
 * ahí no se pierde al plegarlo y se envía igual. Un campo vacío o sin abrir se
 * guarda como desconocido, nunca como cero.
 */
export function NewAnalysisForm() {
  const [state, formAction] = useActionState(createAnalysisAction, {});
  const errors = state.fieldErrors ?? {};

  // Si la validación falla en un campo del bloque avanzado, se despliega solo:
  // si no, el error quedaría escondido y parecería que no pasa nada.
  const hasAdvancedError = Object.keys(errors).some(
    (key) => !ESSENTIAL_IDS.has(key.split(".")[1] ?? ""),
  );
  const [expanded, setExpanded] = useState(false);
  const showAdvanced = expanded || hasAdvancedError;

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? <ErrorNote>{state.error}</ErrorNote> : null}

      <Card>
        <CardHeader
          title="Lo esencial"
          description="Con estos números ya se puede saber de dónde viene la diferencia. La frecuencia de compra no hace falta: se deduce de los tres."
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <CompanyColumn
            prefix="own"
            label="Tu empresa"
            metricIds={[...ESSENTIAL_OWN]}
            errors={errors}
          />
          <CompanyColumn
            prefix="rival"
            label="Competidor"
            hint="Lo que no sepas, márcalo como desconocido. El análisis lo tendrá en cuenta en vez de inventarlo."
            metricIds={[...ESSENTIAL_RIVAL]}
            errors={errors}
          />
        </div>
      </Card>

      <Card>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={showAdvanced}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span>
            <span className="block text-base font-semibold text-ink">
              Afinar el análisis
            </span>
            <span className="mt-1 block text-sm text-ink-2">
              Opcional. Cuantos más datos, más preciso el diagnóstico, pero
              puedes añadirlos más adelante.
            </span>
          </span>
          <span className="shrink-0 text-sm text-ink-2">
            {showAdvanced ? "Ocultar" : "Mostrar"}
          </span>
        </button>

        {/*
          Los campos avanzados se ocultan con `hidden`, no se desmontan: así lo
          que ya se haya escrito sigue en el formulario y se envía aunque se
          vuelva a plegar el bloque.
        */}
        <div hidden={!showAdvanced} className="mt-6 space-y-6">
          {SECTIONS.map((section) => (
            <AdvancedSection key={section} section={section} errors={errors} />
          ))}
        </div>
      </Card>

      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Título del análisis"
            htmlFor="title"
            hint="Opcional. Si lo dejas vacío se usan los nombres de las dos empresas."
          >
            <Input id="title" name="title" maxLength={120} />
          </Field>
          <Field label="Notas" htmlFor="notes" hint="Opcional.">
            <Textarea id="notes" name="notes" maxLength={1000} className="min-h-10" />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}

function CompanyColumn({
  prefix,
  label,
  hint,
  metricIds,
  errors,
}: {
  prefix: "own" | "rival";
  label: string;
  hint?: string;
  metricIds: string[];
  errors: Record<string, string>;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <span
          aria-hidden
          className="size-2.5 rounded-full"
          style={{
            background:
              prefix === "own" ? "var(--series-own)" : "var(--series-rival)",
          }}
        />
        <p className="text-sm font-semibold text-ink">{label}</p>
      </div>

      {hint ? <p className="mb-4 text-xs text-ink-2">{hint}</p> : null}

      <div className="space-y-4">
        {metricIds.map((metricId) => (
          <MetricField
            key={metricId}
            metric={requireMetric(metricId)}
            prefix={prefix}
            error={errors[`${prefix}.${metricId}`]}
          />
        ))}
      </div>
    </div>
  );
}

/** Una sección del catálogo, sin los campos que ya están arriba. */
function AdvancedSection({
  section,
  errors,
}: {
  section: SectionId;
  errors: Record<string, string>;
}) {
  const meta = SECTION_META[section];
  const metrics = metricsBySection(section).filter((m) => !ESSENTIAL_IDS.has(m.id));
  if (metrics.length === 0) return null;

  return (
    <fieldset className="rounded-lg border border-line p-4">
      <legend className="px-1 text-sm font-semibold text-ink">{meta.label}</legend>
      <p className="mb-4 text-xs text-ink-2">{meta.description}</p>

      <div className="grid gap-5 sm:grid-cols-2">
        {(["own", "rival"] as const).map((prefix) => (
          <div key={prefix}>
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-muted">
              {prefix === "own" ? "Tu empresa" : "Competidor"}
            </p>
            <div className="space-y-4">
              {metrics.map((metric) => (
                <MetricField
                  key={metric.id}
                  metric={metric}
                  prefix={prefix}
                  error={errors[`${prefix}.${metric.id}`]}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
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
      <div className={cx(unknown && "hidden")}>
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
      </div>

      {unknown ? (
        <div className="rounded-lg border border-dashed border-line-strong bg-surface-2 px-3 py-2">
          <Badge tone="neutral">Dato desconocido</Badge>
        </div>
      ) : null}
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
