"use client";

import { H1, H2, H3, Muted, P } from "@/components/ui/typography";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Mail,
  Phone,
  Globe,
  Briefcase,
  DollarSign,
  Heart,
  FileText,
  MessageSquare,
  Clock,
  User,
} from "lucide-react";
import Link from "next/link";

const clientData = {
  name: "David Frost",
  company: "Acme Corp",
  email: "david@acme.co",
  phone: "+1 (415) 555-0199",
  website: "acme.co",
  status: "Active",
  healthScore: 92,
  totalRevenue: "$42,500",
  activeProjects: 1,
  completedProjects: 2,
};

const linkedProjects = [
  { name: "E-commerce Redesign", status: "Active", value: "$18,500", progress: 65 },
  { name: "Brand Identity Guide", status: "Completed", value: "$12,000", progress: 100 },
  { name: "Marketing Landing Page", status: "Completed", value: "$12,000", progress: 100 },
];

const activityLog = [
  { action: "Signed contract for E-commerce Redesign", time: "4h ago" },
  { action: "Paid Invoice #INV-0042 ($2,500)", time: "2d ago" },
  { action: "Approved Milestone: UI Design Phase 1", time: "1w ago" },
  { action: "Viewed proposal for Marketing Kit", time: "2w ago" },
];

export default function ClientDetailPage() {
  return (
    <div className="space-y-8">
      {/* Back Link + Header */}
      <div>
        <Link href="/clients" className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-900 transition-colors mb-4">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Clients
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-md bg-zinc-100 flex items-center justify-center">
              <User className="h-6 w-6 text-zinc-500" strokeWidth={1.5} />
            </div>
            <div>
              <H1 className="text-2xl">{clientData.name}</H1>
              <Muted>{clientData.company}</Muted>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-zinc-200 text-zinc-600 bg-transparent font-medium">
              {clientData.status}
            </Badge>
            <Button variant="outline" size="sm" className="border-zinc-200">
              <MessageSquare className="h-4 w-4 mr-2" strokeWidth={1.5} />
              Message
            </Button>
          </div>
        </div>
      </div>

      {/* Contact Info + Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Surface className="p-5 space-y-3">
          <Muted className="text-[10px] uppercase tracking-widest font-bold">Contact</Muted>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <Mail className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
              {clientData.email}
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <Phone className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
              {clientData.phone}
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <Globe className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
              {clientData.website}
            </div>
          </div>
        </Surface>

        <Surface className="p-5">
          <Muted className="text-[10px] uppercase tracking-widest font-bold">Health Score</Muted>
          <div className="text-3xl font-bold tracking-tighter text-zinc-900 mt-2">{clientData.healthScore}</div>
          <div className="h-[2px] w-full bg-zinc-100 mt-3">
            <div className="h-full bg-zinc-900" style={{ width: `${clientData.healthScore}%` }} />
          </div>
        </Surface>

        <Surface className="p-5">
          <Muted className="text-[10px] uppercase tracking-widest font-bold">Total Revenue</Muted>
          <div className="text-3xl font-bold tracking-tighter text-zinc-900 mt-2">{clientData.totalRevenue}</div>
          <Muted className="text-[10px] mt-1">{clientData.activeProjects} active · {clientData.completedProjects} completed</Muted>
        </Surface>

        <Surface className="p-5">
          <Muted className="text-[10px] uppercase tracking-widest font-bold">Projects</Muted>
          <div className="text-3xl font-bold tracking-tighter text-zinc-900 mt-2">{clientData.activeProjects + clientData.completedProjects}</div>
          <Muted className="text-[10px] mt-1">Lifetime engagements</Muted>
        </Surface>
      </div>

      <Separator />

      {/* Linked Projects + Activity */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
        {/* Linked Projects */}
        <div className="md:col-span-7 space-y-4">
          <H2>Linked Projects</H2>
          <Surface className="divide-y divide-zinc-100">
            {linkedProjects.map((project, i) => (
              <div key={i} className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-zinc-900 tracking-tight">{project.name}</div>
                    <Muted className="text-xs">{project.value}</Muted>
                  </div>
                  <Badge variant="outline" className="border-zinc-200 text-zinc-600 bg-transparent font-medium">
                    {project.status}
                  </Badge>
                </div>
                <div className="h-[2px] w-full bg-zinc-100">
                  <div className="h-full bg-zinc-900" style={{ width: `${project.progress}%` }} />
                </div>
              </div>
            ))}
          </Surface>
        </div>

        {/* Activity Log */}
        <div className="md:col-span-5 space-y-4">
          <H2>Activity</H2>
          <Surface className="p-5">
            <div className="space-y-5">
              {activityLog.map((item, i) => (
                <div key={i} className="space-y-1">
                  <P className="text-sm leading-snug text-zinc-900 font-medium">{item.action}</P>
                  <Muted className="text-[10px] uppercase tracking-widest block">{item.time}</Muted>
                </div>
              ))}
            </div>
          </Surface>
        </div>
      </div>
    </div>
  );
}
