import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { colors, styles } from "../../styles";
import { useActivities, useUi } from "../../context/domainHooks";
import type { Poll } from "../../types";
import { formatDateTime } from "./format";

// "Polls" tab: active and closed polls. Voting and close actions run through
// the activities domain hook; the create form lives in the parent.
export function PollsTab({ onNewPoll }: { onNewPoll: () => void }) {
  const {
    polls,
    activityLoading,
    canManageActivities,
    castVote,
    closePoll,
  } = useActivities();
  const { loading } = useUi();

  const activePolls = polls.filter((poll) => poll.status === "open");
  const closedPolls = polls.filter((poll) => poll.status !== "open");

  const renderPollItem = ({ item }: { item: Poll }) => {
    const open = item.status === "open";
    return (
      <View style={{ paddingVertical: 12 }}>
        <Text style={styles.memberName}>{item.question}</Text>
        <Text style={styles.metaText}>
          {item.totalVotes} vote
          {item.totalVotes === 1 ? "" : "s"}
          {item.closesAt
            ? ` \u00b7 Closes ${formatDateTime(item.closesAt)}`
            : ""}
          {open ? "" : " \u00b7 Closed"}
        </Text>
        {item.options.map((label, index) => {
          const count = item.voteCounts[index] ?? 0;
          const percent =
            item.totalVotes > 0
              ? Math.round((count / item.totalVotes) * 100)
              : 0;
          const mine = item.myOptionIndex === index;
          return (
            <Pressable
              key={index}
              disabled={!open || loading}
              onPress={() => castVote(item.id, index)}
              style={[styles.pollOption, mine && styles.pollOptionActive]}
              accessibilityRole="button"
              accessibilityLabel={`Vote ${label}`}
            >
              <View style={[styles.pollOptionFill, { width: `${percent}%` }]} />
              <View style={styles.pollOptionRow}>
                <Text style={styles.pollOptionLabel}>
                  {mine ? "\u2713 " : ""}
                  {label}
                </Text>
                <Text style={styles.pollOptionCount}>
                  {percent}% ({count})
                </Text>
              </View>
            </Pressable>
          );
        })}
        <Text style={styles.metaText}>By {item.createdByName}</Text>
        {canManageActivities && open ? (
          <View style={styles.rowActions}>
            <Pressable
              style={styles.inlineButton}
              onPress={() => closePoll(item.id)}
              accessibilityRole="button"
              accessibilityLabel={`Close poll ${item.question}`}
            >
              <Text style={styles.inlineButtonText}>Close poll</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.sectionHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Polls</Text>
          <Text style={styles.memberMeta}>
            Run a vote and let every active member weigh in.
          </Text>
        </View>
        {canManageActivities ? (
          <Pressable
            style={styles.inviteLink}
            onPress={onNewPoll}
            accessibilityRole="button"
            accessibilityLabel="New poll"
          >
            <Text style={styles.inviteLinkText}>＋ New</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.subTitle}>Active</Text>
      {activityLoading && polls.length === 0 ? (
        <ActivityIndicator color={colors.accent} />
      ) : activePolls.length === 0 ? (
        <Text style={styles.memberMeta}>No active polls.</Text>
      ) : (
        <FlatList
          data={activePolls}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={renderPollItem}
        />
      )}

      <Text style={[styles.subTitle, { marginTop: 16 }]}>Closed</Text>
      {activityLoading && polls.length === 0 ? (
        <ActivityIndicator color={colors.accent} />
      ) : closedPolls.length === 0 ? (
        <Text style={styles.memberMeta}>No closed polls yet.</Text>
      ) : (
        <FlatList
          data={closedPolls}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={renderPollItem}
        />
      )}
    </View>
  );
}
