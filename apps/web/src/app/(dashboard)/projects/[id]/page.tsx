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
}: {
  task: Task;
  projectId: string;
  onSelect: (t: Task) => void;
}) {
  const qc = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/tasks/${task.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", projectId] }),
  });

  return (
    <Surface
      className="p-3 sm:p-4 space-y-3 cursor-pointer hover:border-zinc-300 transition-colors group"
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
  const [status, setStatus] = React.useState<TaskStatus>(task.status);

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

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l border-zinc-200 z-50 overflow-y-auto">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Muted className="text-[10px] uppercase tracking-widest font-bold">Task Detail</Muted>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </div>

        <H2 className="text-xl">{task.title}</H2>
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
            <div className="flex items-center gap-2 h-9">
              <div className={`h-2.5 w-2.5 rounded-full ${priorityDot[task.priority]}`} />
              <span className="text-sm font-medium text-zinc-900 capitalize">{task.priority}</span>
            </div>
          </div>
          {task.due_date && (
            <div className="space-y-1">
              <Muted className="text-[10px] uppercase tracking-widest font-bold block">Due Date</Muted>
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                <span className="text-sm font-medium text-zinc-900">
                  {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
            </div>
          )}
        </div>

        {task.description && (
          <>
            <Separator />
            <div className="space-y-2">
              <Muted className="text-[10px] uppercase tracking-widest font-bold block">Description</Muted>
              <P className="text-sm text-zinc-600 leading-relaxed">{task.description}</P>
            </div>
          </>
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
    return map;
  }, [tasks]);

  return (
    <>
      <div className="space-y-8">
        <DetailPageHeader
          backHref="/projects"
          backLabel="Back to Projects"
          title={
            <>
              <H1 className="text-2xl font-medium truncate min-w-0">Project Board</H1>
              <Badge variant="outline" className="flex-shrink-0 bg-transparent text-zinc-600 border-zinc-200">
                In Progress
              </Badge>
            </>
          }
          meta={
            <>
              {tasks && (
                <>
                  <span className="whitespace-nowrap">{tasks.length} tasks</span>
                  <MetaSeparator />
                  <span className="whitespace-nowrap">{tasksByStatus.done.length} done</span>
                </>
              )}
            </>
          }
          actions={
            <Button size="sm" className="w-full sm:w-auto h-9 gap-2" onClick={() => setAddModal({ open: true, status: "todo" })}>
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              Add Task
            </Button>
          }
        />

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

                {/* Task Cards */}
                <div className="space-y-2 min-h-[48px]">
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
                    colTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        projectId={projectId}
                        onSelect={setSelectedTask}
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
    </>
  );
}
