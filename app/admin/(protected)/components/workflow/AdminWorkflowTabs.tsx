"use client";

import Link from "next/link";

interface AdminWorkflowTab {
  label: string;
  value: string;
  count?: number;
  href?: string;
}

interface AdminWorkflowTabsProps {
  tabs: AdminWorkflowTab[];
  activeValue: string;
  onChange?: (value: string) => void;
}

export function AdminWorkflowTabs({ tabs, activeValue, onChange }: AdminWorkflowTabsProps) {
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <div className="inline-flex min-w-full gap-1">
        {tabs.map((tab) => {
          const active = tab.value === activeValue;
          const className = [
            "inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition",
            active
              ? "bg-amber-100 text-amber-900"
              : "text-stone-600 hover:bg-stone-50 hover:text-stone-900",
          ].join(" ");
          const content = (
            <>
              <span>{tab.label}</span>
              {typeof tab.count === "number" ? (
                <span
                  className={[
                    "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold",
                    active ? "bg-amber-700 text-white" : "bg-stone-100 text-stone-500",
                  ].join(" ")}
                >
                  {tab.count}
                </span>
              ) : null}
            </>
          );

          if (tab.href) {
            return (
              <Link key={tab.value} href={tab.href} className={className}>
                {content}
              </Link>
            );
          }

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onChange?.(tab.value)}
              className={className}
            >
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}
