import "server-only";

export interface EmailMessage {
  to: string;
  subject: string;
  /** Texto plano. Se envía siempre, aunque haya versión HTML. */
  text: string;
  html?: string;
}

export interface EmailResult {
  /** `false` cuando no hay proveedor configurado o el envío ha fallado. */
  sent: boolean;
  provider: "resend" | "none";
  error?: string;
}

/**
 * Envío de correo.
 *
 * Sin `RESEND_API_KEY` no hay proveedor: la aplicación no finge que el correo
 * ha salido. Eso importa en la recuperación de contraseña, donde un envío
 * silenciosamente perdido deja al usuario fuera de su cuenta sin saber por qué.
 *
 * Se habla con Resend por HTTP en lugar de con su SDK: es una única petición y
 * así no se añade una dependencia más al proyecto.
 */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return {
      sent: false,
      provider: "none",
      error: "No hay proveedor de email configurado (falta RESEND_API_KEY o EMAIL_FROM).",
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return {
        sent: false,
        provider: "resend",
        error: `Resend respondió ${response.status}: ${detail.slice(0, 200)}`,
      };
    }

    return { sent: true, provider: "resend" };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "error desconocido";
    return { sent: false, provider: "resend", error: detail };
  }
}

/** `true` si hay un proveedor configurado, sin intentar ningún envío. */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/**
 * URL pública de la aplicación, para construir enlaces que se envían fuera.
 *
 * En Vercel se deduce sola; en otro alojamiento se indica con APP_URL.
 */
export function appUrl(): string {
  const explicit = process.env.APP_URL?.replace(/\/$/, "");
  if (explicit) return explicit;

  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}
