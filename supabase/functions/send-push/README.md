# Push Notifications — Setup & Triggering

This service delivers notifications to devices **while the app is backgrounded or
closed** using **Expo Push** → **FCM (Android)** / **APNs (iOS)**. The flow:

```
event (meeting/poll/dues)        notifications row
   └── DB trigger ──────────────────┐
                                     ▼
                          dispatch_push_notification()  (pg_net)
                                     ▼
                       send-push Edge Function (shared secret)
                                     ▼
                    Expo Push Service  ──►  FCM / APNs  ──►  device
```

The `notifications` table is the source of truth (also powers the in-app
inbox); `device_push_tokens` stores each device's Expo token.

---

## 1. EAS Project ID

### What it is

The **EAS (Expo Application Services) project ID** is a UUID that uniquely
identifies your app's project on Expo's servers. `getExpoPushTokenAsync()`
**requires** it — Expo uses it to scope and route push tokens to the correct
project. Without it, the client cannot mint an Expo push token (our
[`src/push.ts`](../../../apps/mobile/src/push.ts) returns `null`).

It lives in [`app.json`](../../../apps/mobile/app.json) at
`expo.extra.eas.projectId` (currently the placeholder
`REPLACE_WITH_EAS_PROJECT_ID`).

### How to get it

**Option A — create/link via the CLI (recommended):**

```bash
cd apps/mobile

# Log in to your Expo account (create a free one at https://expo.dev if needed)
npx eas login

# Creates the EAS project (if missing), writes the projectId into app.json,
# and sets the owner/slug. Safe to run on an existing project (it links).
npx eas init
```

After this, `app.json` will contain the real id, e.g.:

```jsonc
"extra": {
  "eas": {
    "projectId": "a1b2c3d4-5678-90ab-cdef-1234567890ab"
  }
}
```

**Option B — from the dashboard:** go to <https://expo.dev> → your account →
**Projects** → select the project → the **Project ID** (UUID) is shown in the
project settings. Paste it into `app.json` manually.

> The id is **not a secret** — it's safe to commit. It is tied to your Expo
> account/organization, so use the account that will own the production app.

---

## 2. FCM and APNs

Expo Push does not deliver to phones directly — it is a thin relay in front of
the two platform push gateways. You still need credentials for each platform.

### FCM — Firebase Cloud Messaging (Android)

- Google's push gateway for Android. Expo forwards your Android messages to FCM,
  which wakes the app / shows the notification.
- **Mandatory for Android.** Expo cannot deliver to Android without *your* FCM
  credentials.
- **What you need:** a Firebase project, then a service-account key (FCM **v1**).
  - Firebase console → **Project settings** → **Service accounts** → *Generate
    new private key* → upload it to EAS:
    ```bash
    cd apps/mobile
    eas credentials            # Android → Push Notifications → upload FCM v1 key
    ```
  - Add the app's `google-services.json` (Firebase console → *Add Android app*,
    package `com.syaan.clubos`) at `apps/mobile/google-services.json`. It is
    already referenced by `android.googleServicesFile` in `app.json`.

### APNs — Apple Push Notification service (iOS)

- Apple's push gateway for iOS. Expo forwards your iOS messages to APNs.
- **Requires a paid Apple Developer account** ($99/yr). EAS can generate and
  manage the APNs key for you.
- **What you need:** an **APNs Auth Key** (`.p8`) tied to your Apple Developer
  account, plus the app's `bundleIdentifier` (already set to `com.syaan.clubos`).
  ```bash
  cd apps/mobile
  eas credentials            # iOS → Push Notifications → let EAS create the key
  ```

### Key takeaways

| | Android | iOS |
| --- | --- | --- |
| Gateway | FCM | APNs |
| Cost | Free (Firebase) | Paid Apple Developer account |
| Credential | FCM v1 service-account key + `google-services.json` | APNs `.p8` auth key |
| Managed by | EAS credentials | EAS credentials |
| Required for any delivery | Yes | Yes |

> **Remote push requires a real EAS build** (`eas build`) — it does **not** work
> in Expo Go (Android remote push was removed from Expo Go in SDK 53+).

---

## 3. Triggering a notification

