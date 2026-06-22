import type { ReactNode } from "react";

interface SummaryRow {
  label: string;
  value: ReactNode;
}

interface AdminRightRailProps {
  title?: ReactNode;
  statusBadge?: ReactNode;
  summaryRows?: SummaryRow[];
  actions?: ReactNode;
  children?: ReactNode;
  emptyState?: ReactNode;
}

export function AdminRightRail({
  title,
  statusBadge,
  summaryRows = [],
  actions,
  children,
  emptyState,
}: AdminRightRailProps) {
  return (
    <aside className="sticky top-4 hidden max-h-[calc(100vh-2rem)] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm xl:flex xl:flex-col">
      {title ? (
        <div className="flex items-start justify-between gap-3 border-b border-stone-200 px-4 py-4">
          <div className="min-w-0">{title}</div>
          {statusBadge}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {title ? (
          <>
            {summaryRows.length > 0 ? (
              <dl className="space-y-3">
                {summaryRows.map((row) => (
                  <div key={row.label} className="flex items-start justify-between gap-3 text-sm">
                    <dt className="text-stone-500">{row.label}</dt>
                    <dd className="text-right font-medium text-stone-950">{row.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {children ? <div className="mt-4">{children}</div> : null}
          </>
        ) : (
          emptyState ?? (
            <div className="flex min-h-64 items-center justify-center text-center text-sm text-stone-500">
              Select an item to preview details.
            </div>
          )
        )}
      </div>

      {actions && title ? (
        <div className="space-y-2 border-t border-stone-200 bg-stone-50/70 px-4 py-4">{actions}</div>
      ) : null}
    </aside>
  );
}

