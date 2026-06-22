"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

interface AdminFormModalProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  onClose: () => void;
}

export function AdminFormModal({
  open,
  title,
  description,
  footer,
  children,
  onClose,
}: AdminFormModalProps) {
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
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-stone-950/35 p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close modal overlay"
        onClick={onClose}
      />
      <section className="relative flex h-full w-full flex-col bg-white shadow-sm sm:h-auto sm:max-h-[85vh] sm:max-w-[620px] sm:rounded-2xl sm:border sm:border-stone-200">
        <header className="sticky top-0 z-10 flex items-start justify-between border-b border-stone-200 bg-white px-5 py-4 sm:rounded-t-2xl">
          <div>
            <h2 className="text-lg font-semibold text-stone-950">{title}</h2>
            {description ? <div className="mt-1 text-sm text-stone-500">{description}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-500 transition hover:bg-stone-100"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? <footer className="sticky bottom-0 border-t border-stone-200 bg-stone-50/80 px-5 py-4">{footer}</footer> : null}
      </section>
    </div>
  );
}
