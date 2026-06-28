import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { colors, styles } from "../../styles";
import { useActivities } from "../../context/domainHooks";
import type { ClubMeeting, MeetingRsvpResponse } from "../../types";
import {
  formatCountdown,
  formatDateAndTime,
  formatDateTime,
  meetingStatusColor,
} from "./format";
import { MeetingDetailModal } from "./MeetingDetailModal";

// The three RSVP choices, with their active styling and button label.
const RSVP_OPTIONS: {
  value: MeetingRsvpResponse;
  label: string;
  activeStyle: object;
  activeTextStyle: object;
}[] = [
  {
    value: "yes",
    label: "Going",
    activeStyle: styles.rsvpButtonYes,
    activeTextStyle: styles.rsvpButtonTextYes,
  },
  {
    value: "no",
    label: "Can't",
    activeStyle: styles.rsvpButtonNo,
    activeTextStyle: styles.rsvpButtonTextNo,
  },
  {
    value: "maybe",
    label: "Maybe",
    activeStyle: styles.rsvpButtonMaybe,
    activeTextStyle: styles.rsvpButtonTextMaybe,
  },
];

// "Meetings" tab. Mirrors the polls triage: upcoming meetings that may want the
// member's attention sit up top, while past meetings collapse into quiet
// one-line history rows that expand on demand.
export function MeetingsTab({
  onNewMeeting,
  onEditMeeting,
}: {
  onNewMeeting: () => void;
  onEditMeeting: (meeting: ClubMeeting) => void;
}) {
  const {
    meetings,
    activityLoading,
    canManageActivities,
    setMeetingRsvp,
  } = useActivities();

  const [selectedPastMeeting, setSelectedPastMeeting] =
    useState<ClubMeeting | null>(null);

  const upcomingMeetings = meetings.filter(
    (meeting) => meeting.status === "scheduled",
  );
  const pastMeetings = meetings.filter(
    (meeting) => meeting.status !== "scheduled",
  );

  const renderUpcomingMeeting = (meeting: ClubMeeting) => {
    const countdown = formatCountdown(meeting.scheduledAt);
    const { yes, no, maybe } = meeting.rsvpCounts;
    const totalRsvps = yes + no + maybe;

    // Header (pill + countdown + title + meta) is tappable for leadership to
    // open the edit sheet, signalled by a trailing chevron. Members see the
    // same content without the chevron / tap affordance.
    const header = (
      <>
        <View style={styles.activeCardTop}>
          <View style={styles.activeCardTopLeft}>
            <View style={styles.openPill}>
              <Text style={styles.openPillText}>Upcoming</Text>
            </View>
            {countdown ? (
              <View style={styles.countdownRow}>
                <Text style={styles.countdownText}>
                  {"\uD83D\uDD52"} {countdown}
                </Text>
              </View>
            ) : null}
          </View>
          {canManageActivities ? (
            <Text style={styles.headerChevron}>{"\u203A"}</Text>
          ) : null}
        </View>
        <Text style={styles.itemQuestion}>{meeting.title}</Text>
        <Text style={styles.itemMeta}>
          {formatDateAndTime(meeting.scheduledAt)}
          {meeting.location ? ` \u00b7 ${meeting.location}` : ""}
        </Text>
        {meeting.description ? (
          <Text style={styles.metaText}>{meeting.description}</Text>
        ) : null}
      </>
    );

    return (
      <View key={meeting.id} style={styles.activeCard}>
        {canManageActivities ? (
          <Pressable
            onPress={() => onEditMeeting(meeting)}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${meeting.title}`}
          >
            {header}
          </Pressable>
        ) : (
          header
        )}

        <View style={styles.rsvpRow}>
          {RSVP_OPTIONS.map((option) => {
            const active = meeting.myRsvp === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setMeetingRsvp(meeting.id, option.value)}
                style={[styles.rsvpButton, active && option.activeStyle]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`RSVP ${option.label} to ${meeting.title}`}
              >
                <Text
                  style={[
                    styles.rsvpButtonText,
                    active && option.activeTextStyle,
                  ]}
                >
                  {active ? "\u2713 " : ""}
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.rsvpSummary}>
          {totalRsvps === 0
            ? "Be the first to RSVP"
            : `${yes} going \u00b7 ${no} can't \u00b7 ${maybe} maybe`}
        </Text>

        <Text style={styles.organiserMeta}>
          Organised by {meeting.createdByName}
        </Text>
      </View>
    );
  };

  const renderPastMeeting = (meeting: ClubMeeting) => (
    <Pressable
      key={meeting.id}
      style={styles.collapsedRow}
      onPress={() => setSelectedPastMeeting(meeting)}
      accessibilityRole="button"
      accessibilityLabel={`${meeting.title}, ${meeting.status}. View details`}
    >
      <View style={styles.collapsedMain}>
        <Text style={styles.collapsedTitle} numberOfLines={1}>
          {meeting.title}
        </Text>
        <Text style={styles.collapsedMeta}>
          {formatDateTime(meeting.scheduledAt)}
        </Text>
      </View>
      <View style={styles.collapsedRight}>
        <Text
          style={[
            styles.collapsedSummary,
            { color: meetingStatusColor(meeting.status) },
          ]}
          accessibilityLabel={meeting.status}
        >
          {meeting.status === "completed"
            ? "\u2705"
            : meeting.status === "cancelled"
              ? "\u274C"
              : meeting.status}
        </Text>
        <Text style={styles.collapsedChevron}>{"\u203A"}</Text>
      </View>
    </Pressable>
  );

  const loadingFirst = activityLoading && meetings.length === 0;

  return (
    <View style={styles.card}>
      <View style={styles.sectionHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Meetings</Text>          
        </View>
        {canManageActivities ? (
          <Pressable
            style={styles.inviteLink}
            onPress={onNewMeeting}
            accessibilityRole="button"
            accessibilityLabel="New meeting"
          >
            <Text style={styles.inviteLinkText}>＋ New</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionLabel}>Needs your RSVP</Text>
        {upcomingMeetings.length > 0 ? (
          <View style={styles.sectionCountBadge}>
            <Text style={styles.sectionCountText}>
              {upcomingMeetings.length}
            </Text>
          </View>
        ) : null}
        <View style={styles.sectionRule} />
      </View>
      {loadingFirst ? (
        <ActivityIndicator color={colors.accent} />
      ) : upcomingMeetings.length === 0 ? (
        <Text style={styles.memberMeta}>No upcoming meetings.</Text>
      ) : (
        upcomingMeetings.map(renderUpcomingMeeting)
      )}

      <View style={styles.sectionHead}>
        <Text style={styles.sectionLabel}>Past</Text>
        {pastMeetings.length > 0 ? (
          <View style={styles.sectionCountBadge}>
            <Text style={styles.sectionCountText}>{pastMeetings.length}</Text>
          </View>
        ) : null}
        <View style={styles.sectionRule} />
      </View>
      {loadingFirst ? (
        <ActivityIndicator color={colors.accent} />
      ) : pastMeetings.length === 0 ? (
        <Text style={styles.memberMeta}>No past meetings yet.</Text>
      ) : (
        pastMeetings.map(renderPastMeeting)
      )}

      <MeetingDetailModal
        meeting={selectedPastMeeting}
        onClose={() => setSelectedPastMeeting(null)}
      />
    </View>
  );
}
