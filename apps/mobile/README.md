# Mobile App (Phase 1)

Minimal Expo skeleton for the onboarding flow in README order:

1. OTP login
2. Club creation
3. Member list
4. Dues dashboard

## Run locally

From this folder:

```bash
npm install
npm run start
```

Then open the Expo QR link in Expo Go (or press `i` / `a` for simulator targets).

## Supabase setup (OTP + club creation)

Create a local environment file from the sample:

```bash
cp .env.example .env
```

Set values in `.env`:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Current app behavior:

- OTP screen sends and verifies phone OTP using Supabase Auth.
- Club creation inserts into `clubs` and bootstraps owner row in `members`.
- Member and dues screens are still Phase 1 skeletons.

## Local Supabase setup notes

Use these values for local development:

- `EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY=<your local anon key>`

Ensure SMS auth is enabled in `supabase/config.toml`:

- `[auth.sms]`
- `enable_signup = true`

For deterministic OTP testing, keep this mapping in `supabase/config.toml`:

- `[auth.sms.test_otp]`
- `919876543210 = "123456"`

After changing Supabase config, restart local services:

```bash
supabase stop
supabase start
```

Local OTP test flow:

1. Enter phone: `+919876543210`
2. Tap `Send OTP`
3. Enter OTP: `123456`
4. Tap `Verify and continue`

## Android Play Store build

Yes, this app can be shipped to Google Play.

- Play Store upload artifact: `.aab` (Android App Bundle)
- Direct install/testing artifact: `.apk`

### One-time setup

```bash
npm install
npx eas login
npx eas build:configure
```

### Build artifacts

```bash
npm run build:android
npm run build:android:apk
```

### Submit to Play Store

```bash
npm run submit:android
```

## Automated testing

### Unit/flow tests (Jest)

From this folder:

```bash
npm install
npm run test
```

For watch mode:

```bash
npm run test:watch
```

Current test file:

- `__tests__/App.test.tsx`

### Mobile E2E flow (Maestro)

Install Maestro CLI (one-time):

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

Run Expo app on simulator/device, then execute:

```bash
maestro test .maestro/member-onboarding-flow.yaml
```

Current Maestro flow covers:

1. OTP login
2. Membership request screen
3. Accept request
4. Complete profile
5. Landing on membership desk
