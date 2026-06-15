// send-push: system-to-system delivery of a single notification to the
// recipient's registered Expo push tokens. Invoked by the database dispatch
// trigger (dispatch_push_notification) when a notifications row is inserted.
//
// Auth: this function is NOT called with a user JWT. It authenticates the
// caller with a shared secret (PUSH_WEBHOOK_SECRET) carried in the
// Authorization header, then uses a service-role client to read tokens and
// prune dead ones. Deploy with `--no-verify-jwt` (the shared secret is the
// gate). Expo relays the message to FCM (Android) / APNs (iOS).
import { corsHeaders } from "../_shared/cors.ts";
import { errorResponse, getServiceClient, jsonResponse } from "../_shared/http.ts";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type NotificationRecord = {
  id?: string;
  club_id?: string;
  recipient_member_id?: string;
  type?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown> | null;
};

type ExpoMessage = {
  to: string;
  sound: "default";
  title: string;
  body: string;
  data: Record<string, unknown>;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  // Shared-secret gate. Only the DB dispatch trigger (or an admin) knows it.
  const secret = Deno.env.get("PUSH_WEBHOOK_SECRET") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return errorResponse("Unauthorized", 401);
  }

  let body: { record?: NotificationRecord };
  try {
    body = (await req.json()) as { record?: NotificationRecord };
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const record = body.record;
  if (!record?.recipient_member_id) {
    return errorResponse("Missing notification record", 422);
  }

  const client = getServiceClient();

  // Resolve the recipient member -> auth user.
  const { data: member } = await client
    .from("members")
    .select("user_id")
    .eq("id", record.recipient_member_id)
    .maybeSingle();

  if (!member?.user_id) {
    return jsonResponse({ sent: 0, reason: "recipient has no linked user" });
  }

  const { data: tokens } = await client
    .from("device_push_tokens")
    .select("token")
    .eq("user_id", member.user_id);

  if (!tokens || tokens.length === 0) {
    return jsonResponse({ sent: 0, reason: "no registered devices" });
  }

  const messages: ExpoMessage[] = tokens.map((t) => ({
    to: t.token as string,
    sound: "default",
    title: record.title ?? "Club OS",
    body: record.body ?? "",
    data: {
      ...(record.data ?? {}),
      notificationId: record.id,
      clubId: record.club_id,
      type: record.type,
    },
  }));

  let result: { data?: Array<{ status?: string; details?: { error?: string } }> } = {};
  try {
    const resp = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages),
    });
    result = await resp.json();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Expo push request failed";
    return errorResponse(message, 502);
  }

  // Prune tokens Expo reports as no longer registered.
  const tickets = result.data ?? [];
  const invalid: string[] = [];
  tickets.forEach((ticket, i) => {
    if (
      ticket?.status === "error" &&
      ticket?.details?.error === "DeviceNotRegistered" &&
      messages[i]
    ) {
      invalid.push(messages[i].to);
    }
  });

  if (invalid.length > 0) {
    await client.from("device_push_tokens").delete().in("token", invalid);
  }

  return jsonResponse({ sent: messages.length, invalidated: invalid.length });
});
