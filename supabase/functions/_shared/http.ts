import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "./cors.ts";
import { ValidationError } from "./validation.ts";

export type JsonResponseInit = {
  status?: number;
};

export function jsonResponse(
  payload: unknown,
  init: JsonResponseInit = {},
): Response {
  return new Response(JSON.stringify(payload), {
    status: init.status ?? 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, { status });
}

// Builds a Supabase client bound to the CALLER's JWT so that all queries run
// under the caller's identity and Row Level Security. This is the safe default:
// the Edge Function never escalates beyond what the user could do directly.
export function getClientForRequest(req: Request): SupabaseClient {
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  return createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getAuthedUser(client: SupabaseClient) {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    throw new AuthError("Authentication required");
  }
  return data.user;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

// Wraps a POST handler with shared concerns: CORS preflight, method guard,
// JSON body parsing, and uniform error mapping.
export function handlePost(
  handler: (
    body: Record<string, unknown>,
    req: Request,
  ) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }
    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    let body: Record<string, unknown> = {};
    if (req.headers.get("content-length") !== "0") {
      try {
        body = (await req.json()) as Record<string, unknown>;
      } catch {
        return errorResponse("Invalid JSON body", 400);
      }
    }

    try {
      return await handler(body, req);
    } catch (err) {
      if (err instanceof ValidationError) {
        return errorResponse(err.message, 422);
      }
      if (err instanceof AuthError) {
        return errorResponse(err.message, 401);
      }
      const message = err instanceof Error ? err.message : "Unexpected error";
      return errorResponse(message, 400);
    }
  };
}

// Best-effort audit trail write. Never throws — auditing must not break the
// primary mutation.
export async function writeAudit(
  client: SupabaseClient,
  params: {
    clubId: string;
    actorMemberId?: string | null;
    eventType: string;
    entityType: string;
    entityId?: string | null;
    eventData?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await client.from("audit_events").insert({
      club_id: params.clubId,
      actor_member_id: params.actorMemberId ?? null,
      event_type: params.eventType,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      event_data: params.eventData ?? {},
    });
  } catch {
    // swallow — auditing is best effort
  }
}
