/**
 * Browser-safe base URL for BoggersTheAI (via Next.js proxy `/api/boggers/*` or direct URL in dev).
 */
export function getBoggersApiBase(): string {
  const b =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_BOGGERS_API_BASE
      ? process.env.NEXT_PUBLIC_BOGGERS_API_BASE
      : "/api/boggers";
  return b.replace(/\/$/, "");
}

export function boggersUrl(path: string): string {
  const base = getBoggersApiBase();
  const p = path.startsWith("/") ? path : `/${path}`;
  if (base.startsWith("http://") || base.startsWith("https://")) {
    return `${base}${p}`;
  }
  return `${base}${p}`;
}

export function getSessionHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    let sid = localStorage.getItem("boggers-session-id");
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem("boggers-session-id", sid);
    }
    return { "X-Boggers-Session-ID": sid };
  } catch {
    return {};
  }
}

/** Session + optional tenant (hard graph isolation when `NEXT_PUBLIC_BOGGERS_TENANT_ID` is set). */
export function getTenantIdForQuery(): string {
  if (typeof process === "undefined") return "";
  return process.env.NEXT_PUBLIC_BOGGERS_TENANT_ID?.trim() ?? "";
}

export function getBoggersHeaders(): Record<string, string> {
  const h: Record<string, string> = { ...getSessionHeaders() };
  const tenant = getTenantIdForQuery();
  if (tenant) {
    h["X-Boggers-Tenant-ID"] = tenant;
  }
  return h;
}
