import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { colors, styles } from "../../styles";
import { useActivities, useUi } from "../../context/domainHooks";
import type { Poll } from "../../types";
import { formatCountdown, formatDateTime } from "./format";

// Returns the winning option index for a closed poll, or -1 when there are no
// votes or the top is tied. Used for the one-line "X won" history summary.
const winningOptionIndex = (poll: Poll) => {
  if (poll.totalVotes === 0) {
    return -1;
  }
  const top = poll.voteCounts.reduce((max, count) => Math.max(max, count), 0);
  const leaders = poll.voteCounts.filter((count) => count === top);
  if (top === 0 || leaders.length !== 1) {
    return -1;
  }
  return poll.voteCounts.findIndex((count) => count === top);
};

// "Polls" tab. The screen is triaged member-first: open polls that want a vote
// sit up top under "Needs your vote", while closed polls collapse into quiet
// one-line history rows that expand on demand.
export function PollsTab({ onNewPoll }: { onNewPoll: () => void }) {
  const { polls, activityLoading, canManageActivities, castVote, closePoll } =
    useActivities();
  const { loading } = useUi();

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const activePolls = polls.filter((poll) => poll.status === "open");
  const closedPolls = polls.filter((poll) => poll.status !== "open");

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  // Result bars: filled percentage rows shown once the member has voted (or on
  // an expanded closed poll). The member's own pick gets a check + highlight.
  const renderResultBars = (poll: Poll, interactive: boolean) =>
    poll.options.map((label, index) => {
      const count = poll.voteCounts[index] ?? 0;
      const percent =
        poll.totalVotes > 0 ? Math.round((count / poll.totalVotes) * 100) : 0;
      const mine = poll.myOptionIndex === index;
      return (
        <Pressable
          key={index}
          disabled={!interactive || loading}
          onPress={interactive ? () => castVote(poll.id, index) : undefined}
          style={[styles.pollOption, mine && styles.pollOptionActive]}
          accessibilityRole={interactive ? "button" : "text"}
          accessibilityLabel={interactive ? `Vote ${label}` : label}
        >
          <View style={[styles.pollOptionFill, { width: `${percent}%` }]} />
          <View style={styles.pollOptionRow}>
            <View style={styles.optionLeft}>
              {mine ? <Text style={styles.optionCheck}>{"\u2713"}</Text> : null}
              <Text style={styles.pollOptionLabel}>{label}</Text>
            </View>
            <Text style={styles.pollOptionCount}>
              {percent}% ({count})
            </Text>
          </View>
        </Pressable>
      );
    });

  // An open poll the member has not voted on yet: empty radios that read as
  // "you can act here", with no confusing 0% zeros before anyone has voted.
  const renderVoteRows = (poll: Poll) =>
    poll.options.map((label, index) => (
      <Pressable
        key={index}
        disabled={loading}
        onPress={() => castVote(poll.id, index)}
        style={styles.pollOption}
        accessibilityRole="button"
        accessibilityLabel={`Vote ${label}`}
      >
        <View style={styles.pollOptionRow}>
          <View style={styles.optionLeft}>
            <View style={styles.optionRadio} />
            <Text style={styles.pollOptionLabel}>{label}</Text>
          </View>
        </View>
      </Pressable>
    ));

  const renderActivePoll = (poll: Poll) => {
    const voted = poll.myOptionIndex !== null;
    const countdown = formatCountdown(poll.closesAt);
    return (
      <View key={poll.id} style={styles.activeCard}>
        <View style={styles.activeCardTop}>
          <View style={styles.openPill}>
            <Text style={styles.openPillText}>Open</Text>
          </View>
          {countdown ? (
            <View style={styles.countdownRow}>
              <Text style={styles.countdownText}>
                {"\uD83D\uDD52"} closes {countdown}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.itemQuestion}>{poll.question}</Text>
        <Text style={styles.itemMeta}>
          {voted
            ? `${poll.totalVotes} vote${poll.totalVotes === 1 ? "" : "s"} \u00b7 you voted`
            : "Tap an option to vote"}
        </Text>
        {voted ? renderResultBars(poll, true) : renderVoteRows(poll)}
        {voted ? (
          <Text style={styles.changeHint}>Tap again to change your vote</Text>
        ) : null}
        {canManageActivities ? (
          <View style={styles.rowActions}>
            <Pressable
              style={styles.inlineButton}
              onPress={() => closePoll(poll.id)}
              accessibilityRole="button"
              accessibilityLabel={`Close poll ${poll.question}`}
            >
              <Text style={styles.inlineButtonText}>Close poll</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  };

  const renderClosedPoll = (poll: Poll) => {
    const winnerIndex = winningOptionIndex(poll);
    const summary =
      poll.totalVotes === 0
        ? "No votes"
        : winnerIndex >= 0
          ? `\u201c${poll.options[winnerIndex]}\u201d won`
          : "Tie";
    const isOpen = expanded[poll.id];
    return (
      <View key={poll.id}>
        <Pressable
          style={styles.collapsedRow}
          onPress={() => toggleExpanded(poll.id)}
          accessibilityRole="button"
          accessibilityLabel={`${poll.question}, ${summary}`}
        >
          <View style={styles.collapsedMain}>
            <Text style={styles.collapsedTitle} numberOfLines={1}>
              {poll.question}
            </Text>
            <Text style={styles.collapsedMeta}>
              {poll.totalVotes} vote{poll.totalVotes === 1 ? "" : "s"}
              {poll.closesAt
                ? ` \u00b7 closed ${formatDateTime(poll.closesAt)}`
                : ""}
            </Text>
          </View>
          <View style={styles.collapsedRight}>
            <Text style={styles.collapsedSummary}>{summary}</Text>
            <Text style={styles.collapsedChevron}>
              {isOpen ? "\u2303" : "\u2304"}
            </Text>
          </View>
        </Pressable>
        {isOpen ? (
          <View style={{ paddingBottom: 12 }}>
            {renderResultBars(poll, false)}
            <Text style={styles.metaText}>By {poll.createdByName}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  const loadingFirst = activityLoading && polls.length === 0;

  return (
    <View style={styles.card}>
      <View style={styles.sectionHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Polls</Text>          
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

      <View style={styles.sectionHead}>
        <Text style={styles.sectionLabel}>Needs your vote</Text>
        {activePolls.length > 0 ? (
          <View style={styles.sectionCountBadge}>
            <Text style={styles.sectionCountText}>{activePolls.length}</Text>
          </View>
        ) : null}
        <View style={styles.sectionRule} />
      </View>
      {loadingFirst ? (
        <ActivityIndicator color={colors.accent} />
      ) : activePolls.length === 0 ? (
        <Text style={styles.memberMeta}>
          Nothing needs your vote right now.
        </Text>
      ) : (
        activePolls.map(renderActivePoll)
      )}

      <View style={styles.sectionHead}>
        <Text style={styles.sectionLabel}>Closed</Text>
        {closedPolls.length > 0 ? (
          <View style={styles.sectionCountBadge}>
            <Text style={styles.sectionCountText}>{closedPolls.length}</Text>
          </View>
        ) : null}
        <View style={styles.sectionRule} />
      </View>
      {loadingFirst ? (
        <ActivityIndicator color={colors.accent} />
      ) : closedPolls.length === 0 ? (
        <Text style={styles.memberMeta}>No closed polls yet.</Text>
      ) : (
        closedPolls.map(renderClosedPoll)
      )}
    </View>
  );
}
