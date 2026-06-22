"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

interface AdminDetailDrawerProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  onClose: () => void;
}

export function AdminDetailDrawer({
  open,
  title,
  description,
  footer,
  children,
  onClose,
}: AdminDetailDrawerProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        className="absolute inset-0 bg-stone-950/35"
        onClick={onClose}
        aria-label="Close drawer overlay"
      />
      <aside className="absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-sm sm:max-w-xl lg:max-w-2xl">
        <header className="flex items-start justify-between border-b border-stone-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-stone-950">{title}</h2>
            {description ? <div className="mt-1 text-sm text-stone-500">{description}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-200 p-1.5 text-stone-500 transition hover:bg-stone-50"
            aria-label="Close drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? <footer className="border-t border-stone-200 bg-stone-50/80 px-5 py-4">{footer}</footer> : null}
      </aside>
    </div>
  );
}

