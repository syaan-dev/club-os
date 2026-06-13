import { ActivityIndicator, Text, TextInput, View } from "react-native";
import { styles } from "../src/styles";
import { useClubOs } from "../src/ClubOsContext";
import { AppButton } from "../src/components/AppButton";
import { ScreenShell } from "../src/components/ScreenShell";

export default function ClubScreen() {
  const {
    clubName,
    setClubName,
    clubDescription,
    setClubDescription,
    loading,
    createClub,
  } = useClubOs();

  return (
    <ScreenShell>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>2. Create your club workspace</Text>
        <TextInput
          value={clubName}
          onChangeText={setClubName}
          placeholder="Club name"
          style={styles.input}
        />
        <TextInput
          value={clubDescription}
          onChangeText={setClubDescription}
          placeholder="Description"
          style={styles.input}
        />
        <AppButton
          label="Create club workspace"
          onPress={createClub}
          disabled={loading || !clubName.trim() || !clubDescription.trim()}
        />
        {loading ? <ActivityIndicator color="#0f4fa8" /> : null}
      </View>
    </ScreenShell>
  );
}
