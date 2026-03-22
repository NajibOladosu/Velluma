"use client";

import { H1, Muted } from "@/components/ui/typography";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  ArrowUpRight,
  Briefcase,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  client: string;
  status: "active" | "completed" | "on-hold";
  progress: number;
  value: string;
  nextMilestone: string;
}

const projects: Project[] = [
  { id: "1", name: "E-commerce Redesign", client: "Acme Corp", status: "active", progress: 65, value: "$18,500", nextMilestone: "Backend Integration" },
  { id: "2", name: "SaaS Dashboard Audit", client: "Orbit Systems", status: "active", progress: 30, value: "$9,800", nextMilestone: "UX Research Report" },
  { id: "3", name: "Marketing Platform", client: "Terra Finance", status: "active", progress: 15, value: "$22,000", nextMilestone: "Wireframes" },
  { id: "4", name: "Brand Identity Guide", client: "Acme Corp", status: "completed", progress: 100, value: "$12,000", nextMilestone: "—" },
  { id: "5", name: "Marketing Landing Page", client: "Acme Corp", status: "completed", progress: 100, value: "$12,000", nextMilestone: "—" },
  { id: "6", name: "Mobile App MVP", client: "Vesper AI", status: "on-hold", progress: 45, value: "$15,000", nextMilestone: "API Layer" },
];

const statusLabel: Record<string, string> = {
  active: "Active",
  completed: "Completed",
  "on-hold": "On Hold",
};

export default function ProjectsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
        <div className="min-w-0">
          <H1 className="truncate">Projects</H1>
          <Muted className="truncate block">{projects.length} projects across all clients.</Muted>
        </div>
        <Button className="font-semibold px-4 sm:px-5 gap-2 w-full sm:w-auto shrink-0">
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
              {projects.map((project) => (
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
    </div>
  );
}
