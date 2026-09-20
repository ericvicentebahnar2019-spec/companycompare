import type { MetricValueMap, Provenance } from "@/lib/metrics/types";

export type Plan = "FREE" | "PRO" | "BUSINESS";
export type TaskStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "DISCARDED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  plan: Plan;
  createdAt: string;
}

export interface CompanyRecord {
  id: string;
  userId: string;
  name: string;
  role: "own" | "rival";
  sector: string | null;
  country: string | null;
  sizeLabel: string | null;
  employees: number | null;
  foundedAt: number | null;
  website: string | null;
  isDemo: boolean;
}

export interface StoredAnalysis {
  id: string;
  userId: string;
  title: string;
  notes: string | null;
  createdAt: string;
  isDemo: boolean;
  own: CompanyRecord & { values: MetricValueMap };
  rival: CompanyRecord & { values: MetricValueMap };
}

export interface AnalysisSummary {
  id: string;
  title: string;
  createdAt: string;
  isDemo: boolean;
  ownName: string;
  rivalName: string;
}

export interface TaskRecord {
  id: string;
  analysisId: string;
  recommendationId: string | null;
  title: string;
  notes: string | null;
  week: number;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assignee: string | null;
  createdAt: string;
}

export interface SnapshotRecord {
  id: string;
  companyId: string;
  metricId: string;
  value: number;
  recordedAt: string;
  note: string | null;
}

export interface NewCompanyInput {
  name: string;
  role: "own" | "rival";
  sector?: string | null;
  country?: string | null;
  sizeLabel?: string | null;
  employees?: number | null;
  foundedAt?: number | null;
  website?: string | null;
  values: MetricValueMap;
}

export interface NewAnalysisInput {
  title: string;
  notes?: string | null;
  own: NewCompanyInput;
  rival: NewCompanyInput;
}

export interface NewTaskInput {
  title: string;
  week: number;
  priority?: TaskPriority;
  recommendationId?: string | null;
  notes?: string | null;
  dueDate?: string | null;
  assignee?: string | null;
}

export type TaskPatch = Partial<
  Pick<TaskRecord, "title" | "notes" | "week" | "status" | "priority" | "dueDate" | "assignee">
>;

/**
 * Contrato de persistencia.
 *
 * Todos los métodos que tocan datos de usuario reciben `userId` y filtran por
 * él: el aislamiento entre cuentas es una propiedad de la interfaz, no algo
 * que cada pantalla tenga que recordar.
 */
export interface DataStore {
  readonly kind: "memory" | "prisma";

  createUser(input: { email: string; name: string; passwordHash: string }): Promise<UserRecord>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  updateUserPassword(userId: string, passwordHash: string): Promise<void>;

  createPasswordReset(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;

  /**
   * Registra un intento y devuelve cuántos van en la ventana.
   *
   * El contador vive en el almacén, no en el proceso: en serverless cada
   * instancia tendría el suyo y el límite no serviría de nada.
   */
  recordAttempt(bucket: string, key: string, windowMs: number): Promise<number>;
  consumePasswordReset(tokenHash: string): Promise<string | null>;

  listAnalyses(userId: string): Promise<AnalysisSummary[]>;
  getAnalysis(userId: string, analysisId: string): Promise<StoredAnalysis | null>;
  createAnalysis(userId: string, input: NewAnalysisInput, isDemo?: boolean): Promise<string>;
  deleteAnalysis(userId: string, analysisId: string): Promise<void>;
  listCompanies(userId: string): Promise<CompanyRecord[]>;

  /**
   * Añade o corrige el valor de una métrica dentro de un análisis.
   *
   * Permite completar un dato que faltaba sin rehacer el análisis entero, que
   * es lo que hace viable pedirlos de uno en uno y solo cuando compensan.
   * Devuelve `false` si el análisis no es de este usuario.
   */
  setMetricValue(
    userId: string,
    analysisId: string,
    role: "own" | "rival",
    input: { metricId: string; value: number | string | null; provenance: Provenance },
  ): Promise<boolean>;

  listTasks(userId: string, analysisId: string): Promise<TaskRecord[]>;
  createTask(userId: string, analysisId: string, input: NewTaskInput): Promise<TaskRecord>;
  updateTask(userId: string, taskId: string, patch: TaskPatch): Promise<TaskRecord | null>;
  deleteTask(userId: string, taskId: string): Promise<void>;

  listSnapshots(userId: string, companyId: string): Promise<SnapshotRecord[]>;
  addSnapshot(
    userId: string,
    companyId: string,
    input: { metricId: string; value: number; recordedAt?: string; note?: string | null },
  ): Promise<SnapshotRecord>;
}
