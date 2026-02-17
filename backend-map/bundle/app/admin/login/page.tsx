"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = supabaseBrowser();

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      // After login, go to the protected admin dashboard route:
      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-stone-50 via-white to-amber-50/30">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-lg">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-stone-600 to-amber-900 font-bold text-white shadow-md">
              FDS
            </div>
            <h1 className="text-xl font-semibold text-stone-900">Admin Login</h1>
          </div>
          <p className="text-sm text-stone-600">
            Sign in to manage products, orders, settings, and analytics.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-stone-900">Email</label>
            <input
              className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-stone-900 outline-none transition focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@tenpesorun.com"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-stone-900">Password</label>
            <input
              className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-stone-900 outline-none transition focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-amber-700 to-amber-900 px-4 py-2 font-semibold text-white shadow-md transition hover:from-amber-800 hover:to-amber-950 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <div className="text-xs text-stone-500">
            Tip: only accounts with <code className="rounded bg-stone-100 px-1.5 py-0.5 text-amber-800">profiles.is_admin = true</code> should access protected pages.
          </div>
        </form>
      </div>
    </div>
  );
}
