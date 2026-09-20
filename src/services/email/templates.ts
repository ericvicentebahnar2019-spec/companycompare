import type { EmailMessage } from "./index";

/**
 * Correo de recuperación de contraseña.
 *
 * Deliberadamente escueto: un enlace, cuánto dura y qué hacer si no lo has
 * pedido tú. Cuanto menos parezca una promoción, menos probable es que acabe
 * en la carpeta de correo no deseado, que en este flujo equivale a perderlo.
 */
export function passwordResetEmail(to: string, link: string): EmailMessage {
  const text = [
    "Has pedido restablecer la contraseña de tu cuenta de CompanyCompare.",
    "",
    `Abre este enlace para elegir una nueva: ${link}`,
    "",
    "El enlace caduca dentro de una hora y solo se puede usar una vez.",
    "Si no has sido tú, ignora este mensaje: tu contraseña no cambia.",
  ].join("\n");

  const html = `<!doctype html>
<html lang="es"><body style="margin:0;padding:24px;background:#f9f9f7;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#0b0b0b">
  <div style="max-width:480px;margin:0 auto;background:#fcfcfb;border:1px solid #e1e0d9;border-radius:12px;padding:28px">
    <p style="margin:0 0 16px;font-size:15px;line-height:1.5">
      Has pedido restablecer la contraseña de tu cuenta de CompanyCompare.
    </p>
    <p style="margin:0 0 24px">
      <a href="${link}" style="display:inline-block;background:#2a78d6;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:500">
        Elegir una contraseña nueva
      </a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;color:#52514e;line-height:1.5">
      El enlace caduca dentro de una hora y solo se puede usar una vez.
    </p>
    <p style="margin:0;font-size:13px;color:#52514e;line-height:1.5">
      Si no has sido tú, ignora este mensaje: tu contraseña no cambia.
    </p>
  </div>
</body></html>`;

  return {
    to,
    subject: "Restablecer tu contraseña de CompanyCompare",
    text,
    html,
  };
}
