import { ActivityIndicator, Text, TextInput, View } from "react-native";
import { styles } from "../src/styles";
import { useClubOs } from "../src/ClubOsContext";
import { AppButton } from "../src/components/AppButton";
import { ScreenShell } from "../src/components/ScreenShell";

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
    <ScreenShell>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>2. Join club and complete profile</Text>
        <Text style={styles.memberMeta}>
          Invited to: {pendingClubName || "Your club"}
        </Text>
        <TextInput
          value={onboardName}
          onChangeText={setOnboardName}
          placeholder="Full name"
          style={styles.input}
        />
        <TextInput
          value={onboardEmail}
          onChangeText={setOnboardEmail}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />
        <TextInput
          value={onboardLocation}
          onChangeText={setOnboardLocation}
          placeholder="Location / City (optional)"
          style={styles.input}
        />
        <TextInput
          value={onboardSkills}
          onChangeText={setOnboardSkills}
          placeholder="Skills / Interests (optional)"
          style={styles.input}
        />
        <AppButton
          label="Complete onboarding"
          onPress={completeMemberOnboarding}
          disabled={loading || !onboardName.trim() || !onboardEmail.trim()}
        />
        {loading ? <ActivityIndicator color="#0f4fa8" /> : null}
      </View>
    </ScreenShell>
  );
}
