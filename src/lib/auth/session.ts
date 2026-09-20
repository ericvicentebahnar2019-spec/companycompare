import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { getStore } from "@/lib/db";
import type { UserRecord } from "@/lib/db/types";

const COOKIE_NAME = "cc_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/**
 * Secreto de firma.
 *
 * En producción es obligatorio: sin él la aplicación no arranca, en lugar de
 * arrancar con una clave conocida. En desarrollo se genera uno por proceso,
 * lo que invalida las sesiones al reiniciar pero no deja un secreto por
 * defecto en el repositorio.
 */
function secret(): string {
  const configured = process.env.AUTH_SECRET;
  if (configured && configured.length >= 16) return configured;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET es obligatorio en producción y debe tener al menos 16 caracteres.",
    );
  }

  const ref = globalThis as unknown as { __ccDevSecret?: string };
  ref.__ccDevSecret ??= randomBytes(32).toString("hex");
  return ref.__ccDevSecret;
}

interface SessionPayload {
  uid: string;
  exp: number;
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

function encode(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decode(token: string): SessionPayload | null {
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;

  const body = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  const expected = Buffer.from(sign(body));
  const received = Buffer.from(signature);
  if (expected.length !== received.length) return null;
  if (!timingSafeEqual(expected, received)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (typeof payload.uid !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createSession(userId: string): Promise<void> {
  const token = encode({ uid: userId, exp: Date.now() + MAX_AGE_SECONDS * 1000 });
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

/** Usuario de la petición actual, o `null` si no hay sesión válida. */
export async function getCurrentUser(): Promise<UserRecord | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = decode(token);
  if (!payload) return null;

  return getStore().findUserById(payload.uid);
}

/** Como `getCurrentUser`, pero lanza si no hay sesión. Para rutas privadas. */
export async function requireUser(): Promise<UserRecord> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}
