"use client";

import { Button } from "@/components/ui";

/**
 * Exportación del informe.
 *
 * De momento se apoya en la impresión del navegador, que ya permite guardar
 * como PDF sin añadir dependencias. Cuando haga falta un PDF con maquetación
 * propia, el punto de sustitución es este componente: el contenido del informe
 * ya está estructurado por apartados.
 */
export function PrintButton() {
  return (
    <Button type="button" onClick={() => window.print()}>
      Imprimir o guardar en PDF
    </Button>
  );
}
