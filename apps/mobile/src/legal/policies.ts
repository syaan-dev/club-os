import * as WebBrowser from "expo-web-browser";

// Public, hosted policy pages. These same URLs must also be set in the Apple
// App Store and Google Play store listings. Replace the placeholders once the
// pages are published (see docs/legal/*_DRAFT.md for the source content).
export const TERMS_URL = "https://clubos.app/legal/terms";
export const PRIVACY_URL = "https://clubos.app/legal/privacy";

// Version strings recorded against each consent in `policy_acceptances`. Bump
// these (and re-host the page) whenever the corresponding policy changes.
export const TERMS_VERSION = "2026-06-29";
export const PRIVACY_VERSION = "2026-06-29";
export const AGE_GATE_VERSION = "2026-06-29";

export async function openTerms(): Promise<void> {
  await WebBrowser.openBrowserAsync(TERMS_URL);
}

export async function openPrivacy(): Promise<void> {
  await WebBrowser.openBrowserAsync(PRIVACY_URL);
}
