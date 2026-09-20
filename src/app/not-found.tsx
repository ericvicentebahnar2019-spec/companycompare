import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-medium text-ink-muted">Error 404</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">
          Esta página no existe
        </h1>
        <p className="mt-3 text-sm text-ink-2">
          Puede que el análisis se haya eliminado o que el enlace sea de otra
          cuenta.
        </p>
        <div className="mt-6 flex justify-center">
          <ButtonLink href="/dashboard">Volver al resumen</ButtonLink>
        </div>
      </div>
    </div>
  );
}
