import { Text, TextInput, View } from "react-native";
import { styles, colors } from "../src/styles";
import { useClubOs } from "../src/ClubOsContext";
import { AppButton } from "../src/components/AppButton";
import { OnboardingShell } from "../src/components/OnboardingShell";

export default function MemberProfileScreen() {
  const {
    pendingClubName,
    onboardName,
    setOnboardName,
    onboardEmail,
    setOnboardEmail,
    onboardLocation,
    setOnboardLocation,
    onboardSkills,
    setOnboardSkills,
    loading,
    completeMemberOnboarding,
  } = useClubOs();

  return (
    <OnboardingShell showLoading>
      <View style={styles.authCard}>
        <Text style={styles.authHeading}>Join the club</Text>
        <Text style={styles.authSubtext}>
          Invited to {pendingClubName || "your club"} — complete your profile to
          continue.
        </Text>
        <TextInput
          value={onboardName}
          onChangeText={setOnboardName}
          placeholder="Full name"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <TextInput
          value={onboardEmail}
          onChangeText={setOnboardEmail}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />
        <TextInput
          value={onboardLocation}
          onChangeText={setOnboardLocation}
          placeholder="City (optional)"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <TextInput
          value={onboardSkills}
          onChangeText={setOnboardSkills}
          placeholder="Skills or interests (optional)"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <AppButton
          label="Complete onboarding"
          onPress={completeMemberOnboarding}
          disabled={loading || !onboardName.trim() || !onboardEmail.trim()}
        />
      </View>
    </OnboardingShell>
  );
}
