import { Image, Pressable, Text, View } from "react-native";
import { styles } from "../src/styles";
import { useClubs, useMembers, useUi } from "../src/context/domainHooks";
import { AppButton } from "../src/components/AppButton";
import { OnboardingShell } from "../src/components/OnboardingShell";

export default function HomeScreen() {
  const { myClubs, openClub, startCreateClub } = useClubs();
  const {
    membershipRequests,
    acceptMembershipRequest,
    declineInviteFromHome,
  } = useMembers();
  const { loading } = useUi();

  const pendingInvites = membershipRequests.filter(
    (request) => request.status === "pending",
  );

  return (
    <OnboardingShell showLoading>
      <View style={styles.authCard}>
        <Text style={styles.authHeading}>Your clubs</Text>

        {myClubs.length === 0 ? (
          <Text style={styles.authSubtext}>
            You're not in a club yet. Create one to get started.
          </Text>
        ) : (
          myClubs.map((club) => (
            <Pressable
              key={club.clubId}
              style={styles.clubRow}
              onPress={() => openClub(club.clubId, club.name)}
              disabled={loading}
            >
              <View style={styles.clubRowLogo}>
                {club.logoUrl ? (
                  <Image
                    source={{ uri: club.logoUrl }}
                    style={styles.clubRowLogoImage}
                  />
                ) : (
                  <Text style={styles.clubRowLogoText}>
                    {club.name.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.clubRowText}>
                <Text style={styles.memberName}>{club.name}</Text>
                <Text style={styles.memberMeta}>{club.role}</Text>
              </View>
              <Text style={styles.clubChevron}>›</Text>
            </Pressable>
          ))
        )}

        <AppButton
          label="Create a club"
          onPress={startCreateClub}
          disabled={loading}
        />
      </View>

      {pendingInvites.length > 0 ? (
        <View style={[styles.authCard, { marginTop: 16 }]}>
          <Text style={styles.authHeading}>Club invitations</Text>
          {pendingInvites.map((request) => (
            <View key={request.inviteId} style={styles.inviteRow}>
              <Text style={styles.memberName}>{request.clubName}</Text>
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
    </OnboardingShell>
  );
}
