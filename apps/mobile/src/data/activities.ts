// Data-access for the activity domain: meetings, polls (with vote tallies) and
// announcements (with the caller's read state). Pure async fetchers.

import { supabase } from "../../lib/supabase";
import type {
  Announcement,
  ClubMeeting,
  MeetingRsvpResponse,
  MeetingStatus,
  Poll,
  PollStatus,
} from "../types";

// Returns meetings with per-meeting RSVP tallies and the caller's own RSVP
// (resolved via `myMemberId`).
export async function fetchMeetings(
  clubId: string,
  myMemberId: string,
): Promise<ClubMeeting[]> {
  const { data, error } = await supabase
    .from("club_meetings")
    .select("id,title,description,location,scheduled_at,status,members(name)")
    .eq("club_id", clubId)
    .order("scheduled_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  const meetingIds = data.map((row: any) => row.id);
  let rsvps: any[] = [];
  if (meetingIds.length > 0) {
    const { data: rsvpData } = await supabase
      .from("meeting_rsvps")
      .select("meeting_id,response,member_id")
      .in("meeting_id", meetingIds);
    rsvps = rsvpData ?? [];
  }

  return data.map((row: any) => {
    const creator = Array.isArray(row.members) ? row.members[0] : row.members;
    const rsvpCounts = { yes: 0, no: 0, maybe: 0 };
    let myRsvp: MeetingRsvpResponse | null = null;
    for (const rsvp of rsvps) {
      if (rsvp.meeting_id !== row.id) continue;
      if (rsvp.response in rsvpCounts) {
        rsvpCounts[rsvp.response as MeetingRsvpResponse] += 1;
      }
      if (myMemberId && rsvp.member_id === myMemberId) {
        myRsvp = rsvp.response as MeetingRsvpResponse;
      }
    }
    return {
      id: row.id,
      title: row.title,
      description: row.description ?? null,
      location: row.location ?? null,
      scheduledAt: row.scheduled_at ?? "",
      status: row.status as MeetingStatus,
      createdByName: creator?.name ?? "Someone",
      myRsvp,
      rsvpCounts,
    } satisfies ClubMeeting;
  });
}

// Returns polls with per-option vote counts, total votes and the caller's own
// selected option (resolved via `myMemberId`).
export async function fetchPolls(
  clubId: string,
  myMemberId: string,
): Promise<Poll[]> {
  const { data, error } = await supabase
    .from("club_polls")
    .select("id,question,options,status,closes_at,created_at,members(name)")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  const pollIds = data.map((row: any) => row.id);
  let votes: any[] = [];
  if (pollIds.length > 0) {
    const { data: voteData } = await supabase
      .from("poll_votes")
      .select("poll_id,option_index,member_id")
      .in("poll_id", pollIds);
    votes = voteData ?? [];
  }

  return data.map((row: any) => {
    const creator = Array.isArray(row.members) ? row.members[0] : row.members;
    const options: string[] = Array.isArray(row.options) ? row.options : [];
    const voteCounts = options.map(() => 0);
    let totalVotes = 0;
    let myOptionIndex: number | null = null;
    for (const vote of votes) {
      if (vote.poll_id !== row.id) continue;
      totalVotes += 1;
      const idx = vote.option_index;
      if (typeof idx === "number" && idx >= 0 && idx < voteCounts.length) {
        voteCounts[idx] += 1;
      }
      if (myMemberId && vote.member_id === myMemberId) {
        myOptionIndex = typeof idx === "number" ? idx : null;
      }
    }
    return {
      id: row.id,
      question: row.question,
      options,
      status: row.status as PollStatus,
      closesAt: row.closes_at ?? null,
      createdByName: creator?.name ?? "Someone",
      createdAt: row.created_at ?? "",
      voteCounts,
      totalVotes,
      myOptionIndex,
    } satisfies Poll;
  });
}

// Returns announcements with the caller's read state (resolved via the
// announcement_reads join for `myMemberId`).
export async function fetchAnnouncements(
  clubId: string,
  myMemberId: string,
): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from("club_announcements")
    .select("id,title,body,created_at,members(name)")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) {
    return [];
  }

  const announcementIds = data.map((row: any) => row.id);
  let readIds = new Set<string>();
  if (myMemberId && announcementIds.length > 0) {
    const { data: reads } = await supabase
      .from("announcement_reads")
      .select("announcement_id")
      .eq("member_id", myMemberId)
      .in("announcement_id", announcementIds);
    readIds = new Set((reads ?? []).map((row: any) => row.announcement_id));
  }

  return data.map((row: any) => {
    const creator = Array.isArray(row.members) ? row.members[0] : row.members;
    return {
      id: row.id,
      title: row.title,
      body: row.body,
      createdByName: creator?.name ?? "Someone",
      createdAt: row.created_at ?? "",
      isRead: readIds.has(row.id),
    } satisfies Announcement;
  });
}
