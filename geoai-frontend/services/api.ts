import { supabase } from "@/services/supabaseClient";
import { ensureGuestSession } from "@/services/guest";
import { getApiBaseUrl } from "@/lib/apiBase";

const BASE_URL = getApiBaseUrl();

async function authHeaders(): Promise<Record<string, string>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    console.log("[authHeaders] session:", session?.access_token ? "present" : "null");

    if (session?.access_token) {
      return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      };
    }

    console.log("[authHeaders] falling back to guest session");
    const guestToken = await ensureGuestSession();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${guestToken}`,
    };
  } catch (err) {
    console.error("[authHeaders] THREW:", err);
    throw err;
  }
}

async function parseError(res: Response, endpoint: string): Promise<Error> {
  try {
    const data = await res.json();
    const detail = data?.detail;
    if (typeof detail === "string") return new Error(detail);
    if (Array.isArray(detail)) {
      return new Error(detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join(", "));
    }
  } catch {
    /* ignore */
  }
  return new Error(`HTTP ${res.status} — ${endpoint}`);
}

export const api = {
  get: async (endpoint: string) => {
    const headers = await authHeaders();
    console.log("[api.get]", endpoint);
    const res = await fetch(`${BASE_URL}${endpoint}`, { headers });
    if (!res.ok) throw await parseError(res, endpoint);
    return res.json();
  },

  post: async (endpoint: string, body: object) => {
    const headers = await authHeaders();
    console.log("[api.post]", endpoint, body);
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw await parseError(res, endpoint);
    return res.json();
  },

  postPublic: async (endpoint: string, body: object) => {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw await parseError(res, endpoint);
    return res.json();
  },
};