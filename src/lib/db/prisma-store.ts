import "server-only";

import { PrismaClient, type Prisma } from "@prisma/client";

import { DEMO_ANALYSIS, DEMO_HISTORY } from "@/data/demo";
import type { MetricValueMap, Provenance } from "@/lib/metrics/types";
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

const globalRef = globalThis as unknown as { __ccPrisma?: PrismaClient };
const prisma = globalRef.__ccPrisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalRef.__ccPrisma = prisma;

type DbProvenance = "USER" | "PUBLIC" | "ESTIMATE" | "INFERENCE" | "DERIVED" | "UNKNOWN";

const TO_DB: Record<Provenance, DbProvenance> = {
  user: "USER",
  public: "PUBLIC",
  estimate: "ESTIMATE",
  inference: "INFERENCE",
  derived: "DERIVED",
  unknown: "UNKNOWN",
};

const FROM_DB: Record<DbProvenance, Provenance> = {
  USER: "user",
  PUBLIC: "public",
  ESTIMATE: "estimate",
  INFERENCE: "inference",
  DERIVED: "derived",
  UNKNOWN: "unknown",
};

/**
 * Adaptador de PostgreSQL vía Prisma.
 *
 * Es el almacén de producción. Cada consulta lleva `userId` en el `where`, de
 * modo que un identificador de otra cuenta devuelve vacío en lugar de datos
 * ajenos.
 */
export class PrismaStore implements DataStore {
  readonly kind = "prisma" as const;

