"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark" | "system";

const LABEL: Record<Theme, string> = {
  light: "Claro",
  dark: "Oscuro",
  system: "Sistema",
};

const EVENT = "cc-theme-change";

/**
 * El tema vive en el atributo `data-theme` del documento, que ya coloca el
 * script del layout antes de pintar. Leerlo desde ahí con
 * `useSyncExternalStore` evita duplicar el estado en React y el parpadeo de
 * tener que esperar a un efecto para enterarse del valor real.
 */
function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

function getSnapshot(): Theme {
  const value = document.documentElement.getAttribute("data-theme");
  return value === "dark" || value === "light" ? value : "system";
}

/** En el servidor no hay documento: se asume la preferencia del sistema. */
function getServerSnapshot(): Theme {
  return "system";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function apply(next: Theme) {
    if (next === "system") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", next);
    }

    try {
      if (next === "system") localStorage.removeItem("cc-theme");
      else localStorage.setItem("cc-theme", next);
    } catch {
      // Sin almacenamiento el tema se aplica igual, solo que no se recuerda.
    }

    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <label className="flex items-center gap-2 text-xs text-ink-2">
      <span className="sr-only">Tema de la interfaz</span>
      <select
        value={theme}
        onChange={(event) => apply(event.target.value as Theme)}
        className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink"
      >
        {(Object.keys(LABEL) as Theme[]).map((option) => (
          <option key={option} value={option}>
            {LABEL[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
