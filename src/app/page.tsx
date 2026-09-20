import Link from "next/link";
import { redirect } from "next/navigation";

import { ButtonLink } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/session";

const STEPS = [
  {
    title: "Introduce los datos",
    body: "Tu empresa y la que quieres alcanzar, por categorías. Lo que no sepas del competidor se queda marcado como desconocido: no se inventa.",
  },
  {
    title: "Mira dónde está la distancia",
    body: "Brechas por área con el criterio a la vista: cuánto se separa cada métrica de su umbral y cuánto pesa en el negocio.",
  },
  {
    title: "Entiende por qué",
    body: "Cada diferencia lleva sus posibles causas, con la evidencia que las sostiene, el nivel de confianza y lo que falta por comprobar.",
  },
  {
    title: "Decide qué hacer",
    body: "Acciones concretas con pasos, coste, dificultad y KPI. Se convierten en un plan por semanas y se sigue su evolución.",
  },
];

export default async function LandingPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-6 py-5">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
          <span
            aria-hidden
            className="size-2.5 rounded-full"
            style={{ background: "var(--accent)" }}
          />
          CompanyCompare
        </span>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-ink-2 hover:text-ink">
            Iniciar sesión
          </Link>
          <ButtonLink href="/registro">Crear cuenta</ButtonLink>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12 sm:py-20">
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          No solo te decimos que estás peor: te ayudamos a entender por qué y
          qué puedes hacer.
        </h1>
        <p className="mt-5 max-w-2xl text-base text-ink-2">
          Compara tu empresa con un competidor, descubre de dónde vienen las
          diferencias y sal con un plan de acción concreto. Cada conclusión dice
          en qué dato se apoya y con qué nivel de confianza.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/registro">Empezar con la demo</ButtonLink>
          <ButtonLink href="/login" variant="secondary">
            Ya tengo cuenta
          </ButtonLink>
        </div>

        <ol className="mt-16 grid gap-5 sm:grid-cols-2">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="rounded-xl border border-line bg-surface p-5"
            >
              <span className="tabular text-xs font-medium text-ink-muted">
                Paso {index + 1}
              </span>
              <h2 className="mt-1 text-base font-semibold text-ink">{step.title}</h2>
              <p className="mt-2 text-sm text-ink-2">{step.body}</p>
            </li>
          ))}
        </ol>

        <p className="mt-12 rounded-xl border border-dashed border-line-strong bg-surface-2 p-5 text-sm text-ink-2">
          El análisis se apoya en un motor de cálculo determinista y auditable.
          La interpretación en lenguaje natural puede enriquecerse con un modelo
          de IA, y cuando lo hace queda siempre marcada como inferencia, nunca
          como dato.
        </p>
      </main>

      <footer className="border-t border-line px-6 py-6 text-xs text-ink-muted">
        CompanyCompare · Análisis competitivo para empresarios
      </footer>
    </div>
  );
}