  async createUser(input: {
    email: string;
    name: string;
    passwordHash: string;
  }): Promise<UserRecord> {
    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name,
        passwordHash: input.passwordHash,
      },
    });
    return toUser(user);
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    return user ? toUser(user) : null;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? toUser(user) : null;
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  async createPasswordReset(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await prisma.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } });
  }

  async consumePasswordReset(tokenHash: string): Promise<string | null> {
    const token = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!token || token.usedAt || token.expiresAt.getTime() < Date.now()) return null;

    await prisma.passwordResetToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    });
    return token.userId;
  }

  async listAnalyses(userId: string): Promise<AnalysisSummary[]> {
    const rows = await prisma.analysis.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        ownCompany: { select: { name: true } },
        rivalCompany: { select: { name: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      createdAt: row.createdAt.toISOString(),
      isDemo: row.isDemo,
      ownName: row.ownCompany.name,
      rivalName: row.rivalCompany.name,
    }));
  }

  async getAnalysis(userId: string, analysisId: string): Promise<StoredAnalysis | null> {
    const row = await prisma.analysis.findFirst({
      where: { id: analysisId, userId },
      include: { ownCompany: true, rivalCompany: true, metricValues: true },
    });
    if (!row) return null;

    const valuesByCompany = new Map<string, MetricValueMap>();
    for (const value of row.metricValues) {
      const map = valuesByCompany.get(value.companyId) ?? {};
      map[value.metricId] = {
        metricId: value.metricId,
        value: value.textValue ?? value.value ?? null,
        provenance: FROM_DB[value.provenance as DbProvenance],
        note: value.note,
      };
      valuesByCompany.set(value.companyId, map);
    }

    return {
      id: row.id,
      userId: row.userId,
      title: row.title,
      notes: row.notes,
      createdAt: row.createdAt.toISOString(),
      isDemo: row.isDemo,
      own: {
        ...toCompany(row.ownCompany),
        values: valuesByCompany.get(row.ownCompanyId) ?? {},
      },
      rival: {
        ...toCompany(row.rivalCompany),
        values: valuesByCompany.get(row.rivalCompanyId) ?? {},
      },
    };
  }

  async createAnalysis(
    userId: string,
    input: NewAnalysisInput,
    isDemo = false,
  ): Promise<string> {
    return prisma.$transaction(async (tx) => {
      const own = await tx.company.create({
        data: companyData(userId, input.own, isDemo),
      });
      const rival = await tx.company.create({
        data: companyData(userId, input.rival, isDemo),
      });

      const analysis = await tx.analysis.create({
        data: {
          userId,
          title: input.title,
          notes: input.notes ?? null,
          isDemo,
          ownCompanyId: own.id,
          rivalCompanyId: rival.id,
        },
      });

      await tx.metricValue.createMany({
        data: [
          ...metricRows(analysis.id, own.id, input.own.values),
          ...metricRows(analysis.id, rival.id, input.rival.values),
        ],
      });

      return analysis.id;
    });
  }

  async deleteAnalysis(userId: string, analysisId: string): Promise<void> {
    const analysis = await prisma.analysis.findFirst({
      where: { id: analysisId, userId },
      select: { ownCompanyId: true, rivalCompanyId: true },
    });
    if (!analysis) return;

    await prisma.$transaction([
      prisma.analysis.delete({ where: { id: analysisId } }),
      prisma.company.deleteMany({
        where: { id: { in: [analysis.ownCompanyId, analysis.rivalCompanyId] }, userId },
      }),
    ]);
  }

  async listCompanies(userId: string): Promise<CompanyRecord[]> {
    const rows = await prisma.company.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toCompany);
  }

  async setMetricValue(
    userId: string,
    analysisId: string,
    role: "own" | "rival",
    input: { metricId: string; value: number | string | null; provenance: Provenance },
  ): Promise<boolean> {
    const analysis = await prisma.analysis.findFirst({
      where: { id: analysisId, userId },
      select: { ownCompanyId: true, rivalCompanyId: true },
    });
    if (!analysis) return false;

    const companyId = role === "own" ? analysis.ownCompanyId : analysis.rivalCompanyId;

    const data = {
      value: typeof input.value === "number" ? input.value : null,
      textValue: typeof input.value === "string" ? input.value : null,
      provenance: TO_DB[input.value === null ? "unknown" : input.provenance],
      note: null,
    };

    await prisma.metricValue.upsert({
      where: {
        analysisId_companyId_metricId: { analysisId, companyId, metricId: input.metricId },
      },
      create: { analysisId, companyId, metricId: input.metricId, ...data },
      update: data,
    });

    return true;
  }

  async listTasks(userId: string, analysisId: string): Promise<TaskRecord[]> {
    const rows = await prisma.actionTask.findMany({
      where: { analysisId, analysis: { userId } },
      orderBy: [{ week: "asc" }, { createdAt: "asc" }],
    });
    return rows.map(toTask);
  }

  async createTask(
    userId: string,
    analysisId: string,
    input: NewTaskInput,
  ): Promise<TaskRecord> {
    const owned = await prisma.analysis.findFirst({
      where: { id: analysisId, userId },
      select: { id: true },
    });
    if (!owned) throw new Error("Análisis no encontrado");

    const row = await prisma.actionTask.create({
      data: {
        analysisId,
        recommendationId: input.recommendationId ?? null,
        title: input.title,
        notes: input.notes ?? null,
        week: input.week,
        priority: input.priority ?? "MEDIUM",
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        assignee: input.assignee ?? null,
      },
    });
    return toTask(row);
  }

  async updateTask(
    userId: string,
    taskId: string,
    patch: TaskPatch,
  ): Promise<TaskRecord | null> {
    const owned = await prisma.actionTask.findFirst({
      where: { id: taskId, analysis: { userId } },
      select: { id: true },
    });
    if (!owned) return null;

    const row = await prisma.actionTask.update({
      where: { id: taskId },
      data: {
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
        ...(patch.week !== undefined ? { week: patch.week } : {}),
        ...(patch.status !== undefined
          ? {
              status: patch.status,
              completedAt: patch.status === "DONE" ? new Date() : null,
            }
          : {}),
        ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
        ...(patch.assignee !== undefined ? { assignee: patch.assignee } : {}),
        ...(patch.dueDate !== undefined
          ? { dueDate: patch.dueDate ? new Date(patch.dueDate) : null }
          : {}),
      },
    });
    return toTask(row);
  }

  async deleteTask(userId: string, taskId: string): Promise<void> {
    await prisma.actionTask.deleteMany({ where: { id: taskId, analysis: { userId } } });
  }

  async listSnapshots(userId: string, companyId: string): Promise<SnapshotRecord[]> {
    const rows = await prisma.metricSnapshot.findMany({
      where: { companyId, company: { userId } },
      orderBy: { recordedAt: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      companyId: row.companyId,
      metricId: row.metricId,
      value: row.value,
      recordedAt: row.recordedAt.toISOString(),
      note: row.note,
    }));
  }

  async addSnapshot(
    userId: string,
    companyId: string,
    input: { metricId: string; value: number; recordedAt?: string; note?: string | null },
  ): Promise<SnapshotRecord> {
    const owned = await prisma.company.findFirst({
      where: { id: companyId, userId },
      select: { id: true },
    });
    if (!owned) throw new Error("Empresa no encontrada");

    const row = await prisma.metricSnapshot.create({
      data: {
        companyId,
        metricId: input.metricId,
        value: input.value,
        recordedAt: input.recordedAt ? new Date(input.recordedAt) : new Date(),
        note: input.note ?? null,
      },
    });
    return {
      id: row.id,
      companyId: row.companyId,
      metricId: row.metricId,
      value: row.value,
      recordedAt: row.recordedAt.toISOString(),
      note: row.note,
    };
  }

  async seedDemo(userId: string): Promise<string> {
    const analysisId = await this.createAnalysis(userId, DEMO_ANALYSIS, true);
    const analysis = await this.getAnalysis(userId, analysisId);
    if (!analysis) return analysisId;

    await prisma.metricSnapshot.createMany({
      data: DEMO_HISTORY.flatMap((series) =>
        series.points.map(([recordedAt, value]) => ({
          companyId: analysis.own.id,
          metricId: series.metricId,
          value,
          recordedAt: new Date(recordedAt),
        })),
      ),
    });
    return analysisId;
  }
}

