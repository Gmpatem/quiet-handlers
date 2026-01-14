import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SuccessPage(props: { params: Promise<{ code?: string }> }) {
  const { code = "" } = await props.params;

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-3xl border border-slate-200 p-6 sm:p-8">
          <h1 className="text-xl font-semibold">Order received ✅</h1>

          <p className="mt-2 text-sm text-slate-600">
            Thank you! We’ll start packing it now.
          </p>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold text-slate-600">Your order code</div>
            <div className="mt-1 text-lg font-semibold tracking-wide">{code || "—"}</div>
            <div className="mt-2 text-xs text-slate-500">
              Tip: screenshot this code so it’s easy to show later.
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-600">
            If you enjoyed TenPesoRun, share it with a classmate or your roommate. Small campus, big cravings 🤝
          </p>

          <div className="mt-8 flex gap-2">
            <Link
              href="/"
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-semibold hover:bg-slate-50"
            >
              Back to store
            </Link>
            <Link
              href="/checkout"
              className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-slate-800"
            >
              New order
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
