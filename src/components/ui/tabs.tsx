"use client";

import { useId, useState, type ReactNode } from "react";
import { cx } from "./index";

export interface TabItem {
  id: string;
  label: string;
  badge?: ReactNode;
  content: ReactNode;
}

/** Pestañas accesibles con teclado (flechas, Inicio y Fin). */
export function Tabs({ items, initial }: { items: TabItem[]; initial?: string }) {
  const baseId = useId();
  const [active, setActive] = useState(initial ?? items[0]?.id);

  if (items.length === 0) return null;

  function move(delta: number) {
    const index = items.findIndex((item) => item.id === active);
    const next = (index + delta + items.length) % items.length;
    setActive(items[next].id);
    document.getElementById(`${baseId}-tab-${items[next].id}`)?.focus();
  }

  return (
    <div>
      <div
        role="tablist"
        className="-mx-1 flex gap-1 overflow-x-auto border-b border-line px-1"
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            move(1);
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            move(-1);
          } else if (event.key === "Home") {
            event.preventDefault();
            setActive(items[0].id);
          } else if (event.key === "End") {
            event.preventDefault();
            setActive(items[items.length - 1].id);
          }
        }}
      >
        {items.map((item) => {
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              id={`${baseId}-tab-${item.id}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(item.id)}
              className={cx(
                "flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                selected
                  ? "border-accent text-ink"
                  : "border-transparent text-ink-2 hover:text-ink",
              )}
            >
              {item.label}
              {item.badge}
            </button>
          );
        })}
      </div>

      {items.map((item) => (
        <div
          key={item.id}
          id={`${baseId}-panel-${item.id}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${item.id}`}
          hidden={item.id !== active}
          className="pt-5"
        >
          {item.id === active ? item.content : null}
        </div>
      ))}
    </div>
  );
}
