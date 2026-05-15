"use client";

import * as React from "react";
import { H1, H2, Muted, P } from "@/components/ui/typography";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { DetailPageHeader, MetaSeparator } from "@/components/ui/detail-page-header";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { ProjectBillingSection } from "@/components/projects/billing-section";
import { ProjectHubHeader, ProjectKpiRow, ProjectTimeSection, ProjectExpensesSection, ProjectMessagesSection } from "@/components/projects/detail-hub";
import { FilesPanel } from "@/components/files/files-panel";
import { useProjectDetail, useUpdateProject, useDeleteProject } from "@/lib/queries/projects";
import { useRouter } from "next/navigation";
import {
  Plus,
  MoreHorizontal,
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  X,
  User,
  Calendar,
  Loader2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ────────── types ────────── */

type TaskStatus = "todo" | "in_progress" | "review" | "done";
type TaskPriority = "low" | "medium" | "high";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  order_index: number;
}

interface Column {
  id: TaskStatus;
  title: string;
  icon: React.ElementType;
}

const COLUMNS: Column[] = [
  { id: "todo",        title: "To Do",       icon: Circle },
  { id: "in_progress", title: "In Progress", icon: Clock },
  { id: "review",      title: "Review",      icon: Eye },
  { id: "done",        title: "Done",        icon: CheckCircle2 },
];

const priorityDot: Record<TaskPriority, string> = {
  high:   "bg-zinc-900",
  medium: "bg-zinc-400",
  low:    "bg-zinc-200",
};

/* ────────── hooks ────────── */

function useTasks(projectId: string) {
  return useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async (): Promise<Task[]> => {
      const res = await fetch(`/api/projects/${projectId}/tasks`);
      if (!res.ok) throw new Error("Failed to load tasks");
      const { data } = await res.json();
      return data ?? [];
    },
    enabled: Boolean(projectId),
  });
}

/* ────────── TaskCard ────────── */

