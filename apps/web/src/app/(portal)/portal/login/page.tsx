"use client";

import * as React from "react";
import { H1, Muted, P } from "@/components/ui/typography";
import { Surface } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, ArrowRight, Mail } from "lucide-react";

export default function PortalLoginPage() {
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setSent(true);
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Brand Mark */}
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 bg-zinc-900 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-white" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <H1 className="text-xl">Client Portal</H1>
            <Muted className="mt-1">Secure access to your project.</Muted>
          </div>
        </div>

        {!sent ? (
          <Surface className="p-8 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <Input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 bg-white border-zinc-200 text-sm"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-11 font-semibold gap-2">
                Send Magic Link
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </form>
            <P className="text-[10px] text-zinc-400 text-center leading-relaxed uppercase tracking-widest">
              No password required. We&apos;ll send a secure link to your inbox.
            </P>
          </Surface>
        ) : (
          <Surface className="p-8 text-center space-y-4">
            <div className="h-12 w-12 rounded-md bg-zinc-100 flex items-center justify-center mx-auto">
              <Mail className="h-6 w-6 text-zinc-900" strokeWidth={1.5} />
            </div>
            <div>
              <P className="font-semibold text-zinc-900">Check your inbox</P>
              <Muted className="mt-1 text-sm">
                We sent a secure link to <span className="font-medium text-zinc-900">{email}</span>
              </Muted>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-200 text-xs"
              onClick={() => setSent(false)}
            >
              Try a different email
            </Button>
          </Surface>
        )}

        {/* Trust footer */}
        <div className="text-center">
          <Muted className="text-[10px] uppercase tracking-widest leading-loose">
            Protected by 256-bit encryption.
          </Muted>
        </div>
      </div>
    </div>
  );
}
