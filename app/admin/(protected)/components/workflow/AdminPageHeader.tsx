import type { ReactNode } from "react";

interface AdminPageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}

export function AdminPageHeader({
  title,
  subtitle,
  description,
  eyebrow,
  primaryAction,
  secondaryActions,
  actions,
  children,
}: AdminPageHeaderProps) {
  const supportingText = subtitle ?? description;

  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="text-2xl font-bold tracking-tight text-stone-950">{title}</h1>
        {supportingText ? <p className="mt-1 max-w-2xl text-sm text-stone-600">{supportingText}</p> : null}
        {children}
      </div>
      {(actions || primaryAction || secondaryActions) ? (
        <div className="flex flex-wrap items-center gap-2">
          {actions ?? (
            <>
              {secondaryActions}
              {primaryAction}
            </>
          )}
        </div>
      ) : null}
    </header>
  );
}
