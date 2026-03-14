"use client";

import * as React from "react";
import { H2, H3, Muted } from "@/components/ui/typography";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { MinimalEditor } from "@/components/editor/editor";
import {
  ArrowLeft,
  X,
  Eye,
  Send,
  MoreVertical,
  LayoutTemplate,
  CreditCard,
  FileSignature,
  Smartphone,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Briefcase,
  Users,
  Sparkles,
  Lock,
  Unlock,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════
   TYPES & MOCK DATA
   ═══════════════════════════════════════════════════════ */

type EditorTab = "editor" | "settings";

/* ═══════════════════════════════════════════════════════
   PAGE COMPONENT
   ═══════════════════════════════════════════════════════ */

export default function ContractBuilderPage({
  params,
}: {
  params: { id: string };
}) {
  const [activeTab, setActiveTab] = React.useState<EditorTab>("editor");
  const [isLocked, setIsLocked] = React.useState(true); // Represents "Standardized" template locked state
  
  // Dummy content state
  const [agreementContent, setAgreementContent] = React.useState("<h2>Master Services Agreement</h2><p>This agreement...</p>");

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] -mt-8 -mx-8">
      {/* ── Top Header bar ── */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-zinc-200 bg-white/80 px-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500" asChild>
            <a href="/contracts">
              <ArrowLeft className="h-4 w-4" />
            </a>
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight text-zinc-900">
              Master Services Agreement
            </span>
            <Badge variant="outline" className="ml-2 font-mono text-[10px] uppercase tracking-wider text-zinc-500 bg-zinc-50">
              Template
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <div className="mr-4 flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
             <CheckCircle2 className="h-3.5 w-3.5" />
             Saved
           </div>
           <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100">
             <Eye className="h-4 w-4" />
             Preview
           </Button>
           <Separator orientation="vertical" className="h-4 mx-1" />
           <Button size="sm" className="h-8 bg-zinc-900 hover:bg-zinc-800 text-white">
             Save Template
           </Button>
        </div>
      </header>

      {/* ── Main Layout ── */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar (Template Configuration) */}
        <aside className="w-64 border-r border-zinc-200 bg-zinc-50 p-4 shrink-0 overflow-y-auto hidden md:block">
           <div className="mb-6 px-2 text-sm font-medium text-zinc-900 flex justify-between items-center">
              Configuration
           </div>
           
           <div className="space-y-1 mb-6">
             <button
                onClick={() => setActiveTab("editor")}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all text-sm font-medium",
                  activeTab === "editor"
                    ? "bg-white shadow-sm border border-zinc-200 text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-100/80 border border-transparent"
                )}
              >
                <LayoutTemplate className="h-4 w-4" />
                Template Editor
             </button>
             <button
                onClick={() => setActiveTab("settings")}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all text-sm font-medium",
                  activeTab === "settings"
                    ? "bg-white shadow-sm border border-zinc-200 text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-100/80 border border-transparent"
                )}
              >
                <ShieldCheck className="h-4 w-4" />
                Legal Settings
             </button>
           </div>
           
           <Separator className="mb-6" />

           {/* Smart Fields Reference */}
           <div className="mb-6 px-2">
             <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3 block">
               Smart Fields
             </h3>
             <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
               Click to copy and paste these into your agreement to auto-populate data when generating a proposal.
             </p>
             <div className="space-y-2">
               <Badge variant="outline" className="w-full justify-start bg-white border-zinc-200 text-zinc-600 text-[10px] font-mono hover:bg-zinc-50 cursor-pointer">
                 {"{{"}client.name{"}}"}
               </Badge>
               <Badge variant="outline" className="w-full justify-start bg-white border-zinc-200 text-zinc-600 text-[10px] font-mono hover:bg-zinc-50 cursor-pointer">
                 {"{{"}client.company{"}}"}
               </Badge>
               <Badge variant="outline" className="w-full justify-start bg-white border-zinc-200 text-zinc-600 text-[10px] font-mono hover:bg-zinc-50 cursor-pointer">
                 {"{{"}project.name{"}}"}
               </Badge>
               <Badge variant="outline" className="w-full justify-start bg-white border-zinc-200 text-zinc-600 text-[10px] font-mono hover:bg-zinc-50 cursor-pointer">
                 {"{{"}project.deliverables{"}}"}
               </Badge>
               <Badge variant="outline" className="w-full justify-start bg-white border-zinc-200 text-zinc-600 text-[10px] font-mono hover:bg-zinc-50 cursor-pointer">
                 {"{{"}payment.total{"}}"}
               </Badge>
             </div>
           </div>

        </aside>

        {/* Editor Area */}
        <main className="flex-1 overflow-y-auto bg-zinc-50/30">
          <div className="mx-auto max-w-4xl p-8 py-12">
            
            {activeTab === "editor" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                 
                 {/* Builder Header */}
                 <div className="mb-8 border-b border-zinc-200 pb-6">
                   <H2>Agreement Template</H2>
                   <Muted className="mt-1 text-sm">Design the legal structure of your contract. Locked clauses cannot be edited when adding this to a proposal.</Muted>
                 </div>

                 {/* Contextual Top Banner */}
                 <div className="mb-8 flex items-start gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                   <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                   <div className="flex-1">
                     <h4 className="text-sm font-medium text-zinc-900">Clause Locking</h4>
                     <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
                       Use the lock icon next to each section to prevent unauthorized changes when generating proposals.
                     </p>
                   </div>
                   <Button variant="outline" size="sm" className="h-7 text-xs border-zinc-200 font-medium" onClick={() => setIsLocked(!isLocked)}>
                     {isLocked ? (
                       <><Unlock className="h-3 w-3 mr-1" /> Unlock All</>
                     ) : (
                       <><Lock className="h-3 w-3 mr-1" /> Lock All</>
                     )}
                   </Button>
                 </div>

                 {/* Render standard clauses representing locked and unlocked sections */}
                 <Surface className="p-8 border-l-4 border-l-zinc-300 relative group transition-colors">
                    <div className="absolute -left-[14px] top-6 bg-white border border-zinc-200 rounded-full p-1 opacity-100 cursor-pointer shadow-sm hover:scale-110 transition-transform" onClick={() => setIsLocked(!isLocked)}>
                      {isLocked ? <Lock className="h-3.5 w-3.5 text-zinc-600" /> : <Unlock className="h-3.5 w-3.5 text-zinc-600" />}
                    </div>
                    <H3 className="mb-4">1. Scope of Work (Dynamic)</H3>
                    <div className="text-sm text-zinc-600 space-y-3 opacity-80 mb-4 bg-zinc-50 p-4 rounded-md border border-zinc-100">
                       <p>Provider agrees to perform the services detailed in the "Scope & Value" section of the associated Proposal. Any expansion of the scope will require a separate written agreement or change order.</p>
                       <p className="text-xs text-zinc-400 mt-2 font-medium italic">This text relies on the Proposal's deliverable generator and cannot be edited directly.</p>
                    </div>
                 </Surface>

                 <Surface className="p-8 border-l-4 border-l-zinc-900 relative">
                    <div className="absolute -left-[14px] top-6 bg-zinc-900 border border-zinc-900 rounded-full p-1 cursor-pointer hover:scale-110 shadow-sm transition-transform">
                       <Unlock className="h-3.5 w-3.5 text-white" />
                    </div>
                    <H3 className="mb-4 flex justify-between items-center">
                      2. Custom Terms (Editable Default) 
                      <Button variant="ghost" size="sm" className="h-6 text-xs text-blue-600 hover:bg-blue-50">
                        <Sparkles className="h-3 w-3 mr-1" /> Enhance
                      </Button>
                    </H3>
                    <MinimalEditor
                       content={agreementContent}
                       onChange={setAgreementContent}
                       placeholder="Add custom clauses specific to this template..."
                       className="min-h-[150px]"
                    />
                 </Surface>

                 <Surface className="p-8 border-l-4 border-l-zinc-300 relative group transition-colors">
                    <div className="absolute -left-[14px] top-6 bg-white border border-zinc-200 rounded-full p-1 opacity-100 cursor-pointer shadow-sm hover:scale-110 transition-transform" onClick={() => setIsLocked(!isLocked)}>
                       {isLocked ? <Lock className="h-3.5 w-3.5 text-zinc-600" /> : <Unlock className="h-3.5 w-3.5 text-zinc-600" />}
                    </div>
                    <H3 className="mb-4">3. Payment Terms</H3>
                    {isLocked ? (
                      <div className="text-sm text-zinc-600 space-y-3 opacity-80 cursor-not-allowed">
                        <p>Client agrees to pay the total amount of <span className="font-mono bg-zinc-100 px-1 rounded border border-zinc-200 shadow-sm font-semibold text-zinc-800">{"{{"}payment.total{"}}"}</span> according to the schedule specified in the Proposal. Standard late fees of 1.5% per month will apply to overdue invoices.</p>
                      </div>
                    ) : (
                      <MinimalEditor
                        content={`<p>Client agrees to pay the total amount of <strong>{{payment.total}}</strong> according to the schedule specified in the Proposal. Standard late fees of 1.5% per month will apply to overdue invoices.</p>`}
                        onChange={() => {}}
                        placeholder="Edit clause..."
                      />
                    )}
                 </Surface>

                 {/* Additional Clause Button */}
                 <div className="flex justify-center mt-6">
                    <Button variant="outline" className="border-dashed h-10 border-2 text-zinc-500 bg-transparent hover:bg-zinc-50 hover:text-zinc-800 hover:border-zinc-300">
                       + Add New Clause Block
                    </Button>
                 </div>

                 {/* e-Signature Block inside builder */}
                 <div className="mt-12 space-y-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3 px-2">
                      Signatures Settings
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {/* Signer 1 (Default Client) */}
                       <Surface className="p-6 border bg-white flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                             <Badge variant="outline" className="bg-zinc-50 text-zinc-600">Primary Client</Badge>
                             <Lock className="h-3 w-3 text-zinc-400" />
                          </div>
                          <div>
                             <div className="text-sm font-semibold text-zinc-900">{"{{"}client.name{"}}"}</div>
                             <div className="text-xs text-zinc-500 mt-1">{"{{"}client.email{"}}"}</div>
                          </div>
                          <div className="mt-4 pt-4 border-t border-zinc-100">
                             <p className="text-xs text-zinc-500 flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Auto-assigned from project</p>
                          </div>
                       </Surface>

                       {/* Add Signer Button */}
                       <button className="rounded-xl border-dashed border-2 border-zinc-200 flex flex-col items-center justify-center p-6 text-zinc-400 hover:text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 transition-all min-h-[140px]">
                          <Users className="h-6 w-6 mb-2" />
                          <span className="text-sm font-medium">Require Counter-Signer</span>
                          <span className="text-[10px] text-zinc-400 mt-1">E.g., You or a team member</span>
                       </button>
                    </div>
                 </div>

              </div>
            )}

            {activeTab === "settings" && (
               <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                 <div className="mb-8 border-b border-zinc-200 pb-6">
                   <H2>Legal Settings</H2>
                   <Muted className="mt-1 text-sm">Configure defaults and automations for this template.</Muted>
                 </div>
                 
                 <Surface className="p-8">
                    <H3 className="text-base mb-6">Template Details</H3>
                    <div className="space-y-6 max-w-md">
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Template Name</label>
                          <input type="text" className="w-full flex h-10 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2" defaultValue="Master Services Agreement" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Internal Description</label>
                          <textarea className="w-full flex rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 min-h-[100px]" defaultValue="Standard MSA for new clients. Includes generic IP assignment and net-30 terms." />
                       </div>
                    </div>
                 </Surface>

                 <Surface className="p-8">
                    <H3 className="text-base mb-6">Default Automations</H3>
                    <div className="space-y-4 max-w-2xl">
                       <div className="flex items-center justify-between border border-zinc-200 p-4 rounded-lg bg-zinc-50/50 hover:bg-zinc-50 transition-colors">
                          <div>
                             <p className="text-sm font-medium text-zinc-900">Auto-Reminders</p>
                             <p className="text-xs text-zinc-500 mt-0.5">Send automatic reminders if unsigned</p>
                          </div>
                          <Badge variant="outline" className="bg-white">3 days before expiry</Badge>
                       </div>
                       <div className="flex items-center justify-between border border-zinc-200 p-4 rounded-lg bg-zinc-50/50 hover:bg-zinc-50 transition-colors">
                          <div>
                             <p className="text-sm font-medium text-zinc-900">Post-Signature Action</p>
                             <p className="text-xs text-zinc-500 mt-0.5">What happens after all parties sign</p>
                          </div>
                          <Button variant="outline" size="sm" className="h-7 text-xs bg-white">Configure Actions</Button>
                       </div>
                    </div>
                 </Surface>

               </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
