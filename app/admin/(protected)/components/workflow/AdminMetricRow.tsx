import type { ReactNode } from "react";

interface AdminMetricRowProps {
  children: ReactNode;
}

export function AdminMetricRow({ children }: AdminMetricRowProps) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <div className="grid min-w-max grid-flow-col auto-cols-[minmax(172px,1fr)] gap-3 xl:min-w-0 xl:grid-flow-row xl:grid-cols-5">
        {children}
      </div>
    </div>
  );
}