function TaskCard({
  task,
  projectId,
  onSelect,
  onDropReorder,
  index,
}: {
  task: Task;
  projectId: string;
  onSelect: (t: Task) => void;
  onDropReorder?: (fromTaskId: string, fromStatus: TaskStatus, targetStatus: TaskStatus, targetIndex: number) => void;
  index: number;
}) {
  const qc = useQueryClient();
  const [dragOver, setDragOver] = React.useState(false);
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/tasks/${task.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", projectId] }),
  });

  return (
    <Surface
      draggable
      onDragStart={(e) => {
        // Encode task id + current status so the drop handler can decide
        // if it's a column move vs a same-column reorder.
        e.dataTransfer.setData("text/x-task-id", task.id)
        e.dataTransfer.setData("text/x-task-status", task.status)
        e.dataTransfer.effectAllowed = "move"
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("text/x-task-id")) {
          e.preventDefault()
          setDragOver(true)
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        setDragOver(false)
        const fromId = e.dataTransfer.getData("text/x-task-id")
        const fromStatus = e.dataTransfer.getData("text/x-task-status") as TaskStatus
        if (!fromId || fromId === task.id) return
        e.preventDefault()
        e.stopPropagation()
        // Drop target index = this card's index. (Above-this-card insert.)
        onDropReorder?.(fromId, fromStatus, task.status, index)
      }}
      className={cn(
        "p-3 sm:p-4 space-y-3 cursor-grab active:cursor-grabbing hover:border-zinc-300 transition-colors group",
        dragOver && "border-zinc-900 ring-1 ring-zinc-900",
      )}
      onClick={() => onSelect(task)}
    >
      <div className="flex items-start justify-between gap-2">
        <P className="text-sm font-medium text-zinc-900 leading-snug line-clamp-2 flex-1">{task.title}</P>
        <button
          type="button"
          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(); }}
          title="Delete task"
        >
          {deleteMutation.isPending
            ? <Loader2 className="h-3.5 w-3.5 text-zinc-400 animate-spin" />
            : <Trash2 className="h-3.5 w-3.5 text-zinc-300 hover:text-red-500 transition-colors" strokeWidth={1.5} />
          }
        </button>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${priorityDot[task.priority]}`} />
          <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">{task.priority}</span>
        </div>
        {task.due_date && (
          <span className="text-[10px] text-zinc-400">
            {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
      </div>
    </Surface>
  );
}

/* ────────── AddTaskModal ────────── */

function AddTaskModal({
  projectId,
  defaultStatus,
  onClose,
}: {
  projectId: string;
  defaultStatus: TaskStatus;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = React.useState("");
  const [status, setStatus] = React.useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = React.useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), status, priority, due_date: dueDate || null }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed"); }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks", projectId] }); onClose(); },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20" onClick={() => !create.isPending && onClose()} />
      <div className="relative bg-white rounded-lg border border-zinc-200 shadow-lg w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <H2 className="text-base">New task</H2>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition-colors">
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-700">Title</label>
            <input
              autoFocus required
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Build checkout page"
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-700">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
              >
                {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-700">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-700">Due date <span className="text-zinc-400 font-normal">(optional)</span></label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 [color-scheme:light] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
            />
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2.5">{error}</div>
          )}

          <div className="flex justify-end gap-2 pt-1 border-t border-zinc-100">
            <Button type="button" variant="ghost" size="sm" className="h-9" onClick={onClose} disabled={create.isPending}>Cancel</Button>
            <Button type="submit" size="sm" className="h-9" disabled={create.isPending || !title.trim()}>
              {create.isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
              Add task
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ────────── TaskDrawer ────────── */

function TaskDrawer({ task, projectId, onClose }: { task: Task; projectId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = React.useState(task.title);
  const [status, setStatus] = React.useState<TaskStatus>(task.status);
  const [priority, setPriority] = React.useState<TaskPriority>(task.priority);
  const [description, setDescription] = React.useState(task.description ?? "");
  const [dueDate, setDueDate] = React.useState(task.due_date ?? "");

  React.useEffect(() => {
    setTitle(task.title);
    setStatus(task.status);
    setPriority(task.priority);
    setDescription(task.description ?? "");
    setDueDate(task.due_date ?? "");
  }, [task]);

  const updateMutation = useMutation({
    mutationFn: async (patch: Partial<Task>) => {
      const res = await fetch(`/api/projects/${projectId}/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Update failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", projectId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/tasks/${task.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      onClose();
    },
  });

  function commit<K extends keyof Task>(key: K, value: Task[K], localSetter?: (v: Task[K]) => void) {
    if (localSetter) localSetter(value);
    updateMutation.mutate({ [key]: value } as Partial<Task>);
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l border-zinc-200 z-50 overflow-y-auto">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Muted className="text-[10px] uppercase tracking-widest font-bold">Task Detail</Muted>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-500 hover:text-red-600"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              aria-label="Delete task"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              )}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </div>
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() && title !== task.title && commit("title", title.trim())}
          className="w-full text-xl font-semibold text-zinc-900 bg-transparent border-0 px-0 focus-visible:outline-none focus-visible:ring-0"
        />
        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Muted className="text-[10px] uppercase tracking-widest font-bold block">Status</Muted>
            <select
              value={status}
              onChange={(e) => {
                const s = e.target.value as TaskStatus;
                setStatus(s);
                updateMutation.mutate({ status: s });
              }}
              className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
            >
              {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Muted className="text-[10px] uppercase tracking-widest font-bold block">Priority</Muted>
            <select
              value={priority}
              onChange={(e) => {
                const p = e.target.value as TaskPriority;
                setPriority(p);
                updateMutation.mutate({ priority: p });
              }}
              className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Muted className="text-[10px] uppercase tracking-widest font-bold block">Due Date</Muted>
            <input
              type="date"
              value={dueDate ? dueDate.slice(0, 10) : ""}
              onChange={(e) => {
                const v = e.target.value || null;
                setDueDate(v ?? "");
                updateMutation.mutate({ due_date: v });
              }}
              className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
            />
          </div>
        </div>

        <Separator />
        <div className="space-y-2">
          <Muted className="text-[10px] uppercase tracking-widest font-bold block">Description</Muted>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => description !== (task.description ?? "") && commit("description", description)}
            placeholder="Add a description, acceptance criteria, links…"
            rows={6}
            className="w-full text-sm text-zinc-700 leading-relaxed rounded-md border border-zinc-200 bg-white px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 resize-y"
          />
        </div>

        {updateMutation.isPending && (
          <Muted className="text-xs flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving…
          </Muted>
        )}
      </div>
    </div>
  );
}

