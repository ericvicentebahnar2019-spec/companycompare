import "server-only";

import { MemoryStore } from "./memory";
import type { DataStore } from "./types";

export type * from "./types";

const globalRef = globalThis as unknown as { __ccStore?: DataStore };

/**
 * Almacén activo.
 *
 * Con `DATABASE_URL` configurada se usa PostgreSQL vía Prisma; sin ella, el
 * almacén en memoria, que permite arrancar y recorrer el producto sin
 * infraestructura. El adaptador de Prisma se carga de forma perezosa para que
 * la ausencia de base de datos no rompa el arranque.
 */
export function getStore(): DataStore {
  if (globalRef.__ccStore) return globalRef.__ccStore;

  let store: DataStore;
  if (process.env.DATABASE_URL) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaStore } = require("./prisma-store") as typeof import("./prisma-store");
    store = new PrismaStore();
  } else {
    store = new MemoryStore();
  }

  globalRef.__ccStore = store;
  return store;
}

/** `true` cuando la aplicación corre sin base de datos persistente. */
export function isEphemeralStore(): boolean {
  return getStore().kind === "memory";
}

/** Siembra el análisis de demostración para un usuario recién creado. */
export async function seedDemoFor(userId: string): Promise<string | null> {
  const store = getStore();
  const seeder = store as DataStore & { seedDemo?: (id: string) => Promise<string> };
  if (typeof seeder.seedDemo !== "function") return null;
  return seeder.seedDemo(userId);
}
