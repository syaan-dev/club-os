import { Text, View } from "react-native";
import { styles } from "../../src/styles";
import { useClubOs } from "../../src/ClubOsContext";
import { AppButton } from "../../src/components/AppButton";
import { TabScreenShell } from "../../src/components/TabScreenShell";

function SetupRow({
  label,
  meta,
}: {
  label: string;
  meta?: string;
}) {
  return (
    <View style={styles.setupRow}>
      <View style={{ flex: 1, paddingRight: 8 }}>
        <Text style={styles.setupRowLabel}>{label}</Text>
        {meta ? <Text style={styles.setupRowMeta}>{meta}</Text> : null}
      </View>
      <Text style={styles.headerChevron}>›</Text>
    </View>
  );
}

export default function SetupScreen() {
  const { activeClubName, currentRole, onboardName, onboardEmail, logout, loading } =
    useClubOs();

  const isOwner = currentRole === "Owner";

  return (
    <TabScreenShell>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Club</Text>
        <Text style={styles.memberMeta}>{activeClubName || "No club"}</Text>
        <SetupRow label="Club profile" meta="Name, description" />
        <SetupRow label="Dues plans" meta="Manage plans & cycles" />
        {isOwner ? (
          <SetupRow label="Roles & permissions" meta="Owner only" />
        ) : null}
        <SetupRow label="Reminders" meta="Coming soon" />
        {isOwner ? <SetupRow label="Billing" meta="Owner only" /> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your account</Text>
        <SetupRow
          label={onboardName || "Your profile"}
          meta={onboardEmail || undefined}
        />
        <SetupRow label="Leave club" meta="Remove yourself from this club" />
        <AppButton
          label={loading ? "Logging out..." : "Log out"}
          onPress={logout}
          disabled={loading}
        />
      </View>
    </TabScreenShell>
  );
}
