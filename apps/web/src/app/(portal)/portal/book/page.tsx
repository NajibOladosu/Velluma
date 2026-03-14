"use client";

import * as React from "react";
import { H1, H2, H3, Muted, P } from "@/components/ui/typography";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  ArrowLeft,
  Play,
  Check,
  ShieldCheck,
  CreditCard,
  PenLine,
  Package,
} from "lucide-react";

const steps = [
  { key: "welcome", label: "Welcome", icon: Play },
  { key: "packages", label: "Packages", icon: Package },
  { key: "contract", label: "Contract", icon: PenLine },
  { key: "payment", label: "Payment", icon: CreditCard },
] as const;

type StepKey = typeof steps[number]["key"];

const packages = [
  {
    name: "Starter",
    price: "$2,500",
    description: "Perfect for small projects with a focused scope.",
    features: ["Brand Audit", "3 Concept Directions", "1 Revision Round", "Source Files"],
  },
  {
    name: "Professional",
    price: "$5,500",
    description: "Our most popular option for comprehensive projects.",
    features: ["Brand Strategy", "5 Concept Directions", "3 Revision Rounds", "Source Files", "Brand Guidelines", "Social Templates"],
    recommended: true,
  },
  {
    name: "Enterprise",
    price: "$12,000",
    description: "Full-service engagement for complex, multi-phase work.",
    features: ["Brand Strategy", "Unlimited Concepts", "Unlimited Revisions", "Source Files", "Brand Guidelines", "Social Templates", "Motion Package", "Dedicated Support"],
  },
];

function WelcomeStep() {
  return (
    <div className="space-y-8 text-center max-w-lg mx-auto">
      {/* Video Placeholder */}
      <Surface className="aspect-video flex items-center justify-center bg-zinc-50">
        <div className="text-center space-y-3">
          <div className="h-14 w-14 rounded-md bg-zinc-900 flex items-center justify-center mx-auto cursor-pointer hover:bg-zinc-800 transition-colors">
            <Play className="h-6 w-6 text-white ml-0.5" strokeWidth={1.5} />
          </div>
          <Muted className="text-[10px] uppercase tracking-widest">Watch Introduction</Muted>
        </div>
      </Surface>
      <div className="space-y-2">
        <H2 className="text-2xl">Welcome to your project.</H2>
        <P className="text-zinc-500 leading-relaxed">
          We&apos;re excited to work with you. Watch the short video above to learn about our process,
          then select a package that fits your needs.
        </P>
      </div>
    </div>
  );
}

function PackagesStep({ onSelect }: { onSelect: (pkg: string) => void }) {
  const [selected, setSelected] = React.useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <H2 className="text-2xl">Select a package</H2>
        <Muted>Choose the option that best fits your project scope.</Muted>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {packages.map((pkg) => (
          <Surface
            key={pkg.name}
            className={cn(
              "p-6 space-y-4 cursor-pointer transition-colors",
              selected === pkg.name
                ? "border-zinc-900"
                : "hover:border-zinc-300",
              pkg.recommended && !selected && "border-zinc-400"
            )}
            onClick={() => {
              setSelected(pkg.name);
              onSelect(pkg.name);
            }}
          >
            <div className="flex items-center justify-between">
              <H3 className="text-lg">{pkg.name}</H3>
              {pkg.recommended && (
                <Badge variant="outline" className="border-zinc-300 text-zinc-900 text-[10px] font-bold">
                  Recommended
                </Badge>
              )}
            </div>
            <div className="text-3xl font-bold tracking-tighter text-zinc-900">{pkg.price}</div>
            <P className="text-sm text-zinc-500">{pkg.description}</P>
            <Separator />
            <ul className="space-y-2">
              {pkg.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-zinc-600">
                  <Check className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" strokeWidth={1.5} />
                  {feature}
                </li>
              ))}
            </ul>
          </Surface>
        ))}
      </div>
    </div>
  );
}

