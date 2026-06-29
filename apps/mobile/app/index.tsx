import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { styles, colors } from "../src/styles";
import { useAuth } from "../src/context/domainHooks";
import { AppButton } from "../src/components/AppButton";
import { Logo } from "../src/components/Logo";
import { openPrivacy, openTerms } from "../src/legal/policies";

export default function OtpScreen() {
  const {
    phone,
    setPhone,
    otp,
    setOtp,
    otpSent,
    loading,
    sendOtp,
    verifyOtpAndContinue,
  } = useAuth();

  const submitDisabled =
    loading || phone.length < 8 || (otpSent && otp.length < 6);

  return (
    <SafeAreaView style={styles.authSafe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.authScroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.authLogoWrap}>
            <Logo size={76} />
          </View>

          <View style={styles.authCard}>
            <Text style={styles.authHeading}>
              {otpSent ? "Enter code" : "Sign in"}
            </Text>
            <Text style={styles.authSubtext}>
              {otpSent
                ? `We sent a 6-digit code to ${phone}.`
                : "Enter your phone number to receive a one-time code."}
            </Text>

            {!otpSent ? (
              <>
                <Text style={styles.inputLabel}>Phone number</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Phone number"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  returnKeyType="done"
                  style={styles.input}
                  editable={!loading}
                />
              </>
            ) : (
              <>
                <Text style={styles.inputLabel}>Verification code</Text>
                <TextInput
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="6-digit OTP"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  style={styles.input}
                  maxLength={6}
                  autoFocus
                  editable={!loading}
                />
              </>
            )}

            <AppButton
              label={otpSent ? "Verify and continue" : "Send OTP"}
              onPress={otpSent ? verifyOtpAndContinue : sendOtp}
              disabled={submitDisabled}
            />

            {otpSent ? (
              <Pressable
                onPress={sendOtp}
                disabled={loading}
                style={{ alignItems: "center", paddingVertical: 4 }}
              >
                <Text style={styles.inviteLinkText}>Resend code</Text>
              </Pressable>
            ) : null}

            {loading ? <ActivityIndicator color={colors.accent} /> : null}
          </View>

          <Text style={styles.authFooter}>
            By continuing you agree to our{" "}
            <Text style={styles.consentLink} onPress={openTerms}>
              Terms
            </Text>{" "}
            and{" "}
            <Text style={styles.consentLink} onPress={openPrivacy}>
              Privacy Policy
            </Text>
            .
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
