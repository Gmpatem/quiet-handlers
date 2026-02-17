"use client";

import { useMemo, useState, useTransition } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Setting = {
  key: string;
  value: any; // jsonb
};

type Meta = {
  key: string;
  section: string;
  label: string;
  description: string | null;
  input_type: "text" | "textarea" | "number" | "money_cents" | "toggle" | "json" | string;
  sort_order: number;
};

function peso(cents: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format((cents ?? 0) / 100);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
        <div className="text-lg font-semibold">{title}</div>
      </div>
      <div className="p-5 grid gap-4">{children}</div>
    </div>
  );
}

function FieldShell({
  label,
  description,
  children,
}: {
  label: string;
  description?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div>
        <div className="text-sm font-semibold text-slate-900">{label}</div>
        {description ? <div className="mt-1 text-xs text-slate-500">{description}</div> : null}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export default function SettingsClient({
  initialSettings,
  initialMeta,
}: {
  initialSettings: Setting[];
  initialMeta: Meta[];
}) {
  const [isPending, startTransition] = useTransition();
  const [settings, setSettings] = useState<Setting[]>(initialSettings);

  const metaByKey = useMemo(() => {
    const m = new Map<string, Meta>();
    for (const row of initialMeta ?? []) m.set(row.key, row);
    return m;
  }, [initialMeta]);

  const merged = useMemo(() => {
    return (settings ?? []).map((s) => {
      const meta = metaByKey.get(s.key);
      return {
        setting: s,
        meta: meta ?? {
          key: s.key,
          section: "General",
          label: s.key,
          description: null,
          input_type: guessInputType(s.key, s.value),
          sort_order: 100,
        },
      };
    });
  }, [settings, metaByKey]);

  const sections = useMemo(() => {
    const map = new Map<string, { setting: Setting; meta: Meta }[]>();
    for (const row of merged) {
      const sec = row.meta.section || "General";
      map.set(sec, [...(map.get(sec) ?? []), row]);
    }
    const result = Array.from(map.entries()).map(([sec, rows]) => {
      rows.sort((a, b) => (a.meta.sort_order ?? 100) - (b.meta.sort_order ?? 100) || a.meta.label.localeCompare(b.meta.label));
      return [sec, rows] as const;
    });
    result.sort((a, b) => (a[0] === "General" ? 1 : b[0] === "General" ? -1 : a[0].localeCompare(b[0])));
    return result;
  }, [merged]);

  function updateLocal(key: string, patch: Partial<Setting>) {
    setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  function saveValue(key: string, value: any) {
    startTransition(async () => {
      const supabase = supabaseBrowser();
      const { error } = await supabase.from("app_settings").update({ value }).eq("key", key);
      if (error) alert(`Failed to save ${key}: ${error.message}`);
    });
  }

  function renderInput(s: Setting, m: Meta) {
    const inputType = (m.input_type || "text").toLowerCase();

    if (inputType === "toggle") {
      const checked = typeof s.value === "boolean" ? s.value : String(s.value).toLowerCase() === "true";
      return (
        <FieldShell label={m.label} description={m.description}>
          <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
            <span className="text-sm text-slate-700">Enabled</span>
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => {
                updateLocal(s.key, { value: e.target.checked });
                saveValue(s.key, e.target.checked);
              }}
            />
          </label>
        </FieldShell>
      );
    }

    if (inputType === "money_cents") {
      const cents = typeof s.value === "number" ? s.value : Number(s.value ?? 0);
      const php = (Number.isFinite(cents) ? cents : 0) / 100;

      return (
        <FieldShell label={m.label} description={m.description ?? "Stored as cents (integer)"}>
          <div className="grid gap-2">
            <div className="text-xs text-slate-500">
              Current: <span className="font-semibold">{peso(cents)}</span>
            </div>
            <input
              type="number"
              step="0.01"
              defaultValue={php.toFixed(2)}
              onBlur={(e) => {
                const n = Number(e.target.value);
                const next = Number.isFinite(n) ? Math.round(n * 100) : 0;
                updateLocal(s.key, { value: next });
                saveValue(s.key, next);
              }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="e.g. 10.00"
            />
          </div>
        </FieldShell>
      );
    }

    if (inputType === "number") {
      const num = typeof s.value === "number" ? s.value : Number(s.value ?? 0);
      return (
        <FieldShell label={m.label} description={m.description}>
          <input
            type="number"
            defaultValue={Number.isFinite(num) ? num : 0}
            onBlur={(e) => {
              const n = Number(e.target.value);
              const next = Number.isFinite(n) ? n : 0;
              updateLocal(s.key, { value: next });
              saveValue(s.key, next);
            }}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </FieldShell>
      );
    }

    if (inputType === "textarea") {
      const str = typeof s.value === "string" ? s.value : (s.value ?? "").toString();
      return (
        <FieldShell label={m.label} description={m.description}>
          <textarea
            defaultValue={str}
            onBlur={(e) => {
              const next = e.target.value;
              updateLocal(s.key, { value: next });
              saveValue(s.key, next);
            }}
            className="h-28 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </FieldShell>
      );
    }

    if (inputType === "json") {
      const pretty = JSON.stringify(s.value ?? {}, null, 2);
      return (
        <FieldShell label={m.label} description={m.description ?? "Advanced JSON setting"}>
          <textarea
            defaultValue={pretty}
            onBlur={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                updateLocal(s.key, { value: parsed });
                saveValue(s.key, parsed);
              } catch {
                alert(`Invalid JSON for ${s.key}`);
              }
            }}
            className="h-44 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs"
          />
        </FieldShell>
      );
    }

    const str = typeof s.value === "string" ? s.value : (s.value ?? "").toString();
    return (
      <FieldShell label={m.label} description={m.description}>
        <input
          defaultValue={str}
          onBlur={(e) => {
            const next = e.target.value;
            updateLocal(s.key, { value: next });
            saveValue(s.key, next);
          }}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
      </FieldShell>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Settings CMS</h1>
        <p className="mt-1 text-sm text-slate-600">
          Change public UI + wizard rules here. No code edits needed.
        </p>
      </div>

      {isPending && (
        <div className="mb-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
          Saving…
        </div>
      )}

      <div className="grid gap-6">
        {sections.map(([sectionName, rows]) => (
          <Section key={sectionName} title={sectionName}>
            {rows.map(({ setting, meta }) => (
              <div key={setting.key}>{renderInput(setting, meta)}</div>
            ))}
          </Section>
        ))}
      </div>
    </div>
  );
}

function guessInputType(key: string, value: any): string {
  const k = (key ?? "").toLowerCase();
  if (k.startsWith("enable_") || k.endsWith("_enabled") || k.startsWith("show_")) return "toggle";
  if (k.endsWith("_cents")) return "money_cents";
  if (typeof value === "boolean") return "toggle";
  if (typeof value === "number") return "number";
  if (typeof value === "string") return value.length > 80 ? "textarea" : "text";
  if (value && typeof value === "object") return "json";
  return "text";
}
