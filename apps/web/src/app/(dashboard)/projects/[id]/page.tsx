"use client";

import * as React from "react";
import { H1, H2, Muted, P } from "@/components/ui/typography";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  MoreHorizontal,
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  X,
  User,
  Calendar,
  MessageSquare,
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  assignee: string;
  priority: "high" | "medium" | "low";
  dueDate: string;
}

interface KanbanColumn {
  id: string;
  title: string;
  icon: React.ElementType;
  tasks: Task[];
}

const kanbanData: KanbanColumn[] = [
  {
    id: "todo",
    title: "To Do",
    icon: Circle,
    tasks: [
      { id: "t1", title: "Set up payment gateway integration", assignee: "Najib O.", priority: "high", dueDate: "Mar 18" },
      { id: "t2", title: "Design checkout flow mockups", assignee: "Sarah C.", priority: "medium", dueDate: "Mar 20" },
      { id: "t3", title: "Write API documentation", assignee: "James L.", priority: "low", dueDate: "Mar 22" },
    ],
  },
  {
    id: "in_progress",
    title: "In Progress",
    icon: Clock,
    tasks: [
      { id: "t4", title: "Build product catalog component", assignee: "Najib O.", priority: "high", dueDate: "Mar 16" },
      { id: "t5", title: "Implement search functionality", assignee: "Maria S.", priority: "medium", dueDate: "Mar 17" },
    ],
  },
  {
    id: "review",
    title: "Review",
    icon: Eye,
    tasks: [
      { id: "t6", title: "User authentication flow", assignee: "James L.", priority: "high", dueDate: "Mar 14" },
    ],
  },
  {
    id: "done",
    title: "Done",
    icon: CheckCircle2,
    tasks: [
      { id: "t7", title: "Database schema design", assignee: "Najib O.", priority: "high", dueDate: "Mar 10" },
      { id: "t8", title: "Set up CI/CD pipeline", assignee: "James L.", priority: "medium", dueDate: "Mar 12" },
    ],
  },
];

const priorityDot: Record<string, string> = {
  high: "bg-zinc-900",
  medium: "bg-zinc-400",
  low: "bg-zinc-200",
};

function TaskCard({ task, onSelect }: { task: Task; onSelect: (task: Task) => void }) {
  return (
    <Surface
      className="p-4 space-y-3 cursor-pointer hover:border-zinc-300 transition-colors group"
      onClick={() => onSelect(task)}
    >
      <div className="flex items-start justify-between gap-2">
        <P className="text-sm font-medium text-zinc-900 leading-snug line-clamp-2">{task.title}</P>
        <MoreHorizontal className="h-4 w-4 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${priorityDot[task.priority]}`} />
          <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">{task.priority}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 rounded bg-zinc-100 flex items-center justify-center">
            <User className="h-3 w-3 text-zinc-500" strokeWidth={1.5} />
          </div>
          <span className="text-[10px] text-zinc-400">{task.dueDate}</span>
        </div>
      </div>
    </Surface>
  );
}

function TaskDrawer({ task, onClose }: { task: Task; onClose: () => void }) {
  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l border-zinc-200 z-50 overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Drawer Header */}
        <div className="flex items-center justify-between">
          <Muted className="text-[10px] uppercase tracking-widest font-bold">Task Detail</Muted>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-6">
          <H2 className="text-xl truncate">{task.title}</H2>

          <Separator />

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Muted className="text-[10px] uppercase tracking-widest font-bold">Assignee</Muted>
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-zinc-100 flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-zinc-500 shrink-0" strokeWidth={1.5} />
                </div>
                <span className="text-sm font-medium text-zinc-900 truncate max-w-[140px]">{task.assignee}</span>
              </div>
            </div>
            <div className="space-y-1">
              <Muted className="text-[10px] uppercase tracking-widest font-bold">Due Date</Muted>
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                <span className="text-sm font-medium text-zinc-900">{task.dueDate}</span>
              </div>
            </div>
            <div className="space-y-1">
              <Muted className="text-[10px] uppercase tracking-widest font-bold">Priority</Muted>
              <div className="flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${priorityDot[task.priority]}`} />
                <span className="text-sm font-medium text-zinc-900 capitalize">{task.priority}</span>
              </div>
            </div>
            <div className="space-y-1">
              <Muted className="text-[10px] uppercase tracking-widest font-bold">Status</Muted>
              <Badge variant="outline" className="border-zinc-200 text-zinc-600 bg-transparent font-medium">
                In Progress
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div className="space-y-2">
            <Muted className="text-[10px] uppercase tracking-widest font-bold">Description</Muted>
            <P className="text-sm text-zinc-600 leading-relaxed">
              Complete the implementation for this task. Coordinate with the team on requirements and ensure all acceptance criteria are met before moving to review.
            </P>
          </div>

          <Separator />

          {/* Activity */}
          <div className="space-y-3">
            <Muted className="text-[10px] uppercase tracking-widest font-bold">Activity</Muted>
            <div className="space-y-4">
              {[
                { action: "Created this task", actor: "Najib O.", time: "3d ago" },
                { action: "Changed priority to " + task.priority, actor: "Najib O.", time: "2d ago" },
                { action: "Added to sprint", actor: "System", time: "2d ago" },
              ].map((item, i) => (
                <div key={i} className="space-y-0.5">
                  <P className="text-xs text-zinc-600">
                    <span className="font-medium text-zinc-900">{item.actor}</span> {item.action}
                  </P>
                  <Muted className="text-[10px] uppercase tracking-widest">{item.time}</Muted>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);

  return (
    <>
      <div className="space-y-8">
        {/* Back + Header */}
        <div>
          <Link href="/projects" className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-900 transition-colors mb-4">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Projects
          </Link>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <H1 className="text-[clamp(1.25rem,2.5vw,1.5rem)] truncate">E-commerce Redesign</H1>
              <Muted className="truncate">Acme Corp · $18,500 · 65% complete</Muted>
            </div>
            <Button className="font-semibold px-5 gap-2">
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              Add Task
            </Button>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
          {kanbanData.map((column) => (
            <div key={column.id} className="space-y-3">
              {/* Column Header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 min-w-0">
                  <column.icon className="h-4 w-4 text-zinc-400 shrink-0" strokeWidth={1.5} />
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-900 truncate">
                    {column.title}
                  </span>
                  <span className="text-[10px] font-bold text-zinc-400">
                    {column.tasks.length}
                  </span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Plus className="h-3.5 w-3.5 text-zinc-400" />
                </Button>
              </div>

              <div className="h-[2px] bg-zinc-200" />

              {/* Task Cards */}
              <div className="space-y-2">
                {column.tasks.map((task) => (
                  <TaskCard key={task.id} task={task} onSelect={setSelectedTask} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Task Drawer Overlay */}
      {selectedTask && (
        <>
          <div className="fixed inset-0 bg-zinc-900/10 z-40" onClick={() => setSelectedTask(null)} />
          <TaskDrawer task={selectedTask} onClose={() => setSelectedTask(null)} />
        </>
      )}
    </>
  );
}
