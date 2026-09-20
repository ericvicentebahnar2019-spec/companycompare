"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button, ErrorNote, InfoNote } from "@/components/ui";
import { Field, Input } from "@/components/ui/form";
import type { FormState } from "@/lib/auth/actions";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Un momento…" : label}
    </Button>
  );
}

export function LoginForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, {});

  return (
    <Shell title="Inicia sesión" subtitle="Accede a tus análisis.">
      <form action={formAction} className="space-y-4">
        {state.error ? <ErrorNote>{state.error}</ErrorNote> : null}

        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>

        <Field
          label="Contraseña"
          htmlFor="password"
          action={
            <Link href="/recuperar" className="text-xs text-ink-2 underline">
              ¿La has olvidado?
            </Link>
          }
        >
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>

        <Submit label="Entrar" />
      </form>

      <p className="mt-6 text-center text-sm text-ink-2">
        ¿Todavía no tienes cuenta?{" "}
        <Link href="/registro" className="text-ink underline">
          Crea una
        </Link>
      </p>
    </Shell>
  );
}

export function RegisterForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, {});

  return (
    <Shell
      title="Crea tu cuenta"
      subtitle="Empezarás con un análisis de demostración ya cargado."
    >
      <form action={formAction} className="space-y-4">
        {state.error ? <ErrorNote>{state.error}</ErrorNote> : null}

        <Field label="Nombre" htmlFor="name">
          <Input id="name" name="name" autoComplete="name" required />
        </Field>

        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>

        <Field
          label="Contraseña"
          htmlFor="password"
          hint="Mínimo 8 caracteres."
        >
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>

        <Submit label="Crear cuenta" />
      </form>

      <p className="mt-6 text-center text-sm text-ink-2">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-ink underline">
          Inicia sesión
        </Link>
      </p>
    </Shell>
  );
}

export function ForgotForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, {});

  return (
    <Shell
      title="Recuperar contraseña"
      subtitle="Te enviaremos un enlace para establecer una nueva."
    >
      <form action={formAction} className="space-y-4">
        {state.error ? <ErrorNote>{state.error}</ErrorNote> : null}
        {state.message ? <InfoNote>{state.message}</InfoNote> : null}

        {state.devResetLink ? (
          <InfoNote>
            Todavía no hay proveedor de email conectado. En desarrollo puedes
            usar directamente este enlace:{" "}
            <Link href={state.devResetLink} className="text-ink underline">
              restablecer contraseña
            </Link>
          </InfoNote>
        ) : null}

        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>

        <Submit label="Enviar enlace" />
      </form>

      <p className="mt-6 text-center text-sm text-ink-2">
        <Link href="/login" className="text-ink underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </Shell>
  );
}

export function ResetForm({ action, token }: { action: Action; token: string }) {
  const [state, formAction] = useActionState(action, {});

  return (
    <Shell title="Nueva contraseña" subtitle="Elige una contraseña nueva para tu cuenta.">
      <form action={formAction} className="space-y-4">
        {state.error ? <ErrorNote>{state.error}</ErrorNote> : null}
        <input type="hidden" name="token" value={token} />

        <Field label="Contraseña" htmlFor="password" hint="Mínimo 8 caracteres.">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>

        <Submit label="Guardar contraseña" />
      </form>
    </Shell>
  );
}

function Shell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-6">
      <h1 className="text-lg font-semibold text-ink">{title}</h1>
      <p className="mt-1 mb-6 text-sm text-ink-2">{subtitle}</p>
      {children}
    </div>
  );
}
