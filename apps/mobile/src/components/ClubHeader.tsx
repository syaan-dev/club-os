import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { styles } from "../styles";
import { useClubOs } from "../ClubOsContext";
import { ClubSwitchSheet } from "./ClubSwitchSheet";

export function ClubHeader() {
  const { activeClubName, currentRole, members } = useClubOs();
  const [sheetVisible, setSheetVisible] = useState(false);

  const name = activeClubName || "Select a club";
  const initial = name.charAt(0).toUpperCase();
  const memberCount = members.length;
  const subtitle =
    `${currentRole || "Member"}` +
    (memberCount > 0
      ? ` · ${memberCount} member${memberCount === 1 ? "" : "s"}`
      : "");

  return (
    <View style={styles.headerBar}>
      <Pressable
        style={styles.headerClub}
        onPress={() => setSheetVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Switch club"
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={{ flexShrink: 1 }}>
          <Text style={styles.headerClubName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.headerRole}>{subtitle}</Text>
        </View>
        <Text style={styles.headerChevron}>⌄</Text>
      </Pressable>
      <ClubSwitchSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
      />
    </View>
  );
}
