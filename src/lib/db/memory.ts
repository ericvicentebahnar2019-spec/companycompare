import { randomUUID } from "node:crypto";

import { DEMO_ANALYSIS, DEMO_HISTORY } from "@/data/demo";
import type { Provenance } from "@/lib/metrics/types";
import type {
  AnalysisSummary,
  CompanyRecord,
  DataStore,
  NewAnalysisInput,
  NewCompanyInput,
  NewTaskInput,
  SnapshotRecord,
  StoredAnalysis,
  TaskPatch,
  TaskRecord,
  UserRecord,
} from "./types";

interface Tables {
  users: UserRecord[];
  companies: CompanyRecord[];
  companyValues: Map<string, StoredAnalysis["own"]["values"]>;
  analyses: {
    id: string;
    userId: string;
    title: string;
    notes: string | null;
    createdAt: string;
    isDemo: boolean;
    ownCompanyId: string;
    rivalCompanyId: string;
  }[];
  tasks: TaskRecord[];
  snapshots: SnapshotRecord[];
  resets: { tokenHash: string; userId: string; expiresAt: number; used: boolean }[];
  attempts: { bucket: string; key: string; at: number }[];
}

/**
 * Almacén en memoria.
 *
 * Es el que se usa cuando no hay `DATABASE_URL`, para poder arrancar el
 * producto y recorrerlo sin infraestructura. Los datos viven en el proceso:
 * se pierden al reiniciar y no se comparten entre instancias, así que no sirve
 * para producción, pero implementa el mismo contrato que el adaptador de
 * Prisma y ejercita exactamente los mismos caminos de código.
 *
 * Se guarda en `globalThis` para que el recargado en caliente del servidor de
 * desarrollo no borre la sesión de trabajo en cada cambio de fichero.
 */
function createTables(): Tables {
  return {
    users: [],
    companies: [],
    companyValues: new Map(),
    analyses: [],
    tasks: [],
    snapshots: [],
    resets: [],
    attempts: [],
  };
}

const globalRef = globalThis as unknown as { __ccTables?: Tables };
const tables: Tables = globalRef.__ccTables ?? createTables();
globalRef.__ccTables = tables;

export class MemoryStore implements DataStore {
  readonly kind = "memory" as const;

  async createUser(input: {
    email: string;
    name: string;
    passwordHash: string;
  }): Promise<UserRecord> {
    const user: UserRecord = {
      id: randomUUID(),
      email: input.email.toLowerCase(),
      name: input.name,
      passwordHash: input.passwordHash,
      plan: "FREE",
      createdAt: new Date().toISOString(),
    };
    tables.users.push(user);
    return user;
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    return tables.users.find((u) => u.email === email.toLowerCase()) ?? null;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    return tables.users.find((u) => u.id === id) ?? null;
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    const user = tables.users.find((u) => u.id === userId);
    if (user) user.passwordHash = passwordHash;
  }

  async createPasswordReset(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    tables.resets.push({
      tokenHash,
      userId,
      expiresAt: expiresAt.getTime(),
      used: false,
    });
  }

  async consumePasswordReset(tokenHash: string): Promise<string | null> {
    const reset = tables.resets.find((r) => r.tokenHash === tokenHash);
    if (!reset || reset.used || reset.expiresAt < Date.now()) return null;
    reset.used = true;
    return reset.userId;
  }

  async recordAttempt(bucket: string, key: string, windowMs: number): Promise<number> {
    const now = Date.now();
    const since = now - windowMs;

    // Se purga al contar: así la tabla no crece sin límite y no hace falta
    // ninguna tarea periódica.
    tables.attempts = tables.attempts.filter((a) => a.at >= since);
    tables.attempts.push({ bucket, key, at: now });

    return tables.attempts.filter((a) => a.bucket === bucket && a.key === key).length;
  }

