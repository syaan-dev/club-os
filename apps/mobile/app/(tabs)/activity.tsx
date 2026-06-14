import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors, styles } from "../../src/styles";
import { useClubOs } from "../../src/ClubOsContext";
import type {
  Announcement,
  ClubMeeting,
  MeetingStatus,
  Poll,
} from "../../src/types";
import { AppButton } from "../../src/components/AppButton";
import { TabScreenShell } from "../../src/components/TabScreenShell";

type ActivityTab = "meetings" | "polls" | "announcements";

const ACTIVITY_TABS: { value: ActivityTab; label: string }[] = [
  { value: "meetings", label: "Meetings" },
  { value: "polls", label: "Polls" },
  { value: "announcements", label: "Notices" },
];

const formatDateTime = (value: string) => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const meetingStatusColor = (status: MeetingStatus) => {
  if (status === "completed") {
    return colors.accent;
  }
  if (status === "cancelled") {
    return colors.red;
  }
  return colors.green;
};

export default function ActivityScreen() {
  const {
    meetings,
    polls,
    announcements,
    activityLoading,
    canManageActivities,
    refreshActivities,
    createMeeting,
    updateMeetingStatus,
    updateMeeting,
    createPoll,
    castVote,
    closePoll,
    createAnnouncement,
    setAnnouncementRead,
    loading,
  } = useClubOs();

  const [tab, setTab] = useState<ActivityTab>("meetings");

  // Create sheets are leadership-only and kept separate from the read-only
  // lists below so members only ever see the history.
  const [meetingFormOpen, setMeetingFormOpen] = useState(false);
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
  const [pollFormOpen, setPollFormOpen] = useState(false);
  const [announceFormOpen, setAnnounceFormOpen] = useState(false);
  const [openNotice, setOpenNotice] = useState<Announcement | null>(null);

  // Resolve the current member's votes (needs currentMemberId, which is set
  // after the initial club load) so their selection is highlighted.
  useEffect(() => {
    void refreshActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Meeting form.
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDescription, setMeetingDescription] = useState("");
  const [meetingLocation, setMeetingLocation] = useState("");
  const [meetingDate, setMeetingDate] = useState("");

  // Poll form.
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollCloses, setPollCloses] = useState("");

  // Announcement form.
  const [announceTitle, setAnnounceTitle] = useState("");
  const [announceBody, setAnnounceBody] = useState("");

  const onCreateMeeting = async () => {
    if (editingMeetingId) {
      await updateMeeting(editingMeetingId, {
        title: meetingTitle,
        description: meetingDescription,
        location: meetingLocation,
        scheduledAt: meetingDate,
      });
    } else {
      await createMeeting({
        title: meetingTitle,
        description: meetingDescription,
        location: meetingLocation,
        scheduledAt: meetingDate,
      });
    }
    setMeetingTitle("");
    setMeetingDescription("");
    setMeetingLocation("");
    setMeetingDate("");
    setEditingMeetingId(null);
    setMeetingFormOpen(false);
  };

  const openCreateMeeting = () => {
    setEditingMeetingId(null);
    setMeetingTitle("");
    setMeetingDescription("");
    setMeetingLocation("");
    setMeetingDate("");
    setMeetingFormOpen(true);
  };

  const openEditMeeting = (meeting: ClubMeeting) => {
    setEditingMeetingId(meeting.id);
    setMeetingTitle(meeting.title);
    setMeetingDescription(meeting.description ?? "");
    setMeetingLocation(meeting.location ?? "");
    setMeetingDate((meeting.scheduledAt ?? "").slice(0, 10));
    setMeetingFormOpen(true);
  };

  const closeMeetingForm = () => {
    setEditingMeetingId(null);
    setMeetingFormOpen(false);
  };

  const onCreatePoll = async () => {
    await createPoll({
      question: pollQuestion,
      options: pollOptions,
      closesAt: pollCloses,
    });
    setPollQuestion("");
    setPollOptions(["", ""]);
    setPollCloses("");
    setPollFormOpen(false);
  };

  const onCreateAnnouncement = async () => {
    await createAnnouncement({ title: announceTitle, body: announceBody });
    setAnnounceTitle("");
    setAnnounceBody("");
    setAnnounceFormOpen(false);
  };

  const updateOption = (index: number, value: string) => {
    setPollOptions((prev) =>
      prev.map((option, i) => (i === index ? value : option)),
    );
  };

  const addOption = () => {
    setPollOptions((prev) => (prev.length >= 10 ? prev : [...prev, ""]));
  };

  const removeOption = (index: number) => {
    setPollOptions((prev) =>
      prev.length <= 2 ? prev : prev.filter((_, i) => i !== index),
    );
  };

  // Opening a notice reads it like an email: show the full message and mark it
  // read so the unread badge clears.
  const openNoticeMessage = (notice: Announcement) => {
    setOpenNotice(notice);
    if (!notice.isRead) {
      void setAnnouncementRead(notice.id, true);
    }
  };

  // Upcoming = still scheduled; Past = completed or cancelled.
  const upcomingMeetings = meetings.filter(
    (meeting) => meeting.status === "scheduled",
  );
  const pastMeetings = meetings.filter(
    (meeting) => meeting.status !== "scheduled",
  );

  const renderMeetingItem = ({ item }: { item: ClubMeeting }) => (
    <View style={{ paddingVertical: 10 }}>
      <Text style={styles.memberName}>{item.title}</Text>
      <Text style={styles.memberMeta}>
        {formatDateTime(item.scheduledAt)}
        {item.location ? ` \u00b7 ${item.location}` : ""}
      </Text>
      {item.description ? (
        <Text style={styles.metaText}>{item.description}</Text>
      ) : null}
      <View style={[styles.statusPill, { backgroundColor: colors.surfaceAlt }]}>
        <Text
          style={[
            styles.statusPillText,
            { color: meetingStatusColor(item.status) },
          ]}
        >
          {item.status}
        </Text>
      </View>
      <Text style={styles.metaText}>Organised by {item.createdByName}</Text>
      {canManageActivities && item.status === "scheduled" ? (
        <View style={styles.rowActions}>
          <Pressable
            style={styles.inlineButton}
            onPress={() => openEditMeeting(item)}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${item.title}`}
          >
            <Text style={styles.inlineButtonText}>Edit</Text>
          </Pressable>
          <Pressable
            style={styles.inlineButton}
            onPress={() => updateMeetingStatus(item.id, "completed")}
            accessibilityRole="button"
            accessibilityLabel={`Mark ${item.title} completed`}
          >
            <Text style={styles.inlineButtonText}>Mark completed</Text>
          </Pressable>
          <Pressable
            style={styles.inlineButton}
            onPress={() => updateMeetingStatus(item.id, "cancelled")}
            accessibilityRole="button"
            accessibilityLabel={`Cancel ${item.title}`}
          >
            <Text style={styles.inlineButtonText}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  const activePolls = polls.filter((poll) => poll.status === "open");
  const closedPolls = polls.filter((poll) => poll.status !== "open");

  const unreadAnnouncements = announcements.filter(
    (announcement) => !announcement.isRead,
  ).length;

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
    <TabScreenShell>
      <View style={styles.segmentRow}>
        {ACTIVITY_TABS.map((option) => {
          const active = tab === option.value;
          const showBadge =
            option.value === "announcements" && unreadAnnouncements > 0;
          return (
            <Pressable
              key={option.value}
              onPress={() => setTab(option.value)}
              style={[styles.segment, active && styles.segmentActive]}
              accessibilityRole="button"
              accessibilityLabel={`${option.label} tab`}
            >
              <Text
                style={active ? styles.segmentTextActive : styles.segmentText}
              >
                {option.label}
              </Text>
              {showBadge ? (
                <View style={styles.segmentBadge}>
                  <Text style={styles.segmentBadgeText}>
                    {unreadAnnouncements > 99 ? "99+" : unreadAnnouncements}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {tab === "meetings" ? (
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Meetings</Text>
              <Text style={styles.memberMeta}>
                Schedule club meetings and track whether they happened.
              </Text>
            </View>
            {canManageActivities ? (
              <Pressable
                style={styles.inviteLink}
                onPress={openCreateMeeting}
                accessibilityRole="button"
                accessibilityLabel="New meeting"
              >
                <Text style={styles.inviteLinkText}>＋ New</Text>
              </Pressable>
            ) : null}
          </View>

          <Text style={styles.subTitle}>Upcoming</Text>
          {activityLoading && meetings.length === 0 ? (
            <ActivityIndicator color={colors.accent} />
          ) : upcomingMeetings.length === 0 ? (
            <Text style={styles.memberMeta}>No upcoming meetings.</Text>
          ) : (
            <FlatList
              data={upcomingMeetings}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={renderMeetingItem}
            />
          )}

          <Text style={[styles.subTitle, { marginTop: 16 }]}>Past</Text>
          {activityLoading && meetings.length === 0 ? (
            <ActivityIndicator color={colors.accent} />
          ) : pastMeetings.length === 0 ? (
            <Text style={styles.memberMeta}>No past meetings yet.</Text>
          ) : (
            <FlatList
              data={pastMeetings}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={renderMeetingItem}
            />
          )}
        </View>
      ) : null}

      {tab === "polls" ? (
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
                onPress={() => setPollFormOpen(true)}
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
      ) : null}

      {tab === "announcements" ? (
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Inbox</Text>
            </View>
            {canManageActivities ? (
              <Pressable
                style={styles.inviteLink}
                onPress={() => setAnnounceFormOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="New notice"
              >
                <Text style={styles.inviteLinkText}>＋ New</Text>
              </Pressable>
            ) : null}
          </View>

          {activityLoading && announcements.length === 0 ? (
            <ActivityIndicator color={colors.accent} />
          ) : announcements.length === 0 ? (
            <Text style={styles.memberMeta}>No notices posted yet.</Text>
          ) : (
            <FlatList
              data={announcements}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.noticeRow}
                  onPress={() => openNoticeMessage(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open notice ${item.title}`}
                >
                  <View style={styles.noticeUnreadCol}>
                    {!item.isRead ? <View style={styles.unreadDot} /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.noticeTopRow}>
                      <Text
                        style={[
                          styles.noticeSubject,
                          !item.isRead && styles.noticeSubjectUnread,
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <Text style={styles.noticeDate}>
                        {formatDateTime(item.createdAt)}
                      </Text>
                    </View>
                    <Text style={styles.noticeSender} numberOfLines={1}>
                      {item.createdByName}
                    </Text>
                  </View>
                </Pressable>
              )}
            />
          )}
        </View>
      ) : null}

      {/* Create / edit meeting (leadership only) */}
      <Modal
        visible={meetingFormOpen}
        transparent
        animationType="slide"
        onRequestClose={closeMeetingForm}
      >
        <Pressable style={styles.sheetBackdrop} onPress={closeMeetingForm}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {editingMeetingId ? "Edit meeting" : "New meeting"}
            </Text>
            <ScrollView
              contentContainerStyle={{ gap: 12 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.fieldLabel}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Monthly general meeting"
                value={meetingTitle}
                onChangeText={setMeetingTitle}
                accessibilityLabel="Meeting title"
              />

              <Text style={styles.fieldLabel}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="2026-06-20"
                value={meetingDate}
                onChangeText={setMeetingDate}
                accessibilityLabel="Meeting date"
              />

              <Text style={styles.fieldLabel}>Location (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Clubhouse / Google Meet"
                value={meetingLocation}
                onChangeText={setMeetingLocation}
                accessibilityLabel="Meeting location"
              />

              <Text style={styles.fieldLabel}>Agenda (optional)</Text>
              <TextInput
                style={[styles.input, { minHeight: 64 }]}
                placeholder="What will be discussed?"
                value={meetingDescription}
                onChangeText={setMeetingDescription}
                multiline
                accessibilityLabel="Meeting agenda"
              />

              <AppButton
                label={
                  loading
                    ? "Saving..."
                    : editingMeetingId
                      ? "Save changes"
                      : "Schedule meeting"
                }
                onPress={onCreateMeeting}
                disabled={loading || meetingTitle.trim().length === 0}
              />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Create poll (leadership only) */}
      <Modal
        visible={pollFormOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPollFormOpen(false)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setPollFormOpen(false)}
        >
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>New poll</Text>
            <ScrollView
              contentContainerStyle={{ gap: 12 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.fieldLabel}>Question</Text>
              <TextInput
                style={styles.input}
                placeholder="Where should we host the next event?"
                value={pollQuestion}
                onChangeText={setPollQuestion}
                accessibilityLabel="Poll question"
              />

              <Text style={styles.fieldLabel}>Options</Text>
              {pollOptions.map((option, index) => (
                <View
                  key={index}
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChangeText={(value) => updateOption(index, value)}
                    accessibilityLabel={`Poll option ${index + 1}`}
                  />
                  {pollOptions.length > 2 ? (
                    <Pressable
                      onPress={() => removeOption(index)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove option ${index + 1}`}
                    >
                      <Text style={[styles.unpaid, { fontSize: 20 }]}>
                        {"\u00d7"}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
              {pollOptions.length < 10 ? (
                <Pressable
                  style={styles.inlineButton}
                  onPress={addOption}
                  accessibilityRole="button"
                  accessibilityLabel="Add poll option"
                >
                  <Text style={styles.inlineButtonText}>+ Add option</Text>
                </Pressable>
              ) : null}

              <Text style={styles.fieldLabel}>Closes on (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="2026-06-30"
                value={pollCloses}
                onChangeText={setPollCloses}
                accessibilityLabel="Poll close date"
              />

              <AppButton
                label={loading ? "Saving..." : "Create poll"}
                onPress={onCreatePoll}
                disabled={loading || pollQuestion.trim().length === 0}
              />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Create notice (leadership only) */}
      <Modal
        visible={announceFormOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setAnnounceFormOpen(false)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setAnnounceFormOpen(false)}
        >
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>New notice</Text>
            <ScrollView
              contentContainerStyle={{ gap: 12 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.fieldLabel}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Venue changed for Saturday"
                value={announceTitle}
                onChangeText={setAnnounceTitle}
                accessibilityLabel="Announcement title"
              />

              <Text style={styles.fieldLabel}>Message</Text>
              <TextInput
                style={[styles.input, { minHeight: 80 }]}
                placeholder="Share the details..."
                value={announceBody}
                onChangeText={setAnnounceBody}
                multiline
                accessibilityLabel="Announcement message"
              />

              <AppButton
                label={loading ? "Posting..." : "Post notice"}
                onPress={onCreateAnnouncement}
                disabled={loading || announceTitle.trim().length === 0}
              />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Notice detail (email-style reader) */}
      <Modal
        visible={openNotice !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setOpenNotice(null)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setOpenNotice(null)}
        >
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            {openNotice ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 40 }}
              >
                <Text style={styles.noticeDetailSubject}>
                  {openNotice.title}
                </Text>
                <Text style={styles.noticeDetailMeta}>
                  {openNotice.createdByName} {"\u00b7"}{" "}
                  {formatDateTime(openNotice.createdAt)}
                </Text>
                <View style={styles.separator} />
                <Text style={styles.noticeDetailBody}>{openNotice.body}</Text>
              </ScrollView>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </TabScreenShell>
  );
}
