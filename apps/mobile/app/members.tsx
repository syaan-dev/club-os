import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { styles } from "../src/styles";
import { useClubOs } from "../src/ClubOsContext";
import { AppButton } from "../src/components/AppButton";
import { ScreenShell } from "../src/components/ScreenShell";

export default function MembersScreen() {
  const {
    members,
    invites,
    currentRole,
    clubId,
    loading,
    contactsLoading,
    contactsVisible,
    setContactsVisible,
    contactOptions,
    inviteName,
    setInviteName,
    invitePhone,
    setInvitePhone,
    inviteEmail,
    setInviteEmail,
    loadContacts,
    selectContact,
    inviteMember,
    navigate,
    goHome,
  } = useClubOs();

  const canInvite = currentRole === "Owner" || currentRole === "Treasurer";

  return (
    <ScreenShell showLoading>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>3. Membership desk</Text>
        <Text style={styles.memberMeta}>
          Role: {currentRole || "Member"} | Add members by selecting contacts or
          entering a phone number.
        </Text>
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator color="#0f4fa8" />
            ) : (
              <Text style={styles.memberMeta}>
                No members yet. Invite your first member below to get started.
              </Text>
            )
          }
          renderItem={({ item }) => (
            <View style={styles.memberRow}>
              <View>
                <Text style={styles.memberName}>{item.name}</Text>
                <Text style={styles.memberMeta}>
                  {item.role} - {item.status}
                </Text>
              </View>
              <Text style={item.duesPaid ? styles.paid : styles.unpaid}>
                {item.duesPaid ? "Paid" : "Unpaid"}
              </Text>
            </View>
          )}
        />

        {canInvite ? (
          <>
            <AppButton
              label={
                contactsLoading
                  ? "Loading contacts..."
                  : "Pick from phone contacts"
              }
              onPress={loadContacts}
              disabled={loading || contactsLoading}
            />
            {contactsVisible && contactOptions.length > 0 ? (
              <View style={styles.contactsCard}>
                <Text style={styles.subTitle}>Choose contact</Text>
                <FlatList
                  data={contactOptions}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.contactRow}
                      onPress={() => selectContact(item)}
                    >
                      <Text style={styles.memberName}>{item.name}</Text>
                      <Text style={styles.memberMeta}>{item.phone}</Text>
                    </Pressable>
                  )}
                />
                <AppButton
                  label="Close contacts"
                  onPress={() => setContactsVisible(false)}
                />
              </View>
            ) : null}

            <TextInput
              value={inviteName}
              onChangeText={setInviteName}
              placeholder="Member name (optional)"
              style={styles.input}
            />
            <TextInput
              value={invitePhone}
              onChangeText={setInvitePhone}
              placeholder="Invite phone (+91...)"
              keyboardType="phone-pad"
              style={styles.input}
            />
            <TextInput
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="Invite email (optional)"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
            <AppButton
              label="Send onboarding invite"
              onPress={inviteMember}
              disabled={loading || !invitePhone.trim()}
            />
          </>
        ) : null}
        {invites.length > 0 ? (
          <View>
            <Text style={styles.subTitle}>Pending Invites</Text>
            {invites.map((invite) => (
              <View key={invite.id} style={styles.inviteRow}>
                <Text style={styles.memberName}>
                  {invite.invitedPhone ||
                    invite.invitedEmail ||
                    "Unknown recipient"}
                </Text>
                <Text style={styles.memberMeta}>{invite.status}</Text>
                <Text style={styles.metaText}>Link: {invite.inviteLink}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <AppButton
          label="Go to club operations hub"
          onPress={() => navigate("hub")}
        />
        {canInvite ? (
          <AppButton
            label="Manage dues & ledger"
            onPress={() => navigate("dues")}
          />
        ) : null}
        <AppButton label="Back to home" onPress={goHome} />
        {clubId ? <Text style={styles.metaText}>Club ID: {clubId}</Text> : null}
      </View>
    </ScreenShell>
  );
}
