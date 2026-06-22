import type { ButtonHTMLAttributes, ReactNode } from "react";

type AdminActionButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";

interface AdminActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  icon?: ReactNode;
  variant?: AdminActionButtonVariant;
}

const VARIANT_CLASSES: Record<AdminActionButtonVariant, string> = {
  primary:
    "border-amber-700 bg-amber-700 text-white hover:bg-amber-800 focus-visible:ring-amber-700/30",
  secondary:
    "border-stone-200 bg-white text-stone-800 hover:border-amber-200 hover:bg-amber-50 focus-visible:ring-amber-700/20",
  ghost:
    "border-transparent bg-transparent text-stone-600 hover:bg-stone-100 focus-visible:ring-stone-400/20",
  danger:
    "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 focus-visible:ring-red-500/20",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus-visible:ring-emerald-500/20",
};

export function AdminActionButton({
  children,
  icon,
  variant = "secondary",
  className = "",
  type = "button",
  ...props
}: AdminActionButtonProps) {
  return (
    <button
      type={type}
      className={[
        "inline-flex h-9 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold shadow-sm transition",
        "focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60",
        VARIANT_CLASSES[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {icon ? <span className="flex h-4 w-4 items-center justify-center">{icon}</span> : null}
      <span className="truncate">{children}</span>
    </button>
  );
}

