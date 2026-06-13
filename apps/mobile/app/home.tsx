import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { styles } from "../src/styles";
import { useClubOs } from "../src/ClubOsContext";
import { AppButton } from "../src/components/AppButton";
import { ScreenShell } from "../src/components/ScreenShell";

export default function HomeScreen() {
  const {
    myClubs,
    membershipRequests,
    loading,
    openClub,
    startCreateClub,
    acceptMembershipRequest,
    declineInviteFromHome,
    goHome,
  } = useClubOs();

  const pendingInvites = membershipRequests.filter(
    (request) => request.status === "pending",
  );

  return (
    <ScreenShell>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your clubs</Text>
        <Text style={styles.memberMeta}>
          Open a club to manage members and dues, or create a new one.
        </Text>

        {myClubs.length === 0 ? (
          <Text style={styles.memberMeta}>
            You are not part of any club yet. Create one to get started.
          </Text>
        ) : (
          myClubs.map((club) => (
            <Pressable
              key={club.clubId}
              style={styles.clubRow}
              onPress={() => openClub(club.clubId, club.name)}
              disabled={loading}
            >
              <View style={styles.clubRowText}>
                <Text style={styles.memberName}>{club.name}</Text>
                {club.description ? (
                  <Text style={styles.memberMeta}>{club.description}</Text>
                ) : null}
                <Text style={styles.memberMeta}>Role: {club.role}</Text>
              </View>
              <Text style={styles.clubChevron}>›</Text>
            </Pressable>
          ))
        )}

        <AppButton
          label="Create a new club"
          onPress={startCreateClub}
          disabled={loading}
        />

        {pendingInvites.length > 0 ? (
          <View>
            <Text style={styles.subTitle}>Club invitations</Text>
            {pendingInvites.map((request) => (
              <View key={request.inviteId} style={styles.inviteRow}>
                <Text style={styles.memberName}>{request.clubName}</Text>
                <Text style={styles.memberMeta}>
                  You have been invited to join this club.
                </Text>
                <View style={styles.rowActions}>
                  <AppButton
                    label="Accept invitation"
                    onPress={() => acceptMembershipRequest(request)}
                    disabled={loading}
                  />
                  <AppButton
                    label="Decline"
                    onPress={() => declineInviteFromHome(request)}
                    disabled={loading}
                  />
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <AppButton label="Refresh" onPress={goHome} disabled={loading} />
        {loading ? <ActivityIndicator color="#0f4fa8" /> : null}
      </View>
    </ScreenShell>
  );
}
