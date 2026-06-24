import { Image, Pressable, Text, TextInput, View } from "react-native";
import { styles, colors } from "../src/styles";
import { useClubOs } from "../src/ClubOsContext";
import { AppButton } from "../src/components/AppButton";
import { OnboardingShell } from "../src/components/OnboardingShell";

export default function ClubScreen() {
  const {
    clubName,
    setClubName,
    clubDescription,
    setClubDescription,
    clubLogoUrl,
    uploadingClubLogo,
    pickAndUploadClubLogo,
    loading,
    createClub,
  } = useClubOs();

  return (
    <OnboardingShell showLoading>
      <View style={styles.authCard}>
        <Text style={styles.authHeading}>Create a club</Text>
        <Pressable
          style={styles.avatarPicker}
          onPress={pickAndUploadClubLogo}
          disabled={uploadingClubLogo}
          accessibilityRole="button"
          accessibilityLabel="Add a club logo"
        >
          <View style={styles.avatarPickerCircle}>
            {clubLogoUrl ? (
              <Image
                source={{ uri: clubLogoUrl }}
                style={styles.avatarPickerImage}
              />
            ) : (
              <Text style={styles.avatarPickerGlyph}>＋</Text>
            )}
          </View>
          <Text style={styles.avatarPickerHint}>
            {uploadingClubLogo
              ? "Uploading…"
              : clubLogoUrl
                ? "Change logo"
                : "Add logo"}
          </Text>
        </Pressable>
        <Text style={styles.inputLabel}>Club name</Text>
        <TextInput
          value={clubName}
          onChangeText={setClubName}
          placeholder="Club name"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <Text style={styles.inputLabel}>Description</Text>
        <TextInput
          value={clubDescription}
          onChangeText={setClubDescription}
          placeholder="What's this club about?"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <AppButton
          label="Create club"
          onPress={createClub}
          disabled={loading || !clubName.trim() || !clubDescription.trim()}
        />
      </View>
    </OnboardingShell>
  );
}
