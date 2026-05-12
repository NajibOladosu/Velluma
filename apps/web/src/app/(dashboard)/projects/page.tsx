"use client";

import * as React from "react";
import { H1, Muted } from "@/components/ui/typography";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import Link from "next/link";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  ArrowUpRight,
  Briefcase,
  Loader2,
  X,
} from "lucide-react";
import { useProjects, useCreateProject } from "@/lib/queries/projects";
import { useClients } from "@/lib/queries/clients";

const statusLabel: Record<string, string> = {
  active: "Active",
  completed: "Completed",
  "on-hold": "On Hold",
};

export default function ProjectsPage() {
  const [search, setSearch] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const { data: projects = [], isLoading } = useProjects();

  const filtered = React.useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.toLowerCase();
    return projects.filter(
      (p) => p.name.toLowerCase().includes(q) || p.client.toLowerCase().includes(q)
    );
  }, [projects, search]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
        <div className="min-w-0">
          <H1 className="sm:truncate">Projects</H1>
          <Muted className="sm:truncate block">
            {isLoading ? "Loading…" : `${projects.length} projects across all clients.`}
          </Muted>
        </div>
        <Button
          className="font-semibold px-4 sm:px-5 gap-2 w-full sm:w-auto shrink-0"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          New Project
        </Button>
      </div>

      {/* Search + View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search projects..."
            className="pl-9 h-9 w-full bg-white border-zinc-200 text-sm focus:ring-0"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 border border-zinc-200 rounded-md p-0.5 w-full sm:w-auto justify-center sm:justify-start">
          <Button variant="ghost" size="sm" className="h-7 px-2.5 bg-zinc-100 text-zinc-900 w-full sm:w-auto">
            <List className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2.5 text-zinc-400 w-full sm:w-auto">
            <LayoutGrid className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Projects Table */}
      <Surface className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Project</th>
                <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Status</th>
                <th className="px-4 py-4 hidden md:table-cell text-[10px] uppercase tracking-widest font-bold text-zinc-500">Progress</th>
                <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Value</th>
                <th className="px-4 py-4 hidden sm:table-cell text-[10px] uppercase tracking-widest font-bold text-zinc-500 text-right">Next Milestone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-zinc-100">
                    <td className="px-4 py-4"><Skeleton className="h-9 w-40" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-5 w-16" /></td>
                    <td className="px-4 py-4 hidden md:table-cell"><Skeleton className="h-2 w-24" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-5 w-16" /></td>
                    <td className="px-4 py-4 hidden sm:table-cell"><Skeleton className="h-5 w-24 ml-auto" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Briefcase className="h-8 w-8 text-zinc-300" strokeWidth={1.5} />
                      <Muted className="text-sm">No projects found.</Muted>
                    </div>
                  </td>
                </tr>
              ) : null}
              {!isLoading && filtered.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`} className="contents">
                  <tr className="group hover:bg-zinc-50/50 transition-colors cursor-pointer">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-md bg-zinc-100 flex items-center justify-center flex-shrink-0">
                          <Briefcase className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-zinc-900 tracking-tight truncate max-w-[150px] sm:max-w-[200px]">{project.name}</div>
                          <div className="text-xs text-zinc-500 truncate max-w-[150px] sm:max-w-[200px]">{project.client}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant="outline" className="border-zinc-200 text-zinc-600 bg-transparent font-medium shrink-0">
                        {statusLabel[project.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <div className="flex items-center gap-3">
                        <div className="h-[2px] w-24 bg-zinc-100">
                          <div className="h-full bg-zinc-900" style={{ width: `${project.progress}%` }} />
                        </div>
                        <span className="text-xs font-medium text-zinc-500">{project.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-zinc-900 truncate max-w-[100px]">{project.value}</div>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-zinc-400 truncate max-w-[120px] sm:max-w-[150px]">{project.nextMilestone}</span>
                        <ArrowUpRight className="h-3.5 w-3.5 text-zinc-300 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                    </td>
                  </tr>
                </Link>
              ))}
            </tbody>
          </table>
        </div>
      </Surface>

      <NewProjectModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// NewProjectModal
// ---------------------------------------------------------------------------

const PROJECT_STATUSES = ["active", "on-hold", "completed"] as const;

function NewProjectModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { data: clients = [] } = useClients();
  const create = useCreateProject();

  const [title, setTitle]             = React.useState("");
  const [clientId, setClientId]       = React.useState("");
  const [description, setDescription] = React.useState("");
  const [budget, setBudget]           = React.useState("");
  const [status, setStatus]           = React.useState<string>("active");
  const [error, setError]             = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setTitle("");
      setClientId("");
      setDescription("");
      setBudget("");
      setStatus("active");
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Project title is required");
      return;
    }
    const parsedBudget = budget ? parseFloat(budget) : undefined;
    if (budget && (!Number.isFinite(parsedBudget) || (parsedBudget as number) < 0)) {
      setError("Budget must be a non-negative number");
      return;
    }

    try {
      await create.mutateAsync({
        title: title.trim(),
        clientId: clientId || null,
        description: description.trim() || undefined,
        totalBudget: parsedBudget,
        status,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !create.isPending && onClose()}>
      <DialogContent className="max-w-md mx-4">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>New project</DialogTitle>
              <p className="text-xs text-zinc-500 mt-0.5">
                Create a project. Client link is optional.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={create.isPending}
              className="text-zinc-400 hover:text-zinc-700 transition-colors disabled:opacity-50"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-700">Project title</label>
            <Input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Acme website redesign"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-700">
              Client <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
            >
              <option value="">No client (internal project)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-700">
                Budget (USD) <span className="text-zinc-400 font-normal">(opt.)</span>
              </label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-700">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s === "on-hold" ? "On Hold" : s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-700">
              Description <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Goals, scope, key dates…"
              className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
            />
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={create.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending} className="gap-2">
              {create.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                  Creating…
                </>
              ) : (
                "Create project"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
