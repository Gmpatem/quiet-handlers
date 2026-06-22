export function formatCompactLocation(location: string | null | undefined): string {
  const raw = String(location ?? "").trim();
  if (!raw) return "-";

  const normalized = raw.replace(/[_-]+/g, " ").replace(/\s+/g, " ").toLowerCase();
  const dorm = normalized.match(/^(boys|girls)\s+dorm(?:\s+(.+))?$/i);

  if (dorm) {
    const prefix = dorm[1] === "boys" ? "BD" : "GD";
    const suffix = dorm[2]?.trim();
    return suffix ? `${prefix} ${suffix.toUpperCase()}` : prefix;
  }

  if (/^delivery\b/i.test(normalized)) return "DEL";
  if (/^pickup\b/i.test(normalized)) return "PU";

  return raw;
}
