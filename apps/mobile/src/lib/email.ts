import * as Linking from "expo-linking";

// Where Supabase sends the user after they click the email-confirmation link.
// Deep-links back into the app via the `clubos://` scheme. Wrapped in try/catch
// because Linking.createURL can throw under the Jest test runner.
export function emailRedirectUrl(): string | undefined {
  try {
    return Linking.createURL("verify-email");
  } catch {
    return undefined;
  }
}
