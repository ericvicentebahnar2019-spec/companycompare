"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Diálogo modal sobre el elemento nativo `<dialog>`: se queda con el foco,
 * cierra con Escape y no necesita gestionar el apilado a mano.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        // Cierra al pulsar fuera del panel, no dentro de él.
        if (event.target === ref.current) onClose();
      }}
      aria-labelledby="modal-title"
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-0 text-ink backdrop:bg-black/40"
    >
      <div className="p-5 sm:p-6">
        <h2 id="modal-title" className="text-base font-semibold text-ink">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-ink-2">{description}</p>
        ) : null}
        <div className="mt-4">{children}</div>
        {footer ? (
          <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>
        ) : null}
      </div>
    </dialog>
  );
}
