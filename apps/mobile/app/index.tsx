import { ActivityIndicator, Text, TextInput, View } from "react-native";
import { styles } from "../src/styles";
import { useClubOs } from "../src/ClubOsContext";
import { AppButton } from "../src/components/AppButton";
import { ScreenShell } from "../src/components/ScreenShell";

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
  } = useClubOs();

  return (
    <ScreenShell>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>1. OTP Login</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="Phone number"
          keyboardType="phone-pad"
          style={styles.input}
        />
        <TextInput
          value={otp}
          onChangeText={setOtp}
          placeholder="6-digit OTP"
          keyboardType="number-pad"
          style={styles.input}
          maxLength={6}
          editable={otpSent}
        />
        <AppButton
          label={otpSent ? "Verify and continue" : "Send OTP"}
          onPress={otpSent ? verifyOtpAndContinue : sendOtp}
          disabled={loading || phone.length < 8 || (otpSent && otp.length < 6)}
        />
        {loading ? <ActivityIndicator color="#0f4fa8" /> : null}
      </View>
    </ScreenShell>
  );
}
