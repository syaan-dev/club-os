import { useState } from "react";
import { Alert, Modal, Pressable, Text, TextInput, View } from "react-native";
import { styles } from "../../src/styles";
import { useClubOs } from "../../src/ClubOsContext";
import { AppButton } from "../../src/components/AppButton";
import { TabScreenShell } from "../../src/components/TabScreenShell";

function SetupRow({
  label,
  meta,
  onPress,
  disabled,
}: {
  label: string;
  meta?: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={styles.setupRow}
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={label}
    >
      <View style={{ flex: 1, paddingRight: 8 }}>
        <Text style={styles.setupRowLabel}>{label}</Text>
        {meta ? <Text style={styles.setupRowMeta}>{meta}</Text> : null}
      </View>
      {onPress ? <Text style={styles.headerChevron}>›</Text> : null}
    </Pressable>
  );
}

export default function SetupScreen() {
  const {
    activeClubName,
    currentRole,
    onboardName,
    setOnboardName,
    onboardEmail,
    setOnboardEmail,
    onboardLocation,
    setOnboardLocation,
    onboardSkills,
    setOnboardSkills,
    clubName,
    setClubName,
    clubDescription,
    setClubDescription,
    loadClubProfile,
    loadMyProfile,
    updateClubProfile,
    saveProfile,
    leaveClub,
    logout,
    loading,
  } = useClubOs();

  const isOwner = currentRole === "Owner";
  // Club profile, roles & permissions and billing are leadership-only.
  const canManageClub =
    currentRole === "Owner" ||
    currentRole === "Treasurer" ||
    currentRole === "Secretary";

  const [clubSheetOpen, setClubSheetOpen] = useState(false);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);

  const openClubSheet = async () => {
    await loadClubProfile();
    setClubSheetOpen(true);
  };

  const openProfileSheet = async () => {
    await loadMyProfile();
    setProfileSheetOpen(true);
  };

  const onSaveClub = async () => {
    await updateClubProfile(clubName, clubDescription);
    setClubSheetOpen(false);
  };

  const onSaveProfile = async () => {
    await saveProfile();
    setProfileSheetOpen(false);
  };

  const confirmLeave = () => {
    Alert.alert(
      "Leave club",
      `Remove yourself from ${activeClubName || "this club"}? You'll need a new invite to rejoin.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => {
            void leaveClub();
          },
        },
      ],
    );
  };

  return (
    <TabScreenShell>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Club</Text>
        <Text style={styles.memberMeta}>{activeClubName || "No club"}</Text>
        {canManageClub ? (
          <SetupRow
            label="Club profile"
            meta="Name, description"
            onPress={openClubSheet}
          />
        ) : null}
        <SetupRow label="Reminders" meta="Coming soon" />
        {canManageClub ? <SetupRow label="Billing" meta="Coming soon" /> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your account</Text>
        <SetupRow
          label={onboardName || "Your profile"}
          meta={onboardEmail || "Edit your details"}
          onPress={openProfileSheet}
        />
        {!isOwner ? (
          <SetupRow
            label="Leave club"
            meta="Remove yourself from this club"
            onPress={confirmLeave}
          />
        ) : null}
        <AppButton
          label={loading ? "Logging out..." : "Log out"}
          onPress={logout}
          disabled={loading}
        />
      </View>

      {/* Club profile sheet (owner only) */}
      <Modal
        visible={clubSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setClubSheetOpen(false)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setClubSheetOpen(false)}
        >
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Club profile</Text>
            <Text style={styles.sheetLabel}>Club name</Text>
            <TextInput
              value={clubName}
              onChangeText={setClubName}
              placeholder="Club name"
              placeholderTextColor={styles.setupRowMeta.color}
              style={styles.input}
            />
            <Text style={styles.sheetLabel}>Description</Text>
            <TextInput
              value={clubDescription}
              onChangeText={setClubDescription}
              placeholder="What is this club about?"
              placeholderTextColor={styles.setupRowMeta.color}
              style={[styles.input, { minHeight: 72 }]}
              multiline
            />
            <AppButton
              label={loading ? "Saving..." : "Save changes"}
              onPress={onSaveClub}
              disabled={loading || !clubName.trim()}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Your profile sheet (any member) */}
      <Modal
        visible={profileSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setProfileSheetOpen(false)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setProfileSheetOpen(false)}
        >
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Your profile</Text>
            <Text style={styles.sheetLabel}>Name</Text>
            <TextInput
              value={onboardName}
              onChangeText={setOnboardName}
              placeholder="Your name"
              placeholderTextColor={styles.setupRowMeta.color}
              style={styles.input}
            />
            <Text style={styles.sheetLabel}>Email</Text>
            <TextInput
              value={onboardEmail}
              onChangeText={setOnboardEmail}
              placeholder="you@email.com"
              placeholderTextColor={styles.setupRowMeta.color}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
            <Text style={styles.sheetLabel}>Location (optional)</Text>
            <TextInput
              value={onboardLocation}
              onChangeText={setOnboardLocation}
              placeholder="City"
              placeholderTextColor={styles.setupRowMeta.color}
              style={styles.input}
            />
            <Text style={styles.sheetLabel}>Skills (optional)</Text>
            <TextInput
              value={onboardSkills}
              onChangeText={setOnboardSkills}
              placeholder="e.g. accounting, events"
              placeholderTextColor={styles.setupRowMeta.color}
              style={styles.input}
            />
            <AppButton
              label={loading ? "Saving..." : "Save profile"}
              onPress={onSaveProfile}
              disabled={loading || !onboardName.trim() || !onboardEmail.trim()}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </TabScreenShell>
  );
}
