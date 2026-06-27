// Activity-domain mutations (meetings, polls, announcements). Extracted from
// ClubOsContext so the provider stays lean. Each action validates, writes to
// Supabase, then reloads the affected slice via the provided loaders.
//
// State + loaders remain owned by the provider; this hook receives them (plus
// the toast/loading helpers) as `deps` and returns the action callbacks.

import { supabase } from "../../lib/supabase";
import { isLeadership } from "../lib/format";
import type {
  Announcement,
  ClubMeeting,
  MeetingRsvpResponse,
  MeetingStatus,
  Member,
} from "../types";

type ActivityActionsDeps = {
  clubId: string;
  currentRole: Member["role"] | "";
  currentMemberId: string;
  setErrorText: (message: string) => void;
  setInfoText: (message: string) => void;
  setLoading: (value: boolean) => void;
  setMeetings: React.Dispatch<React.SetStateAction<ClubMeeting[]>>;
  setAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>>;
  loadMeetings: (clubId: string) => Promise<void>;
  loadPolls: (clubId: string) => Promise<void>;
  loadAnnouncements: (clubId: string) => Promise<void>;
};

export function useActivityActions(deps: ActivityActionsDeps) {
  const {
    clubId,
    currentRole,
    currentMemberId,
    setErrorText,
    setInfoText,
    setLoading,
    setMeetings,
    setAnnouncements,
    loadMeetings,
    loadPolls,
    loadAnnouncements,
  } = deps;

  const createMeeting = async (input: {
    title: string;
    description: string;
    location: string;
    scheduledAt: string;
  }) => {
    setErrorText("");
    setInfoText("");

    if (!clubId || !currentMemberId) {
      setErrorText("Open a club first.");
      return;
    }
    if (!isLeadership(currentRole)) {
      setErrorText(
        "Only an owner, treasurer or secretary can schedule meetings.",
      );
      return;
    }
    const title = input.title.trim();
    if (!title) {
      setErrorText("Meeting title is required.");
      return;
    }
    if (
      !input.scheduledAt ||
      Number.isNaN(new Date(input.scheduledAt).getTime())
    ) {
      setErrorText("Please choose a meeting date and time.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("club_meetings").insert({
      club_id: clubId,
      title,
      description: input.description.trim() || null,
      location: input.location.trim() || null,
      scheduled_at: input.scheduledAt,
      created_by: currentMemberId,
    });
    setLoading(false);

    if (error) {
      setErrorText(error.message);
      return;
    }

    await loadMeetings(clubId);
    setInfoText(`Meeting "${title}" scheduled.`);
  };

  const updateMeetingStatus = async (
    meetingId: string,
    status: MeetingStatus,
  ) => {
    setErrorText("");
    setInfoText("");

    if (!clubId) {
      setErrorText("Open a club first.");
      return;
    }
    if (!isLeadership(currentRole)) {
      setErrorText(
        "Only an owner, treasurer or secretary can update meetings.",
      );
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("club_meetings")
      .update({ status })
      .eq("id", meetingId)
      .eq("club_id", clubId);
    setLoading(false);

    if (error) {
      setErrorText(error.message);
      return;
    }

    await loadMeetings(clubId);
  };

  // Records the caller's own RSVP to an upcoming meeting. Optimistically
  // patches the local meeting (response + tally) so the control reacts
  // instantly, then upserts and reverts on error.
  const setMeetingRsvp = async (
    meetingId: string,
    response: MeetingRsvpResponse,
  ) => {
    if (!clubId || !currentMemberId) {
      setErrorText("Open a club first.");
      return;
    }

    let previous: ClubMeeting | undefined;
    setMeetings((prev) =>
      prev.map((meeting) => {
        if (meeting.id !== meetingId) {
          return meeting;
        }
        previous = meeting;
        const counts = { ...meeting.rsvpCounts };
        if (meeting.myRsvp) {
          counts[meeting.myRsvp] = Math.max(0, counts[meeting.myRsvp] - 1);
        }
        counts[response] += 1;
        return { ...meeting, myRsvp: response, rsvpCounts: counts };
      }),
    );

    const { error } = await supabase.from("meeting_rsvps").upsert(
      {
        club_id: clubId,
        meeting_id: meetingId,
        member_id: currentMemberId,
        response,
      },
      { onConflict: "meeting_id,member_id" },
    );

    if (error) {
      // Revert the optimistic patch on failure.
      if (previous) {
        const snapshot = previous;
        setMeetings((prev) =>
          prev.map((meeting) =>
            meeting.id === meetingId ? snapshot : meeting,
          ),
        );
      }
      setErrorText(error.message);
      return;
    }

    await loadMeetings(clubId);
  };

  const updateMeeting = async (
    meetingId: string,
    input: {
      title: string;
      description: string;
      location: string;
      scheduledAt: string;
    },
  ) => {
    setErrorText("");
    setInfoText("");

    if (!clubId) {
      setErrorText("Open a club first.");
      return;
    }
    if (!isLeadership(currentRole)) {
      setErrorText("Only an owner, treasurer or secretary can edit meetings.");
      return;
    }
    const title = input.title.trim();
    if (!title) {
      setErrorText("Meeting title is required.");
      return;
    }
    if (
      !input.scheduledAt ||
      Number.isNaN(new Date(input.scheduledAt).getTime())
    ) {
      setErrorText("Please choose a meeting date and time.");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("club_meetings")
      .update({
        title,
        description: input.description.trim() || null,
        location: input.location.trim() || null,
        scheduled_at: input.scheduledAt,
      })
      .eq("id", meetingId)
      .eq("club_id", clubId);
    setLoading(false);

    if (error) {
      setErrorText(error.message);
      return;
    }

    await loadMeetings(clubId);
    setInfoText(`Meeting "${title}" updated.`);
  };

  const createPoll = async (input: {
    question: string;
    options: string[];
    closesAt: string;
  }) => {
    setErrorText("");
    setInfoText("");

    if (!clubId || !currentMemberId) {
      setErrorText("Open a club first.");
      return;
    }
    if (!isLeadership(currentRole)) {
      setErrorText("Only an owner, treasurer or secretary can create polls.");
      return;
    }
    const question = input.question.trim();
    if (!question) {
      setErrorText("Poll question is required.");
      return;
    }
    const options = input.options.map((o) => o.trim()).filter(Boolean);
    if (options.length < 2) {
      setErrorText("Add at least two options.");
      return;
    }
    if (options.length > 10) {
      setErrorText("A poll can have at most 10 options.");
      return;
    }
    if (input.closesAt && !/^\d{4}-\d{2}-\d{2}$/.test(input.closesAt)) {
      setErrorText("Close date must be in YYYY-MM-DD format.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("club_polls").insert({
      club_id: clubId,
      question,
      options,
      closes_at: input.closesAt ? input.closesAt : null,
      created_by: currentMemberId,
    });
    setLoading(false);

    if (error) {
      setErrorText(error.message);
      return;
    }

    await loadPolls(clubId);
    setInfoText("Poll created.");
  };

  const castVote = async (pollId: string, optionIndex: number) => {
    setErrorText("");
    setInfoText("");

    if (!clubId || !currentMemberId) {
      setErrorText("Open a club first.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("poll_votes").upsert(
      {
        club_id: clubId,
        poll_id: pollId,
        member_id: currentMemberId,
        option_index: optionIndex,
      },
      { onConflict: "poll_id,member_id" },
    );
    setLoading(false);

    if (error) {
      setErrorText(error.message);
      return;
    }

    await loadPolls(clubId);
  };

  const closePoll = async (pollId: string) => {
    setErrorText("");
    setInfoText("");

    if (!clubId) {
      setErrorText("Open a club first.");
      return;
    }
    if (!isLeadership(currentRole)) {
      setErrorText("Only an owner, treasurer or secretary can close polls.");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("club_polls")
      .update({ status: "closed" })
      .eq("id", pollId)
      .eq("club_id", clubId);
    setLoading(false);

    if (error) {
      setErrorText(error.message);
      return;
    }

    await loadPolls(clubId);
    setInfoText("Poll closed.");
  };

  const createAnnouncement = async (input: { title: string; body: string }) => {
    setErrorText("");
    setInfoText("");

    if (!clubId || !currentMemberId) {
      setErrorText("Open a club first.");
      return;
    }
    if (!isLeadership(currentRole)) {
      setErrorText(
        "Only an owner, treasurer or secretary can post announcements.",
      );
      return;
    }
    const title = input.title.trim();
    const body = input.body.trim();
    if (!title) {
      setErrorText("Announcement title is required.");
      return;
    }
    if (!body) {
      setErrorText("Announcement message is required.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("club_announcements").insert({
      club_id: clubId,
      title,
      body,
      created_by: currentMemberId,
    });
    setLoading(false);

    if (error) {
      setErrorText(error.message);
      return;
    }

    await loadAnnouncements(clubId);
    setInfoText("Announcement posted.");
  };

  const setAnnouncementRead = async (announcementId: string, read: boolean) => {
    if (!clubId || !currentMemberId) {
      return;
    }

    // Optimistically update the local list so the badge and item react fast.
    setAnnouncements((prev) =>
      prev.map((item) =>
        item.id === announcementId ? { ...item, isRead: read } : item,
      ),
    );

    if (read) {
      const { error } = await supabase.from("announcement_reads").upsert(
        {
          announcement_id: announcementId,
          member_id: currentMemberId,
          club_id: clubId,
        },
        { onConflict: "announcement_id,member_id" },
      );
      if (error) {
        setAnnouncements((prev) =>
          prev.map((item) =>
            item.id === announcementId ? { ...item, isRead: false } : item,
          ),
        );
      }
    } else {
      const { error } = await supabase
        .from("announcement_reads")
        .delete()
        .eq("announcement_id", announcementId)
        .eq("member_id", currentMemberId);
      if (error) {
        setAnnouncements((prev) =>
          prev.map((item) =>
            item.id === announcementId ? { ...item, isRead: true } : item,
          ),
        );
      }
    }
  };

  return {
    createMeeting,
    updateMeetingStatus,
    updateMeeting,
    setMeetingRsvp,
    createPoll,
    castVote,
    closePoll,
    createAnnouncement,
    setAnnouncementRead,
  };
}
