import { Text, View } from "react-native";
import { styles } from "../src/styles";
import { useMembers, useUi } from "../src/context/domainHooks";
import { AppButton } from "../src/components/AppButton";
import { OnboardingShell } from "../src/components/OnboardingShell";

export default function MemberRequestsScreen() {
  const {
    membershipRequests,
    acceptMembershipRequest,
    declineMembershipRequest,
    resumeOnboarding,
  } = useMembers();
  const { loading } = useUi();

  return (
    <OnboardingShell showLoading>
      <View style={styles.authCard}>
        <Text style={styles.authHeading}>Membership requests</Text>
        {loading && membershipRequests.length === 0 ? (
          <Text style={styles.authSubtext}>Loading your invitations…</Text>
        ) : membershipRequests.length === 0 ? (
          <Text style={styles.authSubtext}>No pending requests.</Text>
        ) : (
          membershipRequests.map((request) => (
            <View key={request.inviteId} style={styles.inviteRow}>
              <Text style={styles.memberName}>{request.clubName}</Text>
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
    </OnboardingShell>
  );
}
