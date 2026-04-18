import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface DetailPageHeaderProps {
  backHref: string;
  backLabel: string;
  title: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function DetailPageHeader({
  backHref,
  backLabel,
  title,
  meta,
  actions,
  className,
}: DetailPageHeaderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        {backLabel}
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 min-w-0">
            {title}
          </div>
          {meta && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground min-w-0">
              {meta}
            </div>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export function MetaSeparator() {
  return <span className="text-zinc-300">•</span>;
}
