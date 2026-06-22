"use client";

import type { ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";
import { AdminActionButton } from "./AdminActionButton";

interface AdminConfirmModalProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "warning" | "success";
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

const TONE_CLASSES = {
  danger: "border-red-200 bg-red-50 text-red-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export function AdminConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "warning",
  onConfirm,
  onClose,
}: AdminConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-950/35 p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close confirmation"
        onClick={onClose}
      />
      <section className="relative w-full max-w-md overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl border ${TONE_CLASSES[tone]}`}>
              <AlertTriangle className="h-4 w-4" />
            </span>
            <h2 className="text-base font-semibold text-stone-950">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-500 transition hover:bg-stone-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {description ? (
          <div className="px-5 py-4 text-sm leading-6 text-stone-600">{description}</div>
        ) : null}
        <div className="flex items-center justify-end gap-2 border-t border-stone-200 bg-stone-50/70 px-5 py-4">
          <AdminActionButton variant="secondary" onClick={onClose}>
            {cancelLabel}
          </AdminActionButton>
          <AdminActionButton
            variant={tone === "danger" ? "danger" : tone === "success" ? "success" : "primary"}
            onClick={() => void onConfirm()}
          >
            {confirmLabel}
          </AdminActionButton>
        </div>
      </section>
    </div>
  );
}

