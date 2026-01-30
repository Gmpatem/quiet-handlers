"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function SuggestionBox({ orderId }: { orderId: string }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "typing" | "saving" | "saved" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);
  const lastSavedRef = useRef<string>(""); // avoid saving same content repeatedly
  const inFlightRef = useRef(false);
  const queuedRef = useRef(false);

  async function saveNow(value: string) {
    const v = value.trim();

    // optional field: if empty, do nothing and reset UI nicely
    if (!v) {
      lastSavedRef.current = "";
      setStatus("idle");
      setErr(null);
      return;
    }

    // do not re-save identical text
    if (v === lastSavedRef.current) {
      setStatus("saved");
      setErr(null);
      return;
    }

    // if a save is already happening, queue one more run
    if (inFlightRef.current) {
      queuedRef.current = true;
      return;
    }

    inFlightRef.current = true;
    setStatus("saving");
    setErr(null);

    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.rpc("submit_order_suggestion", {
        p_order_id: orderId,
        p_suggestion: v,
      });

      if (error) throw error;

      lastSavedRef.current = v;
      setStatus("saved");
      setErr(null);
    } catch (e: any) {
      setStatus("error");
      setErr(e?.message ?? "Failed to save suggestion.");
    } finally {
      inFlightRef.current = false;

      // If user typed again during save, run once more with latest value
      if (queuedRef.current) {
        queuedRef.current = false;
        // small microtask delay keeps UI smooth
        Promise.resolve().then(() => saveNow(text));
      }
    }
  }

  useEffect(() => {
    // cleanup on unmount
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    // user is typing
    setStatus(text.trim() ? "typing" : "idle");
    setErr(null);

    // debounce: wait 1 second after last keystroke
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      saveNow(text);
    }, 1000);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, orderId]);

  return (
    <div className="space-y-2">
      <label htmlFor="suggestions" className="mb-1.5 block text-xs font-semibold text-stone-600">
        Suggestions? (optional)
      </label>

      <textarea
        id="suggestions"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Help us improve..."
        className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder-stone-400 outline-none transition focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
        rows={2}
      />

      <div className="min-h-[16px] text-xs">
        {status === "saving" && <span className="text-stone-500">Saving…</span>}
        {status === "typing" && <span className="text-stone-400">Autosave in 1s…</span>}
        {status === "saved" && <span className="text-emerald-600">Saved ✅</span>}
        {status === "error" && <span className="text-red-600">{err ?? "Failed to save."}</span>}
      </div>
    </div>
  );
}