  async listAnalyses(userId: string): Promise<AnalysisSummary[]> {
    return tables.analyses
      .filter((a) => a.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((a) => ({
        id: a.id,
        title: a.title,
        createdAt: a.createdAt,
        isDemo: a.isDemo,
        ownName: this.companyName(a.ownCompanyId),
        rivalName: this.companyName(a.rivalCompanyId),
      }));
  }

  private companyName(companyId: string): string {
    return tables.companies.find((c) => c.id === companyId)?.name ?? "—";
  }

  async getAnalysis(userId: string, analysisId: string): Promise<StoredAnalysis | null> {
    const analysis = tables.analyses.find(
      (a) => a.id === analysisId && a.userId === userId,
    );
    if (!analysis) return null;

    const own = tables.companies.find((c) => c.id === analysis.ownCompanyId);
    const rival = tables.companies.find((c) => c.id === analysis.rivalCompanyId);
    if (!own || !rival) return null;

    return {
      id: analysis.id,
      userId: analysis.userId,
      title: analysis.title,
      notes: analysis.notes,
      createdAt: analysis.createdAt,
      isDemo: analysis.isDemo,
      own: { ...own, values: tables.companyValues.get(own.id) ?? {} },
      rival: { ...rival, values: tables.companyValues.get(rival.id) ?? {} },
    };
  }

  async createAnalysis(
    userId: string,
    input: NewAnalysisInput,
    isDemo = false,
  ): Promise<string> {
    const own = this.insertCompany(userId, input.own, isDemo);
    const rival = this.insertCompany(userId, input.rival, isDemo);

    const id = randomUUID();
    tables.analyses.push({
      id,
      userId,
      title: input.title,
      notes: input.notes ?? null,
      createdAt: new Date().toISOString(),
      isDemo,
      ownCompanyId: own.id,
      rivalCompanyId: rival.id,
    });
    return id;
  }

  private insertCompany(
    userId: string,
    input: NewCompanyInput,
    isDemo: boolean,
  ): CompanyRecord {
    const company: CompanyRecord = {
      id: randomUUID(),
      userId,
      name: input.name,
      role: input.role,
      sector: input.sector ?? null,
      country: input.country ?? null,
      sizeLabel: input.sizeLabel ?? null,
      employees: input.employees ?? null,
      foundedAt: input.foundedAt ?? null,
      website: input.website ?? null,
      isDemo,
    };
    tables.companies.push(company);
    tables.companyValues.set(company.id, input.values);
    return company;
  }

  async deleteAnalysis(userId: string, analysisId: string): Promise<void> {
    const index = tables.analyses.findIndex(
      (a) => a.id === analysisId && a.userId === userId,
    );
    if (index === -1) return;

    const [analysis] = tables.analyses.splice(index, 1);
    for (const companyId of [analysis.ownCompanyId, analysis.rivalCompanyId]) {
      const companyIndex = tables.companies.findIndex((c) => c.id === companyId);
      if (companyIndex !== -1) tables.companies.splice(companyIndex, 1);
      tables.companyValues.delete(companyId);
    }
    tables.tasks = tables.tasks.filter((t) => t.analysisId !== analysisId);
  }

  async listCompanies(userId: string): Promise<CompanyRecord[]> {
    return tables.companies.filter((c) => c.userId === userId);
  }

  async setMetricValue(
    userId: string,
    analysisId: string,
    role: "own" | "rival",
    input: { metricId: string; value: number | string | null; provenance: Provenance },
  ): Promise<boolean> {
    const analysis = tables.analyses.find(
      (a) => a.id === analysisId && a.userId === userId,
    );
    if (!analysis) return false;

    const companyId = role === "own" ? analysis.ownCompanyId : analysis.rivalCompanyId;
    const values = { ...(tables.companyValues.get(companyId) ?? {}) };
    values[input.metricId] = {
      metricId: input.metricId,
      value: input.value,
      provenance: input.value === null ? "unknown" : input.provenance,
      note: null,
    };
    tables.companyValues.set(companyId, values);
    return true;
  }

  async listTasks(userId: string, analysisId: string): Promise<TaskRecord[]> {
    if (!(await this.ownsAnalysis(userId, analysisId))) return [];
    return tables.tasks
      .filter((t) => t.analysisId === analysisId)
      .sort((a, b) => a.week - b.week || a.createdAt.localeCompare(b.createdAt));
  }

  async createTask(
    userId: string,
    analysisId: string,
    input: NewTaskInput,
  ): Promise<TaskRecord> {
    if (!(await this.ownsAnalysis(userId, analysisId))) {
      throw new Error("Análisis no encontrado");
    }
    const task: TaskRecord = {
      id: randomUUID(),
      analysisId,
      recommendationId: input.recommendationId ?? null,
      title: input.title,
      notes: input.notes ?? null,
      week: input.week,
      status: "PENDING",
      priority: input.priority ?? "MEDIUM",
      dueDate: input.dueDate ?? null,
      assignee: input.assignee ?? null,
      createdAt: new Date().toISOString(),
    };
    tables.tasks.push(task);
    return task;
  }

  async updateTask(
    userId: string,
    taskId: string,
    patch: TaskPatch,
  ): Promise<TaskRecord | null> {
    const task = tables.tasks.find((t) => t.id === taskId);
    if (!task || !(await this.ownsAnalysis(userId, task.analysisId))) return null;
    Object.assign(task, patch);
    return task;
  }

  async deleteTask(userId: string, taskId: string): Promise<void> {
    const index = tables.tasks.findIndex((t) => t.id === taskId);
    if (index === -1) return;
    if (!(await this.ownsAnalysis(userId, tables.tasks[index].analysisId))) return;
    tables.tasks.splice(index, 1);
  }

  async listSnapshots(userId: string, companyId: string): Promise<SnapshotRecord[]> {
    const company = tables.companies.find(
      (c) => c.id === companyId && c.userId === userId,
    );
    if (!company) return [];
    return tables.snapshots
      .filter((s) => s.companyId === companyId)
      .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  }

  async addSnapshot(
    userId: string,
    companyId: string,
    input: { metricId: string; value: number; recordedAt?: string; note?: string | null },
  ): Promise<SnapshotRecord> {
    const company = tables.companies.find(
      (c) => c.id === companyId && c.userId === userId,
    );
    if (!company) throw new Error("Empresa no encontrada");

    const snapshot: SnapshotRecord = {
      id: randomUUID(),
      companyId,
      metricId: input.metricId,
      value: input.value,
      recordedAt: input.recordedAt ?? new Date().toISOString(),
      note: input.note ?? null,
    };
    tables.snapshots.push(snapshot);
    return snapshot;
  }

  private async ownsAnalysis(userId: string, analysisId: string): Promise<boolean> {
    return tables.analyses.some((a) => a.id === analysisId && a.userId === userId);
  }

  /** Crea el análisis de demostración y su histórico para un usuario nuevo. */
  async seedDemo(userId: string): Promise<string> {
    const analysisId = await this.createAnalysis(userId, DEMO_ANALYSIS, true);
    const analysis = await this.getAnalysis(userId, analysisId);
    if (!analysis) return analysisId;

    for (const series of DEMO_HISTORY) {
      for (const [recordedAt, value] of series.points) {
        await this.addSnapshot(userId, analysis.own.id, {
          metricId: series.metricId,
          value,
          recordedAt,
        });
      }
    }
    return analysisId;
  }
}
