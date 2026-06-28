import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { styles } from "../../styles";
import type { Poll } from "../../types";
import { formatDateTime } from "./format";

// Read-only detail sheet for a closed poll. Shows the final result bars with the
// caller's own pick highlighted. The parent owns the open state so this stays a
// pure presentation sheet driven by the `poll` prop.
export function PollDetailModal({
  poll,
  onClose,
}: {
  poll: Poll | null;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={poll !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetHandle} />
          {poll ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              <Text style={styles.noticeDetailSubject}>{poll.question}</Text>
              <Text style={styles.noticeDetailMeta}>
                {poll.totalVotes} vote{poll.totalVotes === 1 ? "" : "s"}
                {poll.closesAt
                  ? ` \u00b7 closed ${formatDateTime(poll.closesAt)}`
                  : ""}
              </Text>
              <View style={styles.separator} />
              {poll.options.map((label, index) => {
                const count = poll.voteCounts[index] ?? 0;
                const percent =
                  poll.totalVotes > 0
                    ? Math.round((count / poll.totalVotes) * 100)
                    : 0;
                const mine = poll.myOptionIndex === index;
                return (
                  <View
                    key={index}
                    style={[styles.pollOption, mine && styles.pollOptionActive]}
                  >
                    <View
                      style={[styles.pollOptionFill, { width: `${percent}%` }]}
                    />
                    <View style={styles.pollOptionRow}>
                      <View style={styles.optionLeft}>
                        {mine ? (
                          <Text style={styles.optionCheck}>{"\u2713"}</Text>
                        ) : null}
                        <Text style={styles.pollOptionLabel}>{label}</Text>
                      </View>
                      <Text style={styles.pollOptionCount}>
                        {percent}% ({count})
                      </Text>
                    </View>
                  </View>
                );
              })}
              <Text style={styles.organiserMeta}>By {poll.createdByName}</Text>
            </ScrollView>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
