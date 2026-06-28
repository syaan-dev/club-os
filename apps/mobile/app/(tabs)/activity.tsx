import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { styles } from "../../src/styles";
import { useActivities } from "../../src/context/domainHooks";
import type { Announcement, ClubMeeting, Poll } from "../../src/types";
import { TabScreenShell } from "../../src/components/TabScreenShell";
import { MeetingsTab } from "../../src/components/activity/MeetingsTab";
import { PollsTab } from "../../src/components/activity/PollsTab";
import { AnnouncementsTab } from "../../src/components/activity/AnnouncementsTab";
import { MeetingFormModal } from "../../src/components/activity/MeetingFormModal";
import { PollFormModal } from "../../src/components/activity/PollFormModal";
import { AnnouncementFormModal } from "../../src/components/activity/AnnouncementFormModal";
import { NoticeDetailModal } from "../../src/components/activity/NoticeDetailModal";

type ActivityTab = "meetings" | "polls" | "announcements";

const ACTIVITY_TABS: { value: ActivityTab; label: string }[] = [
  { value: "meetings", label: "Meetings" },
  { value: "polls", label: "Polls" },
  { value: "announcements", label: "Notices" },
];

export default function ActivityScreen() {
  const { announcements, refreshActivities, setAnnouncementRead } =
    useActivities();

  const [tab, setTab] = useState<ActivityTab>("meetings");

  // Create sheets are leadership-only and kept separate from the read-only
  // lists so members only ever see the history.
  const [meetingFormOpen, setMeetingFormOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<ClubMeeting | null>(null);
  const [pollFormOpen, setPollFormOpen] = useState(false);
  const [editingPoll, setEditingPoll] = useState<Poll | null>(null);
  const [announceFormOpen, setAnnounceFormOpen] = useState(false);
  const [openNotice, setOpenNotice] = useState<Announcement | null>(null);

  // Resolve the current member's votes (needs currentMemberId, which is set
  // after the initial club load) so their selection is highlighted.
  useEffect(() => {
    void refreshActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreateMeeting = () => {
    setEditingMeeting(null);
    setMeetingFormOpen(true);
  };

  const openEditMeeting = (meeting: ClubMeeting) => {
    setEditingMeeting(meeting);
    setMeetingFormOpen(true);
  };

  const openCreatePoll = () => {
    setEditingPoll(null);
    setPollFormOpen(true);
  };

  const openEditPoll = (poll: Poll) => {
    setEditingPoll(poll);
    setPollFormOpen(true);
  };

  // Opening a notice reads it like an email: show the full message and mark it
  // read so the unread badge clears.
  const openNoticeMessage = (notice: Announcement) => {
    setOpenNotice(notice);
    if (!notice.isRead) {
      void setAnnouncementRead(notice.id, true);
    }
  };

  const unreadAnnouncements = announcements.filter(
    (announcement) => !announcement.isRead,
  ).length;

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
        <MeetingsTab
          onNewMeeting={openCreateMeeting}
          onEditMeeting={openEditMeeting}
        />
      ) : null}

      {tab === "polls" ? (
        <PollsTab onNewPoll={openCreatePoll} onEditPoll={openEditPoll} />
      ) : null}

      {tab === "announcements" ? (
        <AnnouncementsTab
          onNewNotice={() => setAnnounceFormOpen(true)}
          onOpenNotice={openNoticeMessage}
        />
      ) : null}

      <MeetingFormModal
        visible={meetingFormOpen}
        editingMeeting={editingMeeting}
        onClose={() => {
          setMeetingFormOpen(false);
          setEditingMeeting(null);
        }}
      />

      <PollFormModal
        visible={pollFormOpen}
        editingPoll={editingPoll}
        onClose={() => {
          setPollFormOpen(false);
          setEditingPoll(null);
        }}
      />

      <AnnouncementFormModal
        visible={announceFormOpen}
        onClose={() => setAnnounceFormOpen(false)}
      />

      <NoticeDetailModal
        notice={openNotice}
        onClose={() => setOpenNotice(null)}
      />
    </TabScreenShell>
  );
}
