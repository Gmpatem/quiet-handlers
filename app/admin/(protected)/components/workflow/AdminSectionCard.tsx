import type { ReactNode } from "react";

interface AdminSectionCardProps {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function AdminSectionCard({
  children,
  header,
  footer,
  className = "",
}: AdminSectionCardProps) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm ${className}`}>
      {header ? <div className="border-b border-stone-200 px-4 py-3">{header}</div> : null}
      {children}
      {footer ? <div className="border-t border-stone-200 bg-stone-50/70 px-4 py-3">{footer}</div> : null}
    </section>
  );
}

