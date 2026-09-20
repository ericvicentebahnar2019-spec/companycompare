"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { Badge, Button, cx, EmptyState } from "@/components/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import {
  createTaskAction,
  deleteTaskAction,
  updateTaskAction,
} from "@/lib/actions/tasks";
import type { TaskRecord } from "@/lib/db/types";

const PRIORITY_LABEL: Record<TaskRecord["priority"], string> = {
  HIGH: "Alta",
  MEDIUM: "Media",
  LOW: "Baja",
};

const STATUS_LABEL: Record<TaskRecord["status"], string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En curso",
  DONE: "Hecha",
  DISCARDED: "Descartada",
};

export function TaskBoard({
  analysisId,
  tasks,
}: {
  analysisId: string;
  tasks: TaskRecord[];
}) {
  const [open, setOpen] = useState(false);

  const weeks = [...new Set(tasks.map((task) => task.week))].sort((a, b) => a - b);
  const done = tasks.filter((task) => task.status === "DONE").length;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-2">
          {tasks.length === 0
            ? "Todavía no hay tareas."
            : `${done} de ${tasks.length} tareas completadas.`}
        </p>
        <Button type="button" onClick={() => setOpen(true)}>
          Añadir tarea
        </Button>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          title="El plan está vacío"
          description="Añade tareas a mano, o entra en cualquier problema detectado y pulsa «Añadir al plan de acción» en la acción que quieras ejecutar."
        />
      ) : (
        <div className="space-y-6">
          {weeks.map((week) => (
            <section key={week}>
              <h3 className="mb-2 text-sm font-semibold text-ink">Semana {week}</h3>
              <ul className="space-y-2">
                {tasks
                  .filter((task) => task.week === week)
                  .map((task) => (
                    <TaskRow key={task.id} task={task} analysisId={analysisId} />
                  ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <NewTaskModal
        analysisId={analysisId}
        open={open}
        onClose={() => setOpen(false)}
        defaultWeek={weeks.length > 0 ? Math.max(...weeks) : 1}
      />
    </div>
  );
}

function TaskRow({ task, analysisId }: { task: TaskRecord; analysisId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [expanded, setExpanded] = useState(false);
  const isDone = task.status === "DONE";

  function submit() {
    formRef.current?.requestSubmit();
  }

  return (
    <li className="rounded-lg border border-line bg-surface">
      <form ref={formRef} action={updateTaskAction} className="p-3">
        <input type="hidden" name="analysisId" value={analysisId} />
        <input type="hidden" name="taskId" value={task.id} />

        <div className="flex items-start gap-3">
          {/*
            Casilla como botón de envío: el estado al que se va es explícito,
            así que funciona igual sin JavaScript y no depende de que el
            navegador envíe o no un checkbox desmarcado.
          */}
          <button
            type="submit"
            name="status"
            value={isDone ? "PENDING" : "DONE"}
            role="checkbox"
            aria-checked={isDone}
            aria-label={`Marcar «${task.title}» como ${isDone ? "pendiente" : "completada"}`}
            className={cx(
              "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
              isDone
                ? "border-transparent bg-accent text-accent-ink"
                : "border-line-strong bg-surface hover:border-accent",
            )}
          >
            {isDone ? (
              <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
                <path
                  d="M2.5 6.2 4.8 8.5 9.5 3.8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}
          </button>

          <div className="min-w-0 flex-1">
            <p
              className={cx(
                "text-sm",
                isDone ? "text-ink-muted line-through" : "text-ink",
              )}
            >
              {task.title}
            </p>
            {task.notes ? (
              <p className="mt-0.5 text-xs text-ink-muted">{task.notes}</p>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{STATUS_LABEL[task.status]}</Badge>
              <Badge tone="neutral">Prioridad {PRIORITY_LABEL[task.priority].toLowerCase()}</Badge>
              {task.assignee ? <Badge tone="neutral">{task.assignee}</Badge> : null}
              {task.dueDate ? (
                <Badge tone="neutral">
                  {new Date(task.dueDate).toLocaleDateString("es-ES")}
                </Badge>
              ) : null}
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                className="text-xs text-ink-2 underline"
                aria-expanded={expanded}
              >
                {expanded ? "Cerrar" : "Editar"}
              </button>
            </div>
          </div>
        </div>

        {expanded ? (
          <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
            <Field label="Semana" htmlFor={`week-${task.id}`}>
              <Input
                id={`week-${task.id}`}
                name="week"
                type="number"
                min={1}
                max={52}
                defaultValue={task.week}
                onBlur={submit}
              />
            </Field>

            <Field label="Prioridad" htmlFor={`priority-${task.id}`}>
              <Select
                id={`priority-${task.id}`}
                name="priority"
                defaultValue={task.priority}
                onChange={submit}
              >
                {(Object.keys(PRIORITY_LABEL) as TaskRecord["priority"][]).map((value) => (
                  <option key={value} value={value}>
                    {PRIORITY_LABEL[value]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Responsable" htmlFor={`assignee-${task.id}`}>
              <Input
                id={`assignee-${task.id}`}
                name="assignee"
                defaultValue={task.assignee ?? ""}
                placeholder="Quién se encarga"
                onBlur={submit}
              />
            </Field>

            <Field label="Fecha" htmlFor={`due-${task.id}`}>
              <Input
                id={`due-${task.id}`}
                name="dueDate"
                type="date"
                defaultValue={task.dueDate ? task.dueDate.slice(0, 10) : ""}
                onChange={submit}
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Notas" htmlFor={`notes-${task.id}`}>
                <Textarea
                  id={`notes-${task.id}`}
                  name="notes"
                  defaultValue={task.notes ?? ""}
                  onBlur={submit}
                />
              </Field>
            </div>
          </div>
        ) : null}
      </form>

      {expanded ? (
        <form action={deleteTaskAction} className="border-t border-line px-3 py-2">
          <input type="hidden" name="analysisId" value={analysisId} />
          <input type="hidden" name="taskId" value={task.id} />
          <Button type="submit" variant="danger" className="px-3 py-1 text-xs">
            Eliminar tarea
          </Button>
        </form>
      ) : null}
    </li>
  );
}

function SubmitNewTask() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : "Añadir tarea"}
    </Button>
  );
}

function NewTaskModal({
  analysisId,
  open,
  onClose,
  defaultWeek,
}: {
  analysisId: string;
  open: boolean;
  onClose: () => void;
  defaultWeek: number;
}) {
  const [state, formAction] = useActionState(createTaskAction, {});

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva tarea"
      description="Añade un paso propio al plan, además de los que vengan de las recomendaciones."
    >
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="analysisId" value={analysisId} />

        <Field label="Qué hay que hacer" htmlFor="new-title">
          <Input id="new-title" name="title" required maxLength={200} />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Semana" htmlFor="new-week">
            <Input
              id="new-week"
              name="week"
              type="number"
              min={1}
              max={52}
              defaultValue={defaultWeek}
            />
          </Field>
          <Field label="Prioridad" htmlFor="new-priority">
            <Select id="new-priority" name="priority" defaultValue="MEDIUM">
              {(Object.keys(PRIORITY_LABEL) as TaskRecord["priority"][]).map((value) => (
                <option key={value} value={value}>
                  {PRIORITY_LABEL[value]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Responsable" htmlFor="new-assignee">
            <Input id="new-assignee" name="assignee" maxLength={80} />
          </Field>
          <Field label="Fecha" htmlFor="new-due">
            <Input id="new-due" name="dueDate" type="date" />
          </Field>
        </div>

        <Field label="Notas" htmlFor="new-notes">
          <Textarea id="new-notes" name="notes" maxLength={1000} />
        </Field>

        {state.error ? (
          <p className="text-sm text-[var(--critical)]" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.message ? (
          <p className="text-sm text-[var(--good-text)]" role="status">
            {state.message}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <SubmitNewTask />
        </div>
      </form>
    </Modal>
  );
}
