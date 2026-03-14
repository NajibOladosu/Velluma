"use client";

import { H1, H2, Muted, P } from "@/components/ui/typography";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import {
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  User,
} from "lucide-react";

interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  status: "active" | "lead" | "past";
  totalRevenue: string;
  projects: number;
  lastInteraction: string;
}

const clients: Client[] = [
  { id: "1", name: "David Frost", company: "Acme Corp", email: "david@acme.co", status: "active", totalRevenue: "$42,500", projects: 3, lastInteraction: "2h ago" },
  { id: "2", name: "James Liu", company: "Terra Finance", email: "james@terra.io", status: "active", totalRevenue: "$22,000", projects: 1, lastInteraction: "30m ago" },
  { id: "3", name: "Maria Santos", company: "Orbit Systems", email: "maria@orbit.dev", status: "active", totalRevenue: "$9,800", projects: 2, lastInteraction: "1h ago" },
  { id: "4", name: "Lena Park", company: "Orion Health", email: "lena@orion.health", status: "lead", totalRevenue: "$0", projects: 0, lastInteraction: "1d ago" },
  { id: "5", name: "Tom Ashford", company: "Starlight Digital", email: "tom@starlight.co", status: "lead", totalRevenue: "$0", projects: 0, lastInteraction: "3d ago" },
  { id: "6", name: "Sarah Chen", company: "Nexus Labs", email: "sarah@nexus.io", status: "lead", totalRevenue: "$0", projects: 0, lastInteraction: "2d ago" },
  { id: "7", name: "Elena Vogt", company: "Cascade Media", email: "elena@cascade.com", status: "past", totalRevenue: "$18,200", projects: 2, lastInteraction: "2w ago" },
];

const statusLabel: Record<string, string> = {
  active: "Active",
  lead: "Lead",
  past: "Past",
};

export default function ClientsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <H1>Clients</H1>
          <Muted>{clients.length} contacts in your rolodex.</Muted>
        </div>
        <Button className="font-semibold px-5 gap-2">
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          Add Client
        </Button>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search clients..."
            className="pl-9 h-9 bg-white border-zinc-200 text-sm focus:ring-0"
          />
        </div>
        <Button variant="outline" size="sm" className="h-9 border-zinc-200">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Client Table */}
      <Surface className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Client</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Status</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Total Revenue</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Projects</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 text-right">Last Interaction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {clients.map((client) => (
                <Link key={client.id} href={`/clients/${client.id}`} className="contents">
                  <tr className="group hover:bg-zinc-50/50 transition-colors cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-md bg-zinc-100 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-900 tracking-tight">{client.name}</div>
                          <div className="text-xs text-zinc-500">{client.company}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="border-zinc-200 text-zinc-600 bg-transparent font-medium">
                        {statusLabel[client.status]}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-zinc-900">{client.totalRevenue}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-zinc-600">{client.projects}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-zinc-400">{client.lastInteraction}</span>
                        <ArrowUpRight className="h-3.5 w-3.5 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity" />
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
