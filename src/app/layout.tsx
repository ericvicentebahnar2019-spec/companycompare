import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CompanyCompare",
    template: "%s · CompanyCompare",
  },
  description:
    "Compara tu empresa con la competencia, entiende de dónde vienen las diferencias y decide qué hacer con ellas.",
};

/**
 * El script de tema se ejecuta antes de pintar para que no haya un destello
 * claro al cargar en modo oscuro. Solo lee de `localStorage` y escribe un
 * atributo; si falla, el tema del sistema sigue funcionando.
 */
const THEME_SCRIPT = `try{var t=localStorage.getItem("cc-theme");if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-page text-ink antialiased">{children}</body>
    </html>
  );
}
