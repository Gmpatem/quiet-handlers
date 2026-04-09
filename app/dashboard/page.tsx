import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Legacy /dashboard route - permanently redirects to /admin
 * 
 * This prevents redirect loops from stale bookmarks or external links
 * that still reference /dashboard. Uses 308 (permanent redirect) so
 * browsers and caches update to the new location.
 */
export default function DashboardRedirectPage() {
  redirect("/admin");
}