function ContractStep() {
  const [signed, setSigned] = React.useState(false);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-1">
        <H2 className="text-2xl">Review & Sign</H2>
        <Muted>Please review the agreement below and sign to proceed.</Muted>
      </div>

      <Surface className="p-8 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
            <Muted className="text-[10px] uppercase tracking-widest font-bold">Service Agreement</Muted>
          </div>

          {/* Contract Preview */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-md p-6 max-h-64 overflow-y-auto">
            <div className="space-y-4 text-sm text-zinc-600 leading-relaxed">
              <P className="font-semibold text-zinc-900">1. Scope of Work</P>
              <P>The Service Provider agrees to deliver the selected package as described in the proposal, including all deliverables outlined in the package tier.</P>
              <P className="font-semibold text-zinc-900">2. Payment Terms</P>
              <P>A 50% deposit is required to begin work. The remaining 50% is due upon project completion and final delivery of all assets.</P>
              <P className="font-semibold text-zinc-900">3. Revisions</P>
              <P>The number of revision rounds is determined by the selected package tier. Additional revisions may be purchased at the agreed hourly rate.</P>
              <P className="font-semibold text-zinc-900">4. Intellectual Property</P>
              <P>Upon final payment, all intellectual property rights for deliverables transfer to the Client. Work-in-progress materials remain property of the Service Provider.</P>
            </div>
          </div>
        </div>

        <Separator />

        {/* Signature Area */}
        <div className="space-y-3">
          <Muted className="text-[10px] uppercase tracking-widest font-bold">Digital Signature</Muted>
          {!signed ? (
            <Button
              className="w-full h-11 font-semibold gap-2"
              onClick={() => setSigned(true)}
            >
              <PenLine className="h-4 w-4" strokeWidth={1.5} />
              Sign Agreement
            </Button>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-md border border-zinc-200">
              <Check className="h-5 w-5 text-zinc-900" strokeWidth={2} />
              <div>
                <P className="text-sm font-semibold text-zinc-900">Signed successfully</P>
                <Muted className="text-[10px]">Legally binding digital signature recorded.</Muted>
              </div>
            </div>
          )}
        </div>
      </Surface>

      <div className="text-center">
        <Muted className="text-[10px] uppercase tracking-widest">
          This contract is lawyer-vetted and legally binding.
        </Muted>
      </div>
    </div>
  );
}

function PaymentStep() {
  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center space-y-1">
        <H2 className="text-2xl">Secure Payment</H2>
        <Muted>Complete your deposit to begin the project.</Muted>
      </div>

      <Surface className="p-8 space-y-6">
        {/* Summary */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <P className="text-sm text-zinc-500">Professional Package</P>
            <P className="text-sm font-medium">$5,500</P>
          </div>
          <div className="flex items-center justify-between">
            <P className="text-sm text-zinc-500">Deposit (50%)</P>
            <P className="text-sm font-bold text-zinc-900">$2,750</P>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <P className="text-sm font-bold text-zinc-900">Due Today</P>
            <P className="text-lg font-bold text-zinc-900">$2,750</P>
          </div>
        </div>

        <Button className="w-full h-11 font-semibold gap-2">
          <CreditCard className="h-4 w-4" strokeWidth={1.5} />
          Pay $2,750
        </Button>

        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
          <Muted className="text-[10px] uppercase tracking-widest">
            Secured by Stripe · Escrow Protected
          </Muted>
        </div>
      </Surface>
    </div>
  );
}

export default function BookingPage() {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [selectedPackage, setSelectedPackage] = React.useState<string | null>(null);

  const StepComponent = [
    <WelcomeStep key="welcome" />,
    <PackagesStep key="packages" onSelect={setSelectedPackage} />,
    <ContractStep key="contract" />,
    <PaymentStep key="payment" />,
  ];

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Step Indicator */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <div className="flex items-center justify-between">
            {steps.map((step, i) => (
              <div key={step.key} className="flex items-center gap-2">
                <div className={cn(
                  "h-7 w-7 rounded-md flex items-center justify-center text-xs font-bold transition-colors",
                  i <= currentStep ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-400"
                )}>
                  {i < currentStep ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className={cn(
                  "text-xs font-medium hidden sm:inline",
                  i <= currentStep ? "text-zinc-900" : "text-zinc-400"
                )}>
                  {step.label}
                </span>
                {i < steps.length - 1 && (
                  <div className={cn(
                    "hidden sm:block w-12 h-[1px] ml-2",
                    i < currentStep ? "bg-zinc-900" : "bg-zinc-200"
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 py-12 px-6">
        <div className="mx-auto max-w-4xl">
          {StepComponent[currentStep]}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="border-t border-zinc-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <Button
            variant="outline"
            className="border-zinc-200 gap-2"
            disabled={currentStep === 0}
            onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            className="font-semibold gap-2"
            onClick={() => setCurrentStep((s) => Math.min(steps.length - 1, s + 1))}
          >
            {currentStep === steps.length - 1 ? "Complete" : "Continue"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
