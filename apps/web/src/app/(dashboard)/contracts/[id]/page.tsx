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

type FlowStep = "welcome" | "scope" | "agreement" | "payment";

interface FlowStepDef {
  id: FlowStep;
  label: string;
  icon: React.ElementType;
  description: string;
  isComplete?: boolean;
}

const FLOW_STEPS: FlowStepDef[] = [
  { id: "welcome", label: "Welcome", icon: LayoutTemplate, description: "Personalized intro" },
  { id: "scope", label: "Scope & Value", icon: Briefcase, description: "Deliverables & pricing" },
  { id: "agreement", label: "Contract", icon: FileSignature, description: "Legal terms & signatures" },
  { id: "payment", label: "Payment", icon: CreditCard, description: "Deposit & schedule" },
];

/* ═══════════════════════════════════════════════════════
   PAGE COMPONENT
   ═══════════════════════════════════════════════════════ */

export default function ContractBuilderPage({
  params,
}: {
  params: { id: string };
}) {
  const [activeStep, setActiveStep] = React.useState<FlowStep>("agreement");
  const [isLocked, setIsLocked] = React.useState(true); // Represents "Standardized" template locked state
  
  // Dummy content state
  const [welcomeContent, setWelcomeContent] = React.useState("<h1>Welcome to your project</h1><p>We're excited to get started...</p>");
  const [scopeContent, setScopeContent] = React.useState("<h2>Project Scope</h2><ul><li>Deliverable 1</li><li>Deliverable 2</li></ul>");
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
            <span className="text-zinc-300">/</span>
            <span className="text-sm text-zinc-500">Acme Corp</span>
          </div>
          <Badge variant="outline" className="ml-2 font-mono text-[10px] uppercase tracking-wider text-zinc-500 bg-zinc-50">
            Standardized Template
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="mr-4 flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
             <CheckCircle2 className="h-3.5 w-3.5" />
             Saved
          </div>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-zinc-600">
            <Smartphone className="h-4 w-4" />
            Preview
          </Button>
          <Separator orientation="vertical" className="h-4 mx-1" />
          <Button size="sm" className="h-8 gap-1.5">
            <Send className="h-4 w-4" />
            Share & Send
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 ml-1">
            <MoreVertical className="h-4 w-4 text-zinc-500" />
          </Button>
        </div>
      </header>

      {/* ── Main Layout ── */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar (Flow Navigation) */}
        <aside className="w-64 border-r border-zinc-200 bg-zinc-50/50 p-4 shrink-0 overflow-y-auto hidden md:block">
          <div className="mb-6">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4 px-2">
              Smart File Flow
            </h3>
            <div className="space-y-1 relative">
              {/* Connecting line for flow */}
              <div className="absolute left-6 top-6 bottom-6 w-px bg-zinc-200 -z-10" />

              {FLOW_STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = activeStep === step.id;
                return (
                  <button
                    key={step.id}
                    onClick={() => setActiveStep(step.id)}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all z-10",
                      isActive
                        ? "bg-white shadow-sm border border-zinc-200 ring-1 ring-zinc-900/5"
                        : "hover:bg-zinc-100/80 border border-transparent"
                    )}
                  >
                    <div className={cn(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium bg-white",
                      isActive ? "border-zinc-900 text-zinc-900" : "border-zinc-300 text-zinc-500"
                    )}>
                      {index + 1}
                    </div>
                    <div>
                      <div className={cn(
                        "text-sm font-semibold tracking-tight transition-colors",
                        isActive ? "text-zinc-900" : "text-zinc-600"
                      )}>
                        {step.label}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">
                        {step.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <Separator className="mb-6" />

          {/* Automations Summary */}
           <div className="mb-6 px-2">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3 block">
              Automations
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Sparkles className="h-3.5 w-3.5 mt-0.5 text-indigo-500" />
                <div>
                  <div className="text-xs font-medium text-zinc-900">Auto-Reminders</div>
                  <div className="text-[10px] text-zinc-500 cursor-pointer hover:text-zinc-900">3 days before expiry, then 24 hours</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Sparkles className="h-3.5 w-3.5 mt-0.5 text-indigo-500" />
                <div>
                  <div className="text-xs font-medium text-zinc-900">After Signing</div>
                  <div className="text-[10px] text-zinc-500 cursor-pointer hover:text-zinc-900">Move to 'Active' pipeline & Generate Invoice</div>
                </div>
              </div>
            </div>
           </div>
        </aside>

        {/* Editor Area */}
        <main className="flex-1 overflow-y-auto bg-zinc-50/30">
          <div className="mx-auto max-w-4xl p-8 py-12">
            
            {/* Contextual Top Banner */}
            {activeStep === "agreement" && isLocked && (
               <div className="mb-8 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                 <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                 <div className="flex-1">
                   <h4 className="text-sm font-medium text-emerald-900">Standardized Legal Template Active</h4>
                   <p className="mt-1 text-xs text-emerald-700 leading-relaxed">
                     Core legal clauses are locked to prevent accidental changes that could invalidate the agreement. You can safely fill in Smart Fields and custom scope blocks below.
                   </p>
                 </div>
                 <Button variant="outline" size="sm" className="h-7 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-100" onClick={() => setIsLocked(false)}>
                   <Unlock className="h-3 w-3 mr-1" />
                   Unlock All
                 </Button>
               </div>
            )}

            {/* Smart Fields Overview (Only visible in agreement/scope) */}
            {(activeStep === "scope" || activeStep === "agreement") && (
              <div className="mb-8 p-1">
                 <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3">
                  Smart Fields in use
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-white border-zinc-200 text-zinc-600 text-[10px] font-mono hover:bg-zinc-50 cursor-pointer">
                    {"{{"}client.name{"}}"}
                  </Badge>
                  <Badge variant="outline" className="bg-white border-zinc-200 text-zinc-600 text-[10px] font-mono hover:bg-zinc-50 cursor-pointer">
                    {"{{"}project.deliverables{"}}"}
                  </Badge>
                  <Badge variant="outline" className="bg-white border-zinc-200 text-zinc-600 text-[10px] font-mono hover:bg-zinc-50 cursor-pointer">
                    {"{{"}payment.total{"}}"}
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-5 px-2 text-[10px] text-zinc-400">
                     + Add Custom Field
                  </Button>
                </div>
              </div>
            )}

            {/* Step Content */}
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {activeStep === "welcome" && (
                <Surface className="overflow-hidden">
                  <div className="bg-zinc-900 p-8 text-center text-white aspect-[3/1] flex flex-col items-center justify-center relative group">
                    <H2 className="text-white">Master Services Agreement</H2>
                    <p className="text-zinc-400 mt-2">Prepared for Acme Corp</p>
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                       <Button variant="default" size="sm" className="h-7 text-xs bg-white/10 hover:bg-white/20 text-white border-0">
                          Change Cover Image
                       </Button>
                    </div>
                  </div>
                  <div className="p-8">
                     <MinimalEditor
                       content={welcomeContent}
                       onChange={setWelcomeContent}
                       placeholder="Write a personalized welcome message..."
                       className="min-h-[200px]"
                     />
                  </div>
                </Surface>
              )}

              {activeStep === "scope" && (
                 <Surface className="p-8">
                    <div className="mb-6 flex items-center justify-between border-b border-zinc-100 pb-4">
                      <div>
                        <H3>Project Scope & Value</H3>
                        <Muted className="text-sm mt-1">Define the work and pricing dynamically.</Muted>
                      </div>
                    </div>
                    <MinimalEditor
                       content={scopeContent}
                       onChange={setScopeContent}
                       placeholder="Describe the project scope..."
                       className="min-h-[200px]"
                     />
                 </Surface>
              )}

              {activeStep === "agreement" && (
                 <div className="space-y-6">
                    {/* Render standard clauses representing locked and unlocked sections */}
                    <Surface className="p-8 border-l-4 border-l-zinc-300 relative group">
                       <div className="absolute -left-3 top-4 bg-zinc-100 border border-zinc-200 rounded-full p-1 opacity-100">
                         {isLocked ? <Lock className="h-3 w-3 text-zinc-500" /> : <Unlock className="h-3 w-3 text-zinc-500" />}
                       </div>
                       <H3 className="mb-4">1. Scope of Work (Standardized)</H3>
                       {isLocked ? (
                          <div className="text-sm text-zinc-600 space-y-3 opacity-80 cursor-not-allowed">
                             <p>Provider agrees to perform the services detailed in the "Scope & Value" section of this Smart File. Any expansion of the scope will require a separate written agreement or change order.</p>
                          </div>
                       ) : (
                          <MinimalEditor
                             content={`<p>Provider agrees to perform the services detailed in the "Scope & Value" section of this Smart File. Any expansion of the scope will require a separate written agreement or change order.</p>`}
                             onChange={() => {}}
                             placeholder="Edit clause..."
                          />
                       )}
                    </Surface>

                    <Surface className="p-8 border-l-4 border-l-zinc-900 relative">
                       <div className="absolute -left-3 top-4 bg-zinc-900 border border-zinc-900 rounded-full p-1">
                          <Unlock className="h-3 w-3 text-white" />
                       </div>
                       <H3 className="mb-4 flex justify-between items-center">
                         2. Custom Terms (Editable) 
                         <Button variant="ghost" size="sm" className="h-6 text-xs text-blue-600 hover:bg-blue-50">
                           <Sparkles className="h-3 w-3 mr-1" /> Help me phrase this
                         </Button>
                       </H3>
                       <MinimalEditor
                          content={agreementContent}
                          onChange={setAgreementContent}
                          placeholder="Add custom clauses specific to this client..."
                          className="min-h-[150px]"
                       />
                    </Surface>

                    <Surface className="p-8 border-l-4 border-l-zinc-300 relative">
                       <div className="absolute -left-3 top-4 bg-zinc-100 border border-zinc-200 rounded-full p-1">
                          {isLocked ? <Lock className="h-3 w-3 text-zinc-500" /> : <Unlock className="h-3 w-3 text-zinc-500" />}
                       </div>
                       <H3 className="mb-4">3. Payment Terms</H3>
                       {isLocked ? (
                         <div className="text-sm text-zinc-600 space-y-3 opacity-80 cursor-not-allowed">
                           <p>Client agrees to pay the total amount of <span className="font-mono bg-zinc-100 px-1 rounded">{"{{"}payment.total{"}}"}</span> according to the schedule specified in the Payment section. Standard late fees of 1.5% per month will apply to overdue invoices.</p>
                         </div>
                       ) : (
                         <MinimalEditor
                           content={`<p>Client agrees to pay the total amount of <strong>{{payment.total}}</strong> according to the schedule specified in the Payment section. Standard late fees of 1.5% per month will apply to overdue invoices.</p>`}
                           onChange={() => {}}
                           placeholder="Edit clause..."
                         />
                       )}
                    </Surface>

                    {/* e-Signature Block inside builder */}
                    <div className="mt-12 space-y-4">
                       <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3 px-2">
                         Signatures Required
                       </h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Signer 1 */}
                          <Surface className="p-6 border-dashed border-2 bg-zinc-50/50 flex flex-col gap-4">
                             <div className="flex items-center justify-between">
                                <Badge variant="outline" className="bg-white">Client</Badge>
                                <Button variant="ghost" size="icon" className="h-6 w-6"><X className="h-3 w-3" /></Button>
                             </div>
                             <div>
                                <div className="text-sm font-semibold">David Kim</div>
                                <div className="text-xs text-zinc-500">david.kim@acmecorp.com</div>
                             </div>
                             <div className="mt-4 pt-4 border-t border-zinc-200">
                                <Button variant="outline" className="w-full h-10 border-dashed text-zinc-500">
                                   <FileSignature className="h-4 w-4 mr-2" />
                                   Signature Block
                                </Button>
                             </div>
                          </Surface>

                          {/* Add Signer Button */}
                          <button className="rounded-xl border-dashed border-2 border-zinc-200 flex flex-col items-center justify-center p-6 text-zinc-400 hover:text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 transition-all min-h-[180px]">
                             <Users className="h-6 w-6 mb-2" />
                             <span className="text-sm font-medium">Add Signer</span>
                             <span className="text-[10px] uppercase tracking-wider font-bold mt-1">Multi-Party Supported</span>
                          </button>
                       </div>
                    </div>
                 </div>
              )}

              {activeStep === "payment" && (
                <div className="space-y-6">
                  <Surface className="p-8">
                     <H3 className="mb-6">Deposit & Sequence</H3>
                     <p className="text-sm text-zinc-600 mb-6 font-medium">Require a deposit upon signing to secure the project.</p>

                     <div className="space-y-4 max-w-sm">
                        <div className="flex items-center justify-between border rounded-lg p-4 bg-zinc-50 border-zinc-200">
                           <div className="flex items-center gap-3">
                              <div className="bg-white p-2 rounded border border-zinc-200 shadow-sm">
                                <CreditCard className="h-4 w-4 text-zinc-700" />
                              </div>
                              <div>
                                 <div className="text-sm font-semibold">Initial Deposit</div>
                                 <div className="text-xs text-zinc-500">Upon signing</div>
                              </div>
                           </div>
                           <div className="text-sm font-bold text-zinc-900">50%</div>
                        </div>
                        <div className="flex items-center justify-between border gap-4 rounded-lg p-4 border-zinc-200 bg-white shadow-sm opacity-50">
                           <div className="flex items-center gap-3">
                              <div className="bg-zinc-100 p-2 rounded border border-zinc-200">
                                <Clock className="h-4 w-4 text-zinc-400" />
                              </div>
                              <div>
                                 <div className="text-sm font-semibold">Final Payment</div>
                                 <div className="text-xs text-zinc-500">Milestone: Project Completion</div>
                              </div>
                           </div>
                           <div className="text-sm font-bold text-zinc-900">50%</div>
                        </div>
                     </div>
                  </Surface>

                  {/* Payment settings */}
                  <div className="flex items-center justify-between bg-zinc-900 text-white rounded-lg p-4 px-6 shadow-sm">
                     <div className="flex items-center gap-3">
                       <ShieldCheck className="h-5 w-5 text-zinc-300" />
                       <div>
                         <div className="text-sm font-semibold">Stripe Processing Active</div>
                         <div className="text-xs text-zinc-400">Cards, ACH, and Apple Pay enabled</div>
                       </div>
                     </div>
                     <Button variant="outline" size="sm" className="h-8 bg-white/10 text-white hover:bg-white/20 border-0">
                        Settings
                     </Button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Step Navigation */}
            <div className="mt-12 flex items-center justify-between pt-6 border-t border-zinc-200">
               {FLOW_STEPS.findIndex(s => s.id === activeStep) > 0 ? (
                 <Button 
                   variant="ghost" 
                   onClick={() => setActiveStep(FLOW_STEPS[FLOW_STEPS.findIndex(s => s.id === activeStep) - 1].id)}
                 >
                   <ArrowLeft className="h-4 w-4 mr-2" /> Back
                 </Button>
               ) : (
                 <div />
               )}
               
               {FLOW_STEPS.findIndex(s => s.id === activeStep) < FLOW_STEPS.length - 1 ? (
                 <Button 
                   className="font-semibold"
                   onClick={() => setActiveStep(FLOW_STEPS[FLOW_STEPS.findIndex(s => s.id === activeStep) + 1].id)}
                 >
                   Next: {FLOW_STEPS[FLOW_STEPS.findIndex(s => s.id === activeStep) + 1].label} <ChevronRight className="h-4 w-4 ml-1" />
                 </Button>
               ) : (
                 <Button className="font-semibold bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-sm gap-2 px-6">
                   <Send className="h-4 w-4" /> Finalize & Send
                 </Button>
               )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
