import type { ReactNode } from "react";

type AdminMetricTone = "neutral" | "success" | "warning" | "danger" | "info" | "amber";

interface AdminMetricCardProps {
  label: string;
  value: ReactNode;
  helper?: ReactNode;
  icon?: ReactNode;
  tone?: AdminMetricTone;
  trend?: ReactNode;
}

const TONE_CLASSES: Record<AdminMetricTone, string> = {
  neutral: "bg-stone-50 text-stone-600 border-stone-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
  amber: "bg-amber-50 text-amber-800 border-amber-200",
};

export function AdminMetricCard({
  label,
  value,
  helper,
  icon,
  tone = "neutral",
  trend,
}: AdminMetricCardProps) {
  return (
    <section className="min-h-[92px] min-w-[172px] rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold uppercase tracking-wide text-stone-500">
            {label}
          </div>
          <div className="mt-1.5 text-xl font-bold tabular-nums text-stone-950">{value}</div>
        </div>
        {icon ? (
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${TONE_CLASSES[tone]}`}>
            {icon}
          </div>
        ) : null}
      </div>
      {(helper || trend) ? (
        <div className="mt-2 flex min-h-4 items-center justify-between gap-2 text-xs text-stone-500">
          {helper ? <span className="truncate">{helper}</span> : <span />}
          {trend ? <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 font-semibold text-stone-600">{trend}</span> : null}
        </div>
      ) : null}
    </section>
  );
}
