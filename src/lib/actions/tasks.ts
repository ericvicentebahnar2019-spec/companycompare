"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { getStore } from "@/lib/db";
import type { TaskPatch } from "@/lib/db/types";

export interface TaskActionState {
  error?: string;
  message?: string;
}

const addFromRecommendationSchema = z.object({
  analysisId: z.string().min(1),
  recommendationId: z.string().min(1),
  title: z.string().min(1).max(200),
  steps: z.array(z.string().min(1).max(300)).min(1).max(12),
});

/**
 * Convierte una recomendación en tareas del plan.
 *
 * Los pasos se reparten en semanas de dos en dos: es un punto de partida
 * editable, no una planificación impuesta.
 */
export async function addRecommendationToPlan(
  _prev: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const user = await requireUser();

  const parsed = addFromRecommendationSchema.safeParse({
    analysisId: formData.get("analysisId"),
    recommendationId: formData.get("recommendationId"),
    title: formData.get("title"),
    steps: formData.getAll("step").map(String),
  });
  if (!parsed.success) {
    return { error: "No se ha podido añadir la acción al plan." };
  }

  const store = getStore();
  const { analysisId, recommendationId, steps } = parsed.data;

  try {
    for (const [index, step] of steps.entries()) {
      await store.createTask(user.id, analysisId, {
        title: step,
        week: Math.floor(index / 2) + 1,
        recommendationId,
        notes: `Parte de: ${parsed.data.title}`,
      });
    }
  } catch {
    return { error: "No se ha podido guardar el plan. Inténtalo de nuevo." };
  }

  revalidatePath(`/analisis/${analysisId}/plan`);
  revalidatePath(`/analisis/${analysisId}`);
  return { message: `Se han añadido ${steps.length} tareas al plan.` };
}

const newTaskSchema = z.object({
  analysisId: z.string().min(1),
  title: z.string().trim().min(1, "Escribe qué hay que hacer.").max(200),
  week: z.coerce.number().int().min(1).max(52),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  assignee: z.string().trim().max(80).optional().or(z.literal("")),
  dueDate: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function createTaskAction(
  _prev: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const user = await requireUser();

  const parsed = newTaskSchema.safeParse({
    analysisId: formData.get("analysisId"),
    title: formData.get("title"),
    week: formData.get("week"),
    priority: formData.get("priority") ?? "MEDIUM",
    assignee: formData.get("assignee") ?? "",
    dueDate: formData.get("dueDate") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }

  try {
    await getStore().createTask(user.id, parsed.data.analysisId, {
      title: parsed.data.title,
      week: parsed.data.week,
      priority: parsed.data.priority,
      assignee: parsed.data.assignee || null,
      dueDate: parsed.data.dueDate || null,
      notes: parsed.data.notes || null,
    });
  } catch {
    return { error: "No se ha podido crear la tarea." };
  }

  revalidatePath(`/analisis/${parsed.data.analysisId}/plan`);
  return { message: "Tarea añadida." };
}

const patchSchema = z.object({
  analysisId: z.string().min(1),
  taskId: z.string().min(1),
  status: z.enum(["PENDING", "IN_PROGRESS", "DONE", "DISCARDED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  week: z.coerce.number().int().min(1).max(52).optional(),
  assignee: z.string().trim().max(80).optional(),
  dueDate: z.string().trim().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export async function updateTaskAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const raw: Record<string, FormDataEntryValue | undefined> = {
    analysisId: formData.get("analysisId") ?? undefined,
    taskId: formData.get("taskId") ?? undefined,
    status: formData.get("status") ?? undefined,
    priority: formData.get("priority") ?? undefined,
    week: formData.get("week") ?? undefined,
    assignee: formData.get("assignee") ?? undefined,
    dueDate: formData.get("dueDate") ?? undefined,
    notes: formData.get("notes") ?? undefined,
  };
  for (const key of Object.keys(raw)) {
    if (raw[key] === undefined) delete raw[key];
  }

  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) return;

  const { analysisId, taskId, ...rest } = parsed.data;
  const patch: TaskPatch = rest;

  await getStore().updateTask(user.id, taskId, patch);
  revalidatePath(`/analisis/${analysisId}/plan`);
}

export async function deleteTaskAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const analysisId = String(formData.get("analysisId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  if (!analysisId || !taskId) return;

  await getStore().deleteTask(user.id, taskId);
  revalidatePath(`/analisis/${analysisId}/plan`);
}
