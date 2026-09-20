import type { ComponentProps, ReactNode } from "react";
import { cx } from "./index";

const CONTROL =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted transition-colors focus:border-accent";

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  action,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
          {label}
        </label>
        {action}
      </div>
      {children}
      {hint && !error ? <p className="text-xs text-ink-2">{hint}</p> : null}
      {error ? (
        <p className="text-xs text-[var(--critical)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input {...rest} className={cx(CONTROL, className)} />;
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea {...rest} className={cx(CONTROL, "min-h-24", className)} />;
}

export function Select({ className, children, ...rest }: ComponentProps<"select">) {
  return (
    <select {...rest} className={cx(CONTROL, className)}>
      {children}
    </select>
  );
}

export function Fieldset({
  legend,
  description,
  children,
}: {
  legend: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <fieldset className="space-y-4">
      <div>
        <legend className="text-sm font-semibold text-ink">{legend}</legend>
        {description ? (
          <p className="mt-1 text-sm text-ink-2">{description}</p>
        ) : null}
      </div>
      {children}
    </fieldset>
  );
}
