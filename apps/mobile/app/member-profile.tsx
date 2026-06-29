import { useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import { styles, colors } from "../src/styles";
import { useProfile, useMembers, useUi } from "../src/context/domainHooks";
import { AppButton } from "../src/components/AppButton";
import { OnboardingShell } from "../src/components/OnboardingShell";
import { openPrivacy, openTerms } from "../src/legal/policies";

export default function MemberProfileScreen() {
  const { pendingClubName } = useMembers();
  const {
    onboardName,
    setOnboardName,
    onboardEmail,
    setOnboardEmail,
    onboardLocation,
    setOnboardLocation,
    onboardSkills,
    setOnboardSkills,
    onboardAvatarUrl,
    uploadingAvatar,
    pickAndUploadAvatar,
    completeMemberOnboarding,
  } = useProfile();
  const { loading } = useUi();

  const [agreed, setAgreed] = useState(false);

  return (
    <OnboardingShell showLoading>
      <View style={styles.authCard}>
        <Text style={styles.authHeading}>Join the club</Text>
        <Text style={styles.authSubtext}>
          Invited to {pendingClubName || "your club"} — complete your profile to
          continue.
        </Text>
        <Pressable
          style={styles.avatarPicker}
          onPress={pickAndUploadAvatar}
          disabled={uploadingAvatar}
          accessibilityRole="button"
          accessibilityLabel="Add a profile photo"
        >
          <View style={styles.avatarPickerCircle}>
            {onboardAvatarUrl ? (
              <Image
                source={{ uri: onboardAvatarUrl }}
                style={styles.avatarPickerImage}
              />
            ) : (
              <Text style={styles.avatarPickerGlyph}>＋</Text>
            )}
          </View>
          <Text style={styles.avatarPickerHint}>
            {uploadingAvatar
              ? "Uploading…"
              : onboardAvatarUrl
                ? "Change photo"
                : "Add photo"}
          </Text>
        </Pressable>
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
        <Pressable
          style={styles.consentRow}
          onPress={() => setAgreed((prev) => !prev)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreed }}
          accessibilityLabel="Confirm you are 18 or older and agree to the terms and privacy policy"
        >
          <View style={[styles.consentBox, agreed && styles.consentBoxChecked]}>
            {agreed ? <Text style={styles.consentTick}>✓</Text> : null}
          </View>
          <Text style={styles.consentText}>
            I confirm I am 18 or older and agree to the{" "}
            <Text style={styles.consentLink} onPress={openTerms}>
              Terms
            </Text>{" "}
            and{" "}
            <Text style={styles.consentLink} onPress={openPrivacy}>
              Privacy Policy
            </Text>
            .
          </Text>
        </Pressable>
        <AppButton
          label="Complete onboarding"
          onPress={completeMemberOnboarding}
          disabled={
            loading || !agreed || !onboardName.trim() || !onboardEmail.trim()
          }
        />
      </View>
    </OnboardingShell>
  );
}
