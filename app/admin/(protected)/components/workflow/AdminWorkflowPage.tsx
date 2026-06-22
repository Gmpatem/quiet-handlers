import type { ReactNode } from "react";

interface AdminWorkflowPageProps {
  header?: ReactNode;
  metrics?: ReactNode;
  tabs?: ReactNode;
  filters?: ReactNode;
  rightRail?: ReactNode;
  modalLayer?: ReactNode;
  modals?: ReactNode;
  main?: ReactNode;
  children?: ReactNode;
}

export function AdminWorkflowPage({
  header,
  metrics,
  tabs,
  filters,
  rightRail,
  modalLayer,
  modals,
  main,
  children,
}: AdminWorkflowPageProps) {
  const content = main ?? children;

  return (
    <div className="min-h-full bg-stone-50/70 px-3 py-4 sm:px-5 lg:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
        {header}
        {metrics}
        {tabs}
        {filters}
        <div
          className={
            rightRail
              ? "grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]"
              : "grid min-w-0 gap-4"
          }
        >
          <div className="min-w-0 overflow-hidden">{content}</div>
          {rightRail}
        </div>
      </div>
      {modalLayer ?? modals}
    </div>
  );
}
