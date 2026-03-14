"use client";

import { H1, H2, Muted, P } from "@/components/ui/typography";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Plus,
  MoreHorizontal,
  ArrowUpRight,
  Sparkles,
  User,
} from "lucide-react";

interface Lead {
  id: string;
  name: string;
  company: string;
  value: string;
  priority: "high" | "medium" | "low";
  lastAction: string;
}

interface PipelineColumn {
  id: string;
  title: string;
  leads: Lead[];
}

const pipelineData: PipelineColumn[] = [
  {
    id: "inquiry",
    title: "Inquiry",
    leads: [
      { id: "1", name: "Sarah Chen", company: "Nexus Labs", value: "$8,200", priority: "high", lastAction: "2d ago" },
      { id: "2", name: "Marcus Webb", company: "Vesper AI", value: "$3,100", priority: "medium", lastAction: "5d ago" },
      { id: "3", name: "Priya Sharma", company: "Bloom Studio", value: "$5,400", priority: "low", lastAction: "1w ago" },
    ],
  },
  {
    id: "proposal_sent",
    title: "Proposal Sent",
    leads: [
      { id: "4", name: "Tom Ashford", company: "Starlight Digital", value: "$4,500", priority: "medium", lastAction: "3d ago" },
      { id: "5", name: "Lena Park", company: "Orion Health", value: "$12,000", priority: "high", lastAction: "1d ago" },
    ],
  },
  {
    id: "contract_signed",
    title: "Contract Signed",
    leads: [
      { id: "6", name: "David Frost", company: "Acme Corp", value: "$18,500", priority: "high", lastAction: "4h ago" },
    ],
  },
  {
    id: "active",
    title: "Active",
    leads: [
      { id: "7", name: "Maria Santos", company: "Orbit Systems", value: "$9,800", priority: "medium", lastAction: "1h ago" },
      { id: "8", name: "James Liu", company: "Terra Finance", value: "$22,000", priority: "high", lastAction: "30m ago" },
    ],
  },
];

const priorityStyles: Record<string, string> = {
  high: "text-zinc-900 font-bold",
  medium: "text-zinc-600 font-medium",
  low: "text-zinc-400 font-medium",
};

function LeadCard({ lead }: { lead: Lead }) {
  return (
    <Surface className="p-4 space-y-3 cursor-pointer hover:border-zinc-300 transition-colors group">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-md bg-zinc-100 flex items-center justify-center flex-shrink-0">
            <User className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-900 tracking-tight">{lead.name}</div>
            <Muted className="text-[10px] uppercase tracking-widest">{lead.company}</Muted>
          </div>
        </div>
        <MoreHorizontal className="h-4 w-4 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-zinc-900">{lead.value}</div>
        <div className="flex items-center gap-1.5">
          {lead.priority === "high" && (
            <Sparkles className="h-3 w-3 text-zinc-900" strokeWidth={1.5} />
          )}
          <span className={`text-[10px] uppercase tracking-widest ${priorityStyles[lead.priority]}`}>
            {lead.priority}
          </span>
        </div>
      </div>

      <Muted className="text-[10px] uppercase tracking-widest block">{lead.lastAction}</Muted>
    </Surface>
  );
}

export default function PipelinePage() {
  const totalValue = pipelineData
    .flatMap((col) => col.leads)
    .reduce((sum, lead) => sum + parseInt(lead.value.replace(/[$,]/g, "")), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <H1>Pipeline</H1>
          <Muted>
            {pipelineData.flatMap((c) => c.leads).length} leads · ${totalValue.toLocaleString()} potential value
          </Muted>
        </div>
        <Button className="font-semibold px-5 gap-2">
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          Add Lead
        </Button>
      </div>

      {/* Pipeline Board */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {pipelineData.map((column) => (
          <div key={column.id} className="space-y-3">
            {/* Column Header */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-900">
                  {column.title}
                </span>
                <span className="text-[10px] font-bold text-zinc-400">
                  {column.leads.length}
                </span>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Plus className="h-3.5 w-3.5 text-zinc-400" />
              </Button>
            </div>

            {/* Column Separator */}
            <div className="h-[2px] bg-zinc-900" />

            {/* Lead Cards */}
            <div className="space-y-2">
              {column.leads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
