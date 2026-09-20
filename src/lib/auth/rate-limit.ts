import "server-only";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";

import { getStore } from "@/lib/db";

/**
 * Límites por acción.
 *
 * Los de IP frenan a quien automatiza; los de cuenta protegen a un usuario
 * concreto aunque el atacante cambie de IP. Se aplican los dos.
 */
export const LIMITS = {
  login: { perIp: 20, perAccount: 8, windowMs: 10 * 60 * 1000 },
  register: { perIp: 5, windowMs: 60 * 60 * 1000 },
  passwordReset: { perIp: 5, perAccount: 3, windowMs: 60 * 60 * 1000 },
} as const;

/**
 * Convierte una IP o un email en una clave opaca.
 *
 * Para contar intentos basta con poder distinguirlos, no con saber de quién
 * son, así que nunca se guarda el valor en claro. El HMAC usa el secreto de la
 * aplicación, de modo que la tabla por sí sola no permite recuperar la IP.
 */
function hashKey(value: string): string {
  const secret = process.env.AUTH_SECRET ?? "desarrollo";
  return createHmac("sha256", secret).update(value.toLowerCase()).digest("base64url");
}

/**
 * IP del cliente según las cabeceras del proxy.
 *
 * En Vercel llega en `x-forwarded-for`, donde el primer valor es el cliente
 * real. Si no hay cabecera se usa una clave común: es un cubo compartido que
 * degrada el límite, pero nunca lo desactiva.
 */
async function clientIp(): Promise<string> {
  const store = await headers();
  const forwarded = store.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || store.get("x-real-ip") || "desconocida";
}

export interface LimitVerdict {
  allowed: boolean;
  /** Mensaje listo para enseñar cuando se ha superado el límite. */
  message?: string;
}

/**
 * Registra el intento y dice si se puede seguir.
 *
 * Cuenta siempre, también cuando ya se ha pasado del límite: así un ataque que
 * insiste mantiene la puerta cerrada en lugar de reabrirla al expirar el
 * primer intento.
 */
export async function checkLimit(
  bucket: string,
  identifier: string,
  limit: number,
  windowMs: number,
  message: string,
): Promise<LimitVerdict> {
  const count = await getStore().recordAttempt(bucket, hashKey(identifier), windowMs);
  if (count > limit) return { allowed: false, message };
  return { allowed: true };
}

/** Límite por IP para la acción indicada. */
export async function limitByIp(
  bucket: string,
  limit: number,
  windowMs: number,
  message: string,
): Promise<LimitVerdict> {
  return checkLimit(`${bucket}:ip`, await clientIp(), limit, windowMs, message);
}

/** Límite por cuenta, para que cambiar de IP no lo esquive. */
export async function limitByAccount(
  bucket: string,
  email: string,
  limit: number,
  windowMs: number,
  message: string,
): Promise<LimitVerdict> {
  return checkLimit(`${bucket}:cuenta`, email, limit, windowMs, message);
}
