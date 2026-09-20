"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { getStore, seedDemoFor } from "@/lib/db";
import { createSession, destroySession } from "./session";

export interface FormState {
  error?: string;
  message?: string;
  /** Solo en desarrollo: enlace de recuperación cuando no hay proveedor de email. */
  devResetLink?: string;
}

const emailSchema = z
  .string()
  .trim()
  .min(1, "El email es obligatorio.")
  .email("El email no tiene un formato válido.");

const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .max(200, "La contraseña es demasiado larga.");

const registerSchema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre.").max(80),
  email: emailSchema,
  password: passwordSchema,
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Escribe tu contraseña."),
});

function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Los datos introducidos no son válidos.";
}

export async function registerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const store = getStore();
  const existing = await store.findUserByEmail(parsed.data.email);
  if (existing) {
    return { error: "Ya existe una cuenta con ese email." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await store.createUser({
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash,
  });

  // La cuenta nueva llega con el análisis de demostración ya cargado para que
  // el producto no se vea vacío en el primer acceso.
  await seedDemoFor(user.id);
  await createSession(user.id);
  redirect("/dashboard");
}

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const user = await getStore().findUserByEmail(parsed.data.email);
  // Se compara siempre contra un hash para que el tiempo de respuesta no
  // revele si el email existe.
  const hash = user?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
  const valid = await bcrypt.compare(parsed.data.password, hash);

  if (!user || !valid) {
    return { error: "Email o contraseña incorrectos." };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

export async function requestPasswordResetAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const store = getStore();
  const user = await store.findUserByEmail(parsed.data);

  // Respuesta idéntica exista o no la cuenta: no se confirma qué emails están
  // registrados.
  const generic: FormState = {
    message:
      "Si hay una cuenta con ese email, recibirás un enlace para restablecer la contraseña.",
  };

  if (!user) return generic;

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60);
  await store.createPasswordReset(user.id, tokenHash, expiresAt);

  // Todavía no hay proveedor de email conectado. En desarrollo se devuelve el
  // enlace para poder probar el flujo; en producción no se expone nunca.
  if (process.env.NODE_ENV !== "production") {
    return { ...generic, devResetLink: `/reset-password?token=${token}` };
  }
  return generic;
}

const resetSchema = z.object({
  token: z.string().min(10, "El enlace no es válido."),
  password: passwordSchema,
});

export async function resetPasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const store = getStore();
  const userId = await store.consumePasswordReset(tokenHash);

  if (!userId) {
    return { error: "El enlace ha caducado o ya se ha utilizado. Pide uno nuevo." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await store.updateUserPassword(userId, passwordHash);
  await createSession(userId);
  redirect("/dashboard");
}