/* ────────── Page ────────── */

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = (params?.id as string) ?? "";
  const qc = useQueryClient();

  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [addModal, setAddModal] = React.useState<{ open: boolean; status: TaskStatus }>({ open: false, status: "todo" });

  const { data: tasks, isLoading } = useTasks(projectId);
  const { data: detail, isLoading: detailLoading } = useProjectDetail(projectId);

  // Status-change on drag would go here; for now done via drawer
  const moveMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: TaskStatus }) => {
      const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Move failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", projectId] }),
  });

  const tasksByStatus = React.useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], review: [], done: [] };
    for (const t of tasks ?? []) map[t.status]?.push(t);
    // Sort each column by order_index for stable drag reordering.
    for (const k of Object.keys(map) as TaskStatus[]) {
      map[k].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    }
    return map;
  }, [tasks]);

  // Multi-row reorder: persist new order_index across the affected column.
  const reorderMutation = useMutation({
    mutationFn: async (items: { id: string; order_index: number; status?: TaskStatus }[]) => {
      const res = await fetch(`/api/projects/${projectId}/tasks/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error("Reorder failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", projectId] }),
  });

  function handleDropReorder(
    fromTaskId: string,
    fromStatus: TaskStatus,
    targetStatus: TaskStatus,
    targetIndex: number,
  ) {
    const targetCol = [...tasksByStatus[targetStatus]];
    // If same column, splice out the dragged task first so target index aligns.
    let from: Task | undefined;
    if (fromStatus === targetStatus) {
      const fromIdx = targetCol.findIndex((t) => t.id === fromTaskId);
      if (fromIdx !== -1) [from] = targetCol.splice(fromIdx, 1);
    } else {
      const allFrom = tasksByStatus[fromStatus];
      from = allFrom.find((t) => t.id === fromTaskId);
    }
    if (!from) return;
    targetCol.splice(targetIndex, 0, { ...from, status: targetStatus });
    const items = targetCol.map((t, i) => ({
      id: t.id,
      order_index: i,
      status: t.id === fromTaskId ? targetStatus : undefined,
    }));
    reorderMutation.mutate(items);
  }

  const router = useRouter();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const [editOpen, setEditOpen] = React.useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);

  function handleArchiveToggle() {
    if (!detail) return;
    const newStatus = detail.rawStatus === "completed" ? "active" : "completed";
    updateProject.mutate({ id: detail.id, status: newStatus });
  }

  async function handleDelete() {
    if (!detail) return;
    await deleteProject.mutateAsync(detail.id);
    router.push("/projects");
  }

  return (
    <>
      <div className="space-y-8">
        {/* Header with real project metadata + linked client/contract/proposal */}
        <ProjectHubHeader
          detail={detail ?? null}
          isLoading={detailLoading}
          taskCount={tasks?.length ?? 0}
          tasksDone={tasksByStatus.done.length}
          onAddTask={() => setAddModal({ open: true, status: "todo" })}
          onEdit={() => setEditOpen(true)}
          onArchiveToggle={handleArchiveToggle}
          onDelete={() => setConfirmDeleteOpen(true)}
        />

        {/* KPI cards */}
        <ProjectKpiRow detail={detail ?? null} isLoading={detailLoading} />

        {/* Billing — contract + milestones + invoices for this project */}
        <ProjectBillingSection projectId={projectId} />

        {/* Time entries logged against this project */}
        <ProjectTimeSection projectId={projectId} />

        {/* Expenses linked to this project */}
        <ProjectExpensesSection projectId={projectId} />

        {/* Client messages thread (project-scoped preview) */}
        <ProjectMessagesSection projectId={projectId} clientId={detail?.client.id ?? null} />

        {/* Files attached to this project */}
        <FilesPanel scope={{ projectId }} title="Files" />

        {/* Kanban Board */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((column) => {
            const Icon = column.icon;
            const colTasks = tasksByStatus[column.id];
            return (
              <div key={column.id} className="space-y-3 min-w-0">
                {/* Column Header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="h-4 w-4 text-zinc-400 shrink-0" strokeWidth={1.5} />
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-900 truncate">
                      {column.title}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-400 shrink-0">
                      {isLoading ? "—" : colTasks.length}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => setAddModal({ open: true, status: column.id })}
                  >
                    <Plus className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                  </Button>
                </div>

                <div className="h-px bg-zinc-200" />

                {/* Task Cards — column body is the drop target. Native HTML5
                    dnd: TaskCard sets text/x-task-id on dragstart; we read
                    it here and call moveMutation when status differs. */}
                <div
                  className="space-y-2 min-h-[48px] rounded-lg transition-colors"
                  onDragOver={(e) => {
                    if (e.dataTransfer.types.includes("text/x-task-id")) {
                      e.preventDefault()
                      e.dataTransfer.dropEffect = "move"
                    }
                  }}
                  onDrop={(e) => {
                    const taskId = e.dataTransfer.getData("text/x-task-id")
                    const fromStatus = e.dataTransfer.getData("text/x-task-status")
                    if (!taskId) return
                    if (fromStatus === column.id) return
                    moveMutation.mutate({ taskId, status: column.id })
                  }}
                >
                  {isLoading ? (
                    [1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)
                  ) : colTasks.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => setAddModal({ open: true, status: column.id })}
                      className="w-full border-2 border-dashed border-zinc-200 rounded-lg py-4 text-xs text-zinc-400 hover:border-zinc-300 hover:text-zinc-600 transition-colors"
                    >
                      + Add task
                    </button>
                  ) : (
                    colTasks.map((task, idx) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        index={idx}
                        projectId={projectId}
                        onSelect={setSelectedTask}
                        onDropReorder={handleDropReorder}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add task modal */}
      {addModal.open && (
        <AddTaskModal
          projectId={projectId}
          defaultStatus={addModal.status}
          onClose={() => setAddModal({ open: false, status: "todo" })}
        />
      )}

      {/* Task drawer */}
      {selectedTask && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setSelectedTask(null)} />
          <TaskDrawer task={selectedTask} projectId={projectId} onClose={() => setSelectedTask(null)} />
        </>
      )}

      {/* Edit project */}
      {editOpen && detail && (
        <EditProjectModal
          project={detail}
          onClose={() => setEditOpen(false)}
          onSave={async (patch) => {
            await updateProject.mutateAsync({ id: detail.id, ...patch });
            setEditOpen(false);
          }}
          pending={updateProject.isPending}
        />
      )}

      {/* Delete confirm */}
      {confirmDeleteOpen && detail && (
        <ConfirmDeleteProjectModal
          name={detail.title}
          onClose={() => setConfirmDeleteOpen(false)}
          onConfirm={handleDelete}
          pending={deleteProject.isPending}
        />
      )}
    </>
  );
}

/* ────────── EditProjectModal ────────── */

function EditProjectModal({
  project,
  onClose,
  onSave,
  pending,
}: {
  project: NonNullable<ReturnType<typeof useProjectDetail>["data"]>;
  onClose: () => void;
  onSave: (patch: { title?: string; description?: string | null; totalBudget?: number; status?: string }) => Promise<void> | void;
  pending: boolean;
}) {
  const [title, setTitle] = React.useState(project.title);
  const [description, setDescription] = React.useState(project.description ?? "");
  const [budget, setBudget] = React.useState(String(project.totalBudget));
  const [status, setStatus] = React.useState(project.rawStatus);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await onSave({
      title: title.trim(),
      description: description.trim() || null,
      totalBudget: Number(budget) || 0,
      status,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={() => !pending && onClose()} />
      <form
        onSubmit={submit}
        className="relative w-full max-w-md bg-white rounded-lg border border-zinc-200 shadow-lg p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-900">Edit project</h3>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-700" aria-label="Close">
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-700">Title</label>
          <input
            required
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-700">Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-700">Total budget</label>
            <input
              type="number"
              min="0"
              step="100"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-700">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
            >
              <option value="active">Active</option>
              <option value="on-hold">On hold</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending} className="gap-2">
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}

/* ────────── ConfirmDeleteProjectModal ────────── */

function ConfirmDeleteProjectModal({
  name,
  onClose,
  onConfirm,
  pending,
}: {
  name: string;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  pending: boolean;
}) {
  const [confirmInput, setConfirmInput] = React.useState("");
  const canDelete = confirmInput.trim().toLowerCase() === name.trim().toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={() => !pending && onClose()} />
      <div className="relative w-full max-w-md bg-white rounded-lg border border-zinc-200 shadow-lg p-5 space-y-4">
        <h3 className="text-base font-semibold text-zinc-900">Delete project?</h3>
        <p className="text-sm text-zinc-600 leading-relaxed">
          This permanently removes the project, its tasks, milestones, and severs links from
          contracts/invoices/time entries. Type the project name to confirm.
        </p>
        <code className="block text-xs font-mono text-zinc-500 bg-zinc-50 border border-zinc-200 rounded p-2 truncate">
          {name}
        </code>
        <input
          type="text"
          value={confirmInput}
          onChange={(e) => setConfirmInput(e.target.value)}
          placeholder="Type project name to confirm"
          className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
        />
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={!canDelete || pending}
            className="gap-2 bg-red-600 hover:bg-red-700"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete project
          </Button>
        </div>
      </div>
    </div>
  );
}
