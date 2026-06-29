# Legal Disclaimers, Hosted Policies & Consent Records (DPDP Act 2023)

> **Status:** Implementation plan + reference. The legal text in `docs/legal/` is a
> **DRAFT and not legal advice** — have it reviewed by a qualified Indian lawyer before launch.

## 1. Goal

Replace the three placeholder "Terms and Privacy Policy" mentions in the app (which today
link to nothing) with:

1. **Real, publicly hosted** Terms of Service and Privacy Policy pages, opened from the app in
   the in-app browser.
2. An **18+ age gate** merged into the onboarding consent checkbox (the app handles money via
   Stripe, so we restrict to adults rather than building a parental-consent flow).
3. An **auditable, versioned consent record** in the database.

Target jurisdiction: **India — Digital Personal Data Protection Act, 2023 (DPDP Act)**.

## 2. Why the current state is a legal / store risk

- **App Store / Play rejection.** Apple App Store Review Guideline 5.1.1(i) and the Google Play
  *User Data* policy both require a working, publicly reachable privacy-policy link — in the
  store listing **and** accessible from inside the app. Unlinked "Terms and Privacy Policy"
  text gets builds rejected.
- **DPDP non-compliance.** We collect personal data (phone, name, email, city, skills, avatar
  photo, **device contacts**, push tokens, and **payment** records). The DPDP Act requires the
  Data Fiduciary to give the Data Principal an itemized **Notice** and obtain **free, specific,
  informed, unconditional and unambiguous consent** *before* collection, with an easy way to
  withdraw it. Collecting contacts + payment data without this is a clear gap.
- **Unenforceable / misrepresentative terms.** Telling users they "agree to our Terms" when no
  Terms exist is both unenforceable and misleading.

## 3. Personal data inventory (basis for the Privacy Notice)

| Data | Where it lives | Purpose | Source |
| --- | --- | --- | --- |
| Phone number | `auth.users`, `members.phone` | Login (OTP), member identity | User |
| Name | `members.name`, auth metadata | Member directory, identity | User |
| Email | `members.email`, auth metadata | Notifications, verification | User |
| City / location | `members.location` | Directory enrichment (optional) | User |
| Skills / interests | `members.skills` | Directory enrichment (optional) | User |
| Avatar photo | `avatars` storage bucket (public), `members.avatar_url` | Profile picture | User |
| Device contacts (name + phone) | Read on-demand for invites; not stored in bulk | Invite contacts to a club | Device, with permission |
| Push token + platform | `device_push_tokens` | Send push notifications | Device |
| Dues, transactions, payment links | `member_dues`, `transactions`, `due_payment_links` | Club finances, payment collection | App + Stripe |
| Audit events | `audit_events` | Security / accountability | App |
| Consent records | `policy_acceptances` (new) | Prove lawful consent | App |

### Processors / third parties (for the Notice)

- **Supabase** — database, auth, storage, edge functions (data hosting / processing).
- **Stripe** — UPI + card payment processing (India/INR).
- **Expo / EAS push → Apple APNs / Google FCM** — push notification delivery.
- **Apple / Google** — app distribution and push transport.

## 4. DPDP content the Privacy Notice MUST contain

- Itemized **categories** of personal data and the **purpose** for each.
- **Legal basis = consent** (and how to **withdraw** it as easily as it was given).
- **Data Principal rights**: access, correction, erasure, grievance redressal, nominate.
- **Data Fiduciary identity** + **Grievance Officer** name and contact *(placeholder until
  the legal entity / contact is finalised — blocks final launch)*.
- **Retention** policy and **third-party processors** + any cross-border transfer.
- **Security safeguards** and **personal-data-breach** handling.
- **Children**: we restrict the service to **18+** (see §6); the policy states this.

## 5. Where disclaimers are shown in the app

| Screen | File | Today | After |
| --- | --- | --- | --- |
| Login / OTP | `app/index.tsx` | Plain footer text | Tappable Terms + Privacy links (in-app browser) |
| Owner onboarding | `app/profile-setup.tsx` | Non-tappable consent text | Tappable links + merged 18+ copy |
| Invitee onboarding | `app/member-profile.tsx` | Non-tappable consent text | Tappable links + merged 18+ copy |
| Setup tab | `app/(tabs)/setup.tsx` | — | New "Legal" section: Terms, Privacy, your rights, Grievance Officer |

## 6. Age gate (18+)

Because the app processes payments, we restrict it to adults instead of building a
verifiable-parental-consent flow. The single onboarding consent checkbox copy becomes:

> "I confirm I am 18 or older and agree to the Terms and Privacy Policy."

The checkbox still gates the submit button. On completion we record an `age_18_plus`
acceptance row alongside `terms` and `privacy`. The Terms of Service also state the 18+
requirement.

## 7. How consent is saved

A new append-only, versioned table **`policy_acceptances`** (migration
`202606290001_policy_acceptances.sql`). One row per policy accepted, per acceptance event —
history is never mutated. Withdrawal is recorded as a new row / a `withdrawn_at` stamp, never
by deleting.

### What information we save (per row)

| Column | Meaning |
| --- | --- |
| `id` | PK |
| `user_id` | Who consented (`auth.users`) |
| `policy_type` | `terms` \| `privacy` \| `age_18_plus` |
| `policy_version` | Which version of that policy was accepted |
| `content_hash` | Optional hash of the exact text shown (nullable; reserved for offline bundling) |
| `accepted_at` | When |
| `method` | Context, e.g. `onboarding` |
| `app_version` | App build that captured consent |
| `platform` | `ios` \| `android` \| `web` |
| `locale` | Optional UI locale |
| `withdrawn_at` | Set when consent is withdrawn (nullable) |

We deliberately **do not** store IP address (data minimization). The existing
`terms_accepted_at` auth-metadata stamp is kept as a convenience mirror.

### RLS

- `SELECT` — self only (`user_id = auth.uid()`).
- `INSERT` — self only (`with check user_id = auth.uid()`).
- **No** `UPDATE` / `DELETE` policy → rows are immutable from the client (audit integrity).

## 8. Hosting the policy pages

The DRAFT text in `docs/legal/` is the source for two public web pages (e.g. GitHub Pages or
Supabase static hosting). The live URLs go into `src/legal/policies.ts` **and** the Apple /
Google store listings — the same URL serves both. Until hosted, `policies.ts` carries
placeholder URLs.

## 9. Implementation map

- `supabase/migrations/202606290001_policy_acceptances.sql` — table + RLS.
- `apps/mobile/src/legal/policies.ts` — URLs, versions, `openTerms()` / `openPrivacy()`.
- `apps/mobile/src/data/policies.ts` — `recordPolicyConsent(userId, method)` insert helper.
- `apps/mobile/app/index.tsx`, `app/profile-setup.tsx`, `app/member-profile.tsx` — tappable
  links + merged 18+ copy.
- `apps/mobile/src/ClubOsContext.tsx` — record consent on onboarding completion.
- `apps/mobile/app/(tabs)/setup.tsx` — Legal section.

## 10. Open items before launch (placeholders today)

1. **Legal entity name** + **Grievance Officer** name and email in the policies.
2. **Hosted policy URLs** (replace placeholders in `policies.ts` and store listings).
3. **Lawyer review** of the DRAFT Terms and Privacy Policy.
4. Optional: re-consent prompt when a policy version is bumped (deferred).
