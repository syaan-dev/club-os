import { Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { styles } from "../styles";
import { useClubOs } from "../ClubOsContext";

export function ClubSwitchSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { myClubs, clubId, switchClub, navigate } = useClubOs();

  const handleSelect = async (targetClubId: string, name: string) => {
    onClose();
    await switchClub(targetClubId, name);
  };

  const handleCreateOrJoin = () => {
    onClose();
    navigate("home");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Switch club</Text>
          <ScrollView
            style={{ maxHeight: 360 }}
            contentContainerStyle={{ gap: 10 }}
            showsVerticalScrollIndicator={false}
          >
            {myClubs.length === 0 ? (
              <Text style={styles.memberMeta}>
                You are not part of any club yet.
              </Text>
            ) : (
              myClubs.map((club) => {
                const active = club.clubId === clubId;
                return (
                  <Pressable
                    key={club.clubId}
                    style={[styles.switchRow, active && styles.switchRowActive]}
                    onPress={() => handleSelect(club.clubId, club.name)}
                    accessibilityRole="button"
                    accessibilityLabel={`Switch to ${club.name}`}
                  >
                    <View style={styles.avatar}>
                      {club.logoUrl ? (
                        <Image
                          source={{ uri: club.logoUrl }}
                          style={styles.avatarImage}
                        />
                      ) : (
                        <Text style={styles.avatarText}>
                          {club.name.charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.headerClubName}>{club.name}</Text>
                      <Text style={styles.headerRole}>{club.role}</Text>
                    </View>
                    {active ? <Text style={styles.switchCheck}>✓</Text> : null}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
          <Pressable
            style={styles.button}
            onPress={handleCreateOrJoin}
            accessibilityRole="button"
            accessibilityLabel="Create or join a club"
          >
            <Text style={styles.buttonText}>Create or join a club</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
