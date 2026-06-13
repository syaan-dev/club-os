import { Text, View } from "react-native";
import { styles } from "../src/styles";
import { useClubOs } from "../src/ClubOsContext";
import { AppButton } from "../src/components/AppButton";
import { ScreenShell } from "../src/components/ScreenShell";

export default function MemberRequestsScreen() {
  const {
    membershipRequests,
    loading,
    acceptMembershipRequest,
    declineMembershipRequest,
    resumeOnboarding,
  } = useClubOs();

  return (
    <ScreenShell showLoading>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>2. Membership requests</Text>
        <Text style={styles.memberMeta}>
          Review club invitations linked to your phone and choose where to
          onboard.
        </Text>
        {loading && membershipRequests.length === 0 ? (
          <Text style={styles.memberMeta}>Loading your invitations...</Text>
        ) : membershipRequests.length === 0 ? (
          <Text style={styles.memberMeta}>
            No pending membership requests found.
          </Text>
        ) : (
          membershipRequests.map((request) => (
            <View key={request.inviteId} style={styles.inviteRow}>
              <Text style={styles.memberName}>{request.clubName}</Text>
              <Text style={styles.memberMeta}>Status: {request.status}</Text>
              <Text style={styles.memberMeta}>
                Invite link: {request.inviteLink}
              </Text>
              <View style={styles.rowActions}>
                {request.status === "pending" ? (
                  <>
                    <AppButton
                      label="Accept request"
                      onPress={() => acceptMembershipRequest(request)}
                      disabled={loading}
                    />
                    <AppButton
                      label="Decline"
                      onPress={() => declineMembershipRequest(request)}
                      disabled={loading}
                    />
                  </>
                ) : (
                  <AppButton
                    label="Continue onboarding"
                    onPress={() => resumeOnboarding(request)}
                    disabled={loading}
                  />
                )}
              </View>
            </View>
          ))
        )}
      </View>
    </ScreenShell>
  );
}