You normally do **not** call `send-push` by hand — inserting/updating the right
row fires the DB triggers, which create a `notifications` row, which dispatches
the push automatically. Below are the ways to trigger one, simplest first.

### Prerequisites for actual delivery

1. A device that registered a token (signed in on a real build → row in
   `device_push_tokens`).
2. Function env `PUSH_WEBHOOK_SECRET` set, and the database configured. Hosted
   Supabase denies custom `app.settings.*` GUCs (ERROR 42501) for both `alter
   database` and `alter role`, so config lives in **Supabase Vault**. Run once
   in the SQL editor:
   ```sql
   select vault.create_secret('https://<your-ref>.supabase.co', 'edge_url');
   select vault.create_secret('<same-secret-as-PUSH_WEBHOOK_SECRET>', 'push_webhook_secret');
   ```
   The dispatch trigger reads these via `vault.decrypted_secrets`, so no session
   reconnect is needed. To rotate, `delete from vault.secrets where name = '...'`
   then recreate. When `edge_url` is absent (local/dev), the in-app notification
   is still stored but no push is dispatched.

### A. The natural path — create an activity (fires triggers)

Any of these inserts fans out a notification to every active member (except the
creator) and dispatches a push:

```sql
-- A new meeting → 'meeting_scheduled' to all other active members
insert into public.club_meetings (club_id, title, scheduled_at, created_by)
values ('<club-uuid>', 'AGM 2026', now() + interval '7 days', '<creator-member-uuid>');

-- A new announcement → 'announcement'
insert into public.club_announcements (club_id, title, body, created_by)
values ('<club-uuid>', 'Clubhouse closed Friday', 'Maintenance day.', '<creator-member-uuid>');
```

In the mobile app this happens automatically via the existing context calls —
e.g. `createMeeting(...)`, `createPoll(...)`, `createAnnouncement(...)` — no push
code at the call site.

### B. Insert a notification directly (skip the event, still pushes)

Useful for ad-hoc or custom notifications. The `notifications` insert trigger
dispatches the push:

```sql
insert into public.notifications
  (club_id, recipient_member_id, type, title, body, data)
values
  ('<club-uuid>', '<recipient-member-uuid>', 'custom',
   'Welcome to Club OS', 'Tap to explore your club.',
   jsonb_build_object('screen', 'home'));
```

Or fan out to a whole club using the helper:

```sql
select public.notify_club_members(
  '<club-uuid>',
  'custom',
  'Season kickoff',
  'First training is this Saturday at 9am.',
  jsonb_build_object('screen', 'activity')
);
```

### C. Call the `send-push` function directly (bypass the DB)

For testing delivery in isolation. The `Authorization` header **must** equal
`Bearer <PUSH_WEBHOOK_SECRET>`. The body mirrors a DB-webhook payload:

```bash
curl -i -X POST 'https://<your-ref>.supabase.co/functions/v1/send-push' \
  -H "Authorization: Bearer $PUSH_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "record": {
      "id": "00000000-0000-0000-0000-000000000000",
      "club_id": "<club-uuid>",
      "recipient_member_id": "<recipient-member-uuid>",
      "type": "custom",
      "title": "Direct test push",
      "body": "Sent straight to send-push.",
      "data": { "screen": "home" }
    }
  }'
# → { "sent": 1, "invalidated": 0 }
```

### D. Raw Expo test (no Supabase at all)

To verify a single device token end-to-end against Expo, grab the token from
`device_push_tokens` and:

```bash
curl -i -X POST 'https://exp.host/--/api/v2/push/send' \
  -H "Content-Type: application/json" \
  -d '{
    "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    "title": "Hello",
    "body": "Expo direct test",
    "sound": "default"
  }'
```

You can also paste a token into Expo's web tester:
<https://expo.dev/notifications>.

---

## Deploying `send-push`

```bash
cd functions

# Deploy the function WITHOUT JWT verification (the shared secret is the gate)
npx supabase functions deploy send-push --no-verify-jwt

# Set the shared secret used by both the function and the DB dispatch trigger
npx supabase secrets set PUSH_WEBHOOK_SECRET='<generate-a-strong-random-value>'
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically in the
hosted Edge runtime.