function companyData(
  userId: string,
  input: NewCompanyInput,
  isDemo: boolean,
): Prisma.CompanyUncheckedCreateInput {
  return {
    userId,
    name: input.name,
    role: input.role === "own" ? "OWN" : "COMPETITOR",
    sector: input.sector ?? null,
    country: input.country ?? null,
    sizeLabel: input.sizeLabel ?? null,
    employees: input.employees ?? null,
    foundedAt: input.foundedAt ?? null,
    website: input.website ?? null,
    isDemo,
  };
}

function metricRows(
  analysisId: string,
  companyId: string,
  values: MetricValueMap,
): Prisma.MetricValueCreateManyInput[] {
  return Object.values(values).map((entry) => ({
    analysisId,
    companyId,
    metricId: entry.metricId,
    value: typeof entry.value === "number" ? entry.value : null,
    textValue: typeof entry.value === "string" ? entry.value : null,
    provenance: TO_DB[entry.provenance],
    note: entry.note ?? null,
  }));
}

function toUser(row: {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  plan: string;
  createdAt: Date;
}): UserRecord {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.passwordHash,
    plan: row.plan as UserRecord["plan"],
    createdAt: row.createdAt.toISOString(),
  };
}

function toCompany(row: {
  id: string;
  userId: string;
  name: string;
  role: string;
  sector: string | null;
  country: string | null;
  sizeLabel: string | null;
  employees: number | null;
  foundedAt: number | null;
  website: string | null;
  isDemo: boolean;
}): CompanyRecord {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    role: row.role === "OWN" ? "own" : "rival",
    sector: row.sector,
    country: row.country,
    sizeLabel: row.sizeLabel,
    employees: row.employees,
    foundedAt: row.foundedAt,
    website: row.website,
    isDemo: row.isDemo,
  };
}

function toTask(row: {
  id: string;
  analysisId: string;
  recommendationId: string | null;
  title: string;
  notes: string | null;
  week: number;
  status: string;
  priority: string;
  dueDate: Date | null;
  assignee: string | null;
  createdAt: Date;
}): TaskRecord {
  return {
    id: row.id,
    analysisId: row.analysisId,
    recommendationId: row.recommendationId,
    title: row.title,
    notes: row.notes,
    week: row.week,
    status: row.status as TaskRecord["status"],
    priority: row.priority as TaskRecord["priority"],
    dueDate: row.dueDate ? row.dueDate.toISOString() : null,
    assignee: row.assignee,
    createdAt: row.createdAt.toISOString(),
  };
}
