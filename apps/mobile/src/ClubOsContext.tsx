import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { NotificationsApi, registerForPushNotifications } from "./push";
import type {
  Announcement,
  ClubMeeting,
  ContactOption,
  DuesCycle,
  DuesFrequency,
  DuesPlan,
  DuesSummary,
  Invite,
  LedgerEntry,
  MeetingStatus,
  Member,
  MemberDue,
  MembershipRequest,
  MyClub,
  Poll,
  PollStatus,
  Screen,
  TransactionType,
} from "./types";
import { canManageFinances, deriveDuesSummary } from "./dues";
import { buildInviteLink, isLeadership, mapRole, normalizePhone } from "./lib/format";
import { fetchMembershipRequests, fetchMyClubs } from "./data/clubs";
import { fetchMembers } from "./data/members";
import {
  fetchDuesCycles,
  fetchDuesPlans,
  fetchLedger,
  fetchMemberDues,
} from "./data/dues";
import {
  fetchAnnouncements,
  fetchMeetings,
  fetchPolls,
} from "./data/activities";
import { useActivityActions } from "./context/useActivityActions";
import { useAuthActions } from "./context/useAuthActions";
import { useClubProfileActions } from "./context/useClubProfileActions";
import { useDuesActions } from "./context/useDuesActions";
import { useMemberActions } from "./context/useMemberActions";
import { useProfileActions } from "./context/useProfileActions";
import { emailRedirectUrl } from "./lib/email";
import { useStableApi } from "./lib/useStableApi";
import {
  ActivitiesContext,
  AuthContext,
  ClubsContext,
  DuesContext,
  MembersContext,
  NavigationContext,
  ProfileContext,
  ToastContext,
  UiContext,
  useDomainContext,
  type ActivitiesContextValue,
  type AuthContextValue,
  type ClubsContextValue,
  type DuesContextValue,
  type MembersContextValue,
  type NavigationContextValue,
  type ProfileContextValue,
  type ToastContextValue,
  type UiContextValue,
} from "./context/domainContexts";

const ACTIVE_CLUB_KEY = "clubos.activeClub";

export type ToastKind = "success" | "error" | "info";

export type ToastMessage = {
  id: number;
  message: string;
  kind: ToastKind;
};

const screenToPath: Record<Screen, string> = {
  otp: "/",
  profileSetup: "/profile-setup",
  memberRequests: "/member-requests",
  home: "/home",
  club: "/club",
  memberProfile: "/member-profile",
  members: "/members",
  activity: "/activity",
  economy: "/economy",
  setup: "/setup",
};

// Roles permitted to manage club activities (meetings, polls, announcements).
// See `isLeadership` in ./lib/format.

export type ClubOsContextValue = {
  phone: string;
  setPhone: (value: string) => void;
  otp: string;
  setOtp: (value: string) => void;
  otpSent: boolean;
  clubName: string;
  setClubName: (value: string) => void;
  clubDescription: string;
  setClubDescription: (value: string) => void;
  members: Member[];
  invites: Invite[];
  membershipRequests: MembershipRequest[];
  myClubs: MyClub[];
  memberDues: MemberDue[];
  duesSummary: DuesSummary;
  duesLoading: boolean;
  duesPlans: DuesPlan[];
  duesCycles: DuesCycle[];
  ledgerEntries: LedgerEntry[];
  canManageDues: boolean;
  meetings: ClubMeeting[];
  polls: Poll[];
  announcements: Announcement[];
  activityLoading: boolean;
  canManageActivities: boolean;
  currentRole: Member["role"] | "";
  currentMemberId: string;
  invitePhone: string;
  setInvitePhone: (value: string) => void;
  inviteName: string;
  setInviteName: (value: string) => void;
  inviteEmail: string;
  setInviteEmail: (value: string) => void;
  contactOptions: ContactOption[];
  contactsVisible: boolean;
  setContactsVisible: (value: boolean) => void;
  contactsLoading: boolean;
  contactsPermission: "unknown" | "granted" | "denied";
  pendingClubName: string;
  onboardName: string;
  setOnboardName: (value: string) => void;
  onboardEmail: string;
  setOnboardEmail: (value: string) => void;
  onboardLocation: string;
  setOnboardLocation: (value: string) => void;
  onboardSkills: string;
  setOnboardSkills: (value: string) => void;
  onboardAvatarUrl: string;
  uploadingAvatar: boolean;
  pickAndUploadAvatar: () => Promise<void>;
  emailVerified: boolean;
  emailPending: boolean;
  resendEmailVerification: () => Promise<void>;
  clubLogoUrl: string;
  uploadingClubLogo: boolean;
  pickAndUploadClubLogo: () => Promise<void>;
  loading: boolean;
  toast: ToastMessage | null;
  notify: (message: string, kind?: ToastKind) => void;
  dismissToast: () => void;
  session: Session | null;
  clubId: string;
  activeClubName: string;
  paidCount: number;
  unpaidCount: number;
  collectionPercent: number;
  navigate: (screen: Screen) => void;
  sendOtp: () => Promise<void>;
  verifyOtpAndContinue: () => Promise<void>;
  completeBasicProfile: () => Promise<void>;
  completeMemberOnboarding: () => Promise<void>;
  acceptMembershipRequest: (request: MembershipRequest) => Promise<void>;
  declineMembershipRequest: (request: MembershipRequest) => Promise<void>;
  declineInviteFromHome: (request: MembershipRequest) => Promise<void>;
  createClub: () => Promise<void>;
  inviteMember: () => Promise<void>;
  loadContacts: () => Promise<void>;
  selectContact: (contact: ContactOption) => void;
  requestContactsForInvite: () => Promise<"granted" | "denied">;
  inviteContacts: (contacts: ContactOption[]) => Promise<number>;
  goHome: () => Promise<void>;
  openClub: (clubId: string, name: string) => Promise<void>;
  switchClub: (clubId: string, name: string) => Promise<void>;
  refreshDues: () => Promise<void>;
  createDuesPlan: (input: {
    name: string;
    amount: number;
    frequency: DuesFrequency;
    graceDays: number;
    autoGenerate: boolean;
    startDate: string;
  }) => Promise<void>;
  updateDuesPlan: (
    planId: string,
    input: {
      name: string;
      amount: number;
      frequency: DuesFrequency;
      graceDays: number;
      autoGenerate: boolean;
      startDate: string;
    },
  ) => Promise<void>;
  createDuesCycle: (input: {
    duesPlanId: string;
    cycleLabel: string;
    dueDate: string;
  }) => Promise<void>;
  updateDuesCycle: (
    cycleId: string,
    input: {
      duesPlanId: string;
      cycleLabel: string;
      dueDate: string;
    },
  ) => Promise<void>;
  generateDues: (cycleId: string) => Promise<void>;
  ensureAutoDuesCycles: (options?: { announce?: boolean }) => Promise<void>;
  recordTransaction: (input: {
    type: TransactionType;
    amount: number;
    category: string;
    paymentMethod: string;
    description: string;
  }) => Promise<void>;
  startDuePayment: (due: MemberDue) => Promise<void>;
  sendDuePaymentLinks: (input: {
    cycleId?: string;
    dueId?: string;
  }) => Promise<void>;
  refreshActivities: () => Promise<void>;
  createMeeting: (input: {
    title: string;
    description: string;
    location: string;
    scheduledAt: string;
  }) => Promise<void>;
  updateMeetingStatus: (
    meetingId: string,
    status: MeetingStatus,
  ) => Promise<void>;
  updateMeeting: (
    meetingId: string,
    input: {
      title: string;
      description: string;
      location: string;
      scheduledAt: string;
    },
  ) => Promise<void>;
  createPoll: (input: {
    question: string;
    options: string[];
    closesAt: string;
  }) => Promise<void>;
  castVote: (pollId: string, optionIndex: number) => Promise<void>;
  closePoll: (pollId: string) => Promise<void>;
  createAnnouncement: (input: { title: string; body: string }) => Promise<void>;
  setAnnouncementRead: (announcementId: string, read: boolean) => Promise<void>;
  resumeOnboarding: (request: MembershipRequest) => void;
  startCreateClub: () => void;
  loadClubProfile: () => Promise<void>;
  loadMyProfile: () => Promise<void>;
  updateClubProfile: (name: string, description: string) => Promise<void>;
  updateMemberRole: (
    memberId: string,
    newRole: Member["role"],
  ) => Promise<void>;
  saveProfile: () => Promise<void>;
  leaveClub: () => Promise<void>;
  logout: () => Promise<void>;
};

// Back-compat composite of every domain context. Prefer the focused domain
// hooks in ./context/domainHooks — they read a single context each and so avoid
// the cross-domain re-renders this composite would incur.
export function useClubOs(): ClubOsContextValue {
  return {
    ...useDomainContext(UiContext),
    ...useDomainContext(ToastContext),
    ...useDomainContext(NavigationContext),
    ...useDomainContext(AuthContext),
    ...useDomainContext(ProfileContext),
    ...useDomainContext(ClubsContext),
    ...useDomainContext(MembersContext),
    ...useDomainContext(DuesContext),
    ...useDomainContext(ActivitiesContext),
  };
}

export function ClubOsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [clubName, setClubName] = useState("");
  const [clubDescription, setClubDescription] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [membershipRequests, setMembershipRequests] = useState<
    MembershipRequest[]
  >([]);
  const [myClubs, setMyClubs] = useState<MyClub[]>([]);
  const [memberDues, setMemberDues] = useState<MemberDue[]>([]);
  const [duesLoading, setDuesLoading] = useState(false);
  const [duesPlans, setDuesPlans] = useState<DuesPlan[]>([]);
  const [duesCycles, setDuesCycles] = useState<DuesCycle[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [meetings, setMeetings] = useState<ClubMeeting[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [currentRole, setCurrentRole] = useState<Member["role"] | "">("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [contactOptions, setContactOptions] = useState<ContactOption[]>([]);
  const [contactsVisible, setContactsVisible] = useState(false);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsPermission, setContactsPermission] = useState<
    "unknown" | "granted" | "denied"
  >("unknown");
  const [currentMemberId, setCurrentMemberId] = useState("");
  const [pendingMemberId, setPendingMemberId] = useState("");
  const [pendingClubId, setPendingClubId] = useState("");
  const [pendingClubName, setPendingClubName] = useState("");
  const [onboardName, setOnboardName] = useState("");
  const [onboardEmail, setOnboardEmail] = useState("");
  const [onboardLocation, setOnboardLocation] = useState("");
  const [onboardSkills, setOnboardSkills] = useState("");
  const [onboardAvatarUrl, setOnboardAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [clubLogoUrl, setClubLogoUrl] = useState("");
  const [uploadingClubLogo, setUploadingClubLogo] = useState(false);
  const [postProfileNextScreen, setPostProfileNextScreen] = useState<
    "club" | "members" | "home"
  >("club");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  // Expo push token registered for THIS device, retained so we can remove it on
  // logout (otherwise the device would keep receiving the user's pushes).
  const pushTokenRef = useRef<string | null>(null);

  // Single source of action feedback. Renders as an auto-dismissing toast at
  // the root. setErrorText/setInfoText are thin wrappers kept so the many
  // existing call sites keep working while routing through the toast.
  const notify = (message: string, kind: ToastKind = "info") => {
    if (!message) {
      return;
    }
    setToast({ id: Date.now() + Math.random(), message, kind });
  };
  const dismissToast = () => setToast(null);
  const setErrorText = (message: string) => notify(message, "error");
  const setInfoText = (message: string) => notify(message, "success");
  const [clubId, setClubId] = useState("");
  const [activeClubName, setActiveClubName] = useState("");

  const navigate = (screen: Screen) => {
    router.replace(screenToPath[screen] as never);
  };

  // Persist the active club locally so the user lands back in the same club
  // context after an app restart.
  const persistActiveClub = async (targetClubId: string, name: string) => {
    try {
      await AsyncStorage.setItem(
        ACTIVE_CLUB_KEY,
        JSON.stringify({ clubId: targetClubId, name }),
      );
    } catch {
      // Non-fatal: a failed write just means we fall back to the first club.
    }
  };

  const readPersistedActiveClub = async (): Promise<{
    clubId: string;
    name: string;
  } | null> => {
    try {
      const raw = await AsyncStorage.getItem(ACTIVE_CLUB_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.clubId === "string") {
        return { clubId: parsed.clubId, name: parsed.name ?? "" };
      }
      return null;
    } catch {
      return null;
    }
  };

  const clearPersistedActiveClub = async () => {
    try {
      await AsyncStorage.removeItem(ACTIVE_CLUB_KEY);
    } catch {
      // Non-fatal.
    }
  };

  const resetOnboardingState = () => {
    setOtpSent(false);
    setOtp("");
    setPhone("");
    setClubName("");
    setClubDescription("");
    setClubLogoUrl("");
    setMembers([]);
    setCurrentRole("");
    setInvites([]);
    setMembershipRequests([]);
    setMyClubs([]);
    setMemberDues([]);
    setDuesPlans([]);
    setDuesCycles([]);
    setLedgerEntries([]);
    setInviteName("");
    setInvitePhone("");
    setInviteEmail("");
    setContactOptions([]);
    setContactsVisible(false);
    setContactsPermission("unknown");
    setCurrentMemberId("");
    setPendingMemberId("");
    setPendingClubId("");
    setPendingClubName("");
    setOnboardName("");
    setOnboardEmail("");
    setOnboardLocation("");
    setOnboardSkills("");
    setOnboardAvatarUrl("");
    setPostProfileNextScreen("club");
    setClubId("");
    setActiveClubName("");
    navigate("otp");
  };

  useEffect(() => {
    const bootstrapAuth = async () => {
      const {
        data: { session: existingSession },
      } = await supabase.auth.getSession();
      setSession(existingSession);
      if (existingSession) {
        await detectPostLoginFlow();
      }
    };

    bootstrapAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, updatedSession) => {
      setSession(updatedSession);
      if (updatedSession) {
        void detectPostLoginFlow();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Register this device's Expo push token whenever a user is signed in, so the
  // backend can deliver pushes (meetings, polls, dues) while the app is closed.
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const registration = await registerForPushNotifications();
      if (cancelled || !registration) {
        return;
      }
      pushTokenRef.current = registration.token;
      try {
        await supabase.from("device_push_tokens").upsert(
          {
            user_id: userId,
            token: registration.token,
            platform: registration.platform,
          },
          { onConflict: "token" },
        );
      } catch {
        // Non-fatal: push delivery just won't reach this device.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  // Route the user to the relevant tab when they tap a push notification.
  useEffect(() => {
    const subscription =
      NotificationsApi.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as {
          type?: string;
        };
        switch (data?.type) {
          case "meeting_scheduled":
          case "poll_created":
          case "announcement":
            navigate("activity");
            break;
          case "dues_assigned":
          case "dues_overdue":
          case "dues_paid":
            navigate("economy");
            break;
          case "dues_payment_link": {
            const url = (
              response.notification.request.content.data as { url?: string }
            )?.url;
            if (url) {
              void WebBrowser.openBrowserAsync(url);
            } else {
              navigate("economy");
            }
            break;
          }
          default:
            break;
        }
      });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadHomeData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return;
    }

    setMyClubs(await fetchMyClubs(user.id));

    const normalizedPhone = normalizePhone(user.phone ?? "");
    if (normalizedPhone) {
      await loadMembershipRequests(normalizedPhone);
    } else {
      setMembershipRequests([]);
    }
  };

  const goHome = async () => {
    setErrorText("");
    setInfoText("");
    await loadHomeData();
    navigate("home");
  };

  const openClub = async (targetClubId: string, name: string) => {
    setErrorText("");
    setInfoText("");
    setClubId(targetClubId);
    setActiveClubName(name);
    void persistActiveClub(targetClubId, name);
    setLoading(true);
    await Promise.all([
      loadMembers(targetClubId),
      loadInvites(targetClubId),
      loadDues(targetClubId),
      loadDuesPlans(targetClubId),
      loadDuesCycles(targetClubId),
      loadLedger(targetClubId),
      loadMeetings(targetClubId),
      loadPolls(targetClubId),
      loadAnnouncements(targetClubId),
    ]);
    setLoading(false);
    navigate("members");
  };

  // Swaps the active club context without leaving the current tab. Used by the
  // header club switcher so the user stays on whichever domain tab they are on.
  const switchClub = async (targetClubId: string, name: string) => {
    if (targetClubId === clubId) {
      return;
    }
    setErrorText("");
    setInfoText("");
    setClubId(targetClubId);
    setActiveClubName(name);
    void persistActiveClub(targetClubId, name);
    setLoading(true);
    await Promise.all([
      loadMembers(targetClubId),
      loadInvites(targetClubId),
      loadDues(targetClubId),
      loadDuesPlans(targetClubId),
      loadDuesCycles(targetClubId),
      loadLedger(targetClubId),
      loadMeetings(targetClubId),
      loadPolls(targetClubId),
      loadAnnouncements(targetClubId),
    ]);
    setLoading(false);
  };

  const refreshDues = async () => {
    if (!clubId) {
      return;
    }
    await Promise.all([
      loadDues(clubId),
      loadDuesPlans(clubId),
      loadDuesCycles(clubId),
      loadLedger(clubId),
    ]);
  };

  const loadMembershipRequests = async (invitedPhone: string) => {
    const requests = await fetchMembershipRequests(invitedPhone);
    setMembershipRequests(requests);
    return requests;
  };

  const loadMembers = async (activeClubId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const result = await fetchMembers(activeClubId, user?.id);
    if (!result) {
      return;
    }

    setCurrentMemberId(result.myMemberId);
    setCurrentRole(result.myRole);
    setMembers(result.members);
  };

  const loadDues = async (activeClubId: string) => {
    setDuesLoading(true);

    const mapped = await fetchMemberDues(activeClubId);
    setMemberDues(mapped);

    const billedMemberIds = new Set(mapped.map((due) => due.memberId));
    const outstandingMemberIds = new Set(
      mapped
        .filter((due) => due.status === "pending" || due.status === "overdue")
        .map((due) => due.memberId),
    );
    setMembers((prev) =>
      prev.map((member) => ({
        ...member,
        duesPaid:
          billedMemberIds.has(member.id) &&
          !outstandingMemberIds.has(member.id),
      })),
    );

    setDuesLoading(false);
  };

  const loadDuesPlans = async (activeClubId: string) => {
    setDuesPlans(await fetchDuesPlans(activeClubId));
  };

  const loadDuesCycles = async (activeClubId: string) => {
    setDuesCycles(await fetchDuesCycles(activeClubId));
  };

  const loadLedger = async (activeClubId: string) => {
    setLedgerEntries(await fetchLedger(activeClubId));
  };

  const loadMeetings = async (activeClubId: string) => {
    setMeetings(await fetchMeetings(activeClubId));
  };

  const loadPolls = async (activeClubId: string) => {
    setPolls(await fetchPolls(activeClubId, currentMemberId));
  };

  const loadAnnouncements = async (activeClubId: string) => {
    setAnnouncements(await fetchAnnouncements(activeClubId, currentMemberId));
  };

  const refreshActivities = async () => {
    if (!clubId) {
      return;
    }
    setActivityLoading(true);
    await Promise.all([
      loadMeetings(clubId),
      loadPolls(clubId),
      loadAnnouncements(clubId),
    ]);
    setActivityLoading(false);
  };

  const {
    createMeeting,
    updateMeetingStatus,
    updateMeeting,
    createPoll,
    castVote,
    closePoll,
    createAnnouncement,
    setAnnouncementRead,
  } = useActivityActions({
    clubId,
    currentRole,
    currentMemberId,
    setErrorText,
    setInfoText,
    setLoading,
    setAnnouncements,
    loadMeetings,
    loadPolls,
    loadAnnouncements,
  });

  const {
    ensureAutoDuesCycles,
    createDuesPlan,
    updateDuesPlan,
    createDuesCycle,
    updateDuesCycle,
    generateDues,
    recordTransaction,
    startDuePayment,
    sendDuePaymentLinks,
  } = useDuesActions({
    clubId,
    currentRole,
    currentMemberId,
    duesPlans,
    setErrorText,
    setInfoText,
    setLoading,
    loadDues,
    loadDuesPlans,
    loadDuesCycles,
    loadLedger,
    refreshDues,
  });

  const detectPostLoginFlow = async () => {
    setErrorText("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.id) {
      navigate("otp");
      return;
    }

    const metadataName =
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name.trim()
        : "";
    const metadataEmail =
      typeof user.user_metadata?.member_email === "string"
        ? user.user_metadata.member_email.trim()
        : "";
    const metadataLocation =
      typeof user.user_metadata?.location === "string"
        ? user.user_metadata.location
        : "";
    const metadataSkills =
      typeof user.user_metadata?.skills === "string"
        ? user.user_metadata.skills
        : "";
    const hasBasicProfile = Boolean(
      metadataName && (metadataEmail || user.email),
    );

    // Populate the editable profile fields for every authenticated user so the
    // Setup tab's "Your profile" always reflects the logged-in account, even
    // when the user lands straight in a club (active-membership branch below).
    setOnboardName(metadataName);
    setOnboardEmail(metadataEmail || user.email || "");
    setOnboardLocation(metadataLocation);
    setOnboardSkills(metadataSkills);
    setOnboardAvatarUrl(
      typeof user.user_metadata?.avatar_url === "string"
        ? user.user_metadata.avatar_url
        : "",
    );

    const { data: activeMemberships, error: activeMembershipsError } =
      await supabase
        .from("members")
        .select("id,club_id,membership_status")
        .eq("user_id", user.id)
        .eq("membership_status", "active")
        .order("created_at", { ascending: true });

    if (!activeMembershipsError && activeMemberships && activeMemberships[0]) {
      const persisted = await readPersistedActiveClub();
      const persistedMatch = persisted
        ? activeMemberships.find(
            (membership) => membership.club_id === persisted.clubId,
          )
        : undefined;
      const activeClubId = persistedMatch
        ? persistedMatch.club_id
        : activeMemberships[0].club_id;
      setClubId(activeClubId);
      const { data: activeClub } = await supabase
        .from("clubs")
        .select("name")
        .eq("id", activeClubId)
        .maybeSingle();
      const activeName = activeClub?.name ?? persisted?.name ?? "";
      setActiveClubName(activeName);

      if (!hasBasicProfile) {
        setOnboardName(metadataName);
        setOnboardEmail(metadataEmail || user.email || "");
        setOnboardLocation(metadataLocation);
        setOnboardSkills(metadataSkills);
        setPostProfileNextScreen("home");
        navigate("profileSetup");
        return;
      }

      await loadHomeData();
      await openClub(activeClubId, activeName);
      return;
    }

    const normalizedPhone = normalizePhone(user.phone ?? "");
    if (!normalizedPhone) {
      navigate("club");
      return;
    }

    const pendingRequests = await loadMembershipRequests(normalizedPhone);
    if (pendingRequests.length > 0) {
      setOnboardName(metadataName);
      setOnboardEmail(metadataEmail || user.email || "");
      setOnboardLocation(metadataLocation);
      setOnboardSkills(metadataSkills);

      const pendingOnly = pendingRequests.filter(
        (request) => request.status === "pending",
      );

      if (pendingOnly.length === 0) {
        const resumedRequest = pendingRequests[0];
        if (!resumedRequest.memberId) {
          setInfoText(
            `Invite found for ${resumedRequest.clubName}, but member record is missing. Ask owner to resend invite.`,
          );
          navigate("memberRequests");
          return;
        }
        setPendingMemberId(resumedRequest.memberId);
        setPendingClubId(resumedRequest.clubId);
        setPendingClubName(resumedRequest.clubName);
        setInfoText(`Continue onboarding for ${resumedRequest.clubName}.`);
        navigate("memberProfile");
        return;
      }

      await loadHomeData();
      navigate("home");
      return;
    }

    const { data: fallbackInvitedRows, error: fallbackInvitedError } =
      await supabase
        .from("members")
        .select("id,club_id")
        .eq("phone", normalizedPhone)
        .is("user_id", null)
        .eq("membership_status", "invited")
        .order("created_at", { ascending: false })
        .limit(1);

    if (
      !fallbackInvitedError &&
      fallbackInvitedRows &&
      fallbackInvitedRows[0]
    ) {
      const fallbackInvite = fallbackInvitedRows[0];
      const { data: fallbackClub } = await supabase
        .from("clubs")
        .select("name")
        .eq("id", fallbackInvite.club_id)
        .maybeSingle();

      setPendingMemberId(fallbackInvite.id);
      setPendingClubId(fallbackInvite.club_id);
      setPendingClubName(fallbackClub?.name ?? "Your club");
      setOnboardName(metadataName);
      setOnboardEmail(metadataEmail || user.email || "");
      setOnboardLocation(metadataLocation);
      setOnboardSkills(metadataSkills);
      setInfoText("Invitation found. Please complete member onboarding.");
      navigate("memberProfile");
      return;
    }

    if (!hasBasicProfile) {
      setOnboardName(metadataName);
      setOnboardEmail(metadataEmail || user.email || "");
      setOnboardLocation(metadataLocation);
      setOnboardSkills(metadataSkills);
      setPostProfileNextScreen("home");
      navigate("profileSetup");
      return;
    }

    await loadHomeData();
    navigate("home");
  };

  const completeBasicProfile = async () => {
    setErrorText("");
    setInfoText("");

    const trimmedName = onboardName.trim();
    const trimmedEmail = onboardEmail.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail) {
      setErrorText("Please enter your name and email to continue.");
      return;
    }

    setLoading(true);
    const needsEmailVerify =
      trimmedEmail !== (session?.user?.email ?? "").toLowerCase();
    const { error } = await supabase.auth.updateUser(
      {
        ...(needsEmailVerify ? { email: trimmedEmail } : {}),
        data: {
          full_name: trimmedName,
          member_email: trimmedEmail,
          location: onboardLocation.trim() || null,
          skills: onboardSkills.trim() || null,
          avatar_url: onboardAvatarUrl || null,
          terms_accepted_at: new Date().toISOString(),
        },
      },
      needsEmailVerify ? { emailRedirectTo: emailRedirectUrl() } : undefined,
    );
    setLoading(false);

    if (error) {
      setErrorText(error.message);
      return;
    }

    setInfoText(
      needsEmailVerify
        ? `Profile saved. We sent a verification link to ${trimmedEmail}.`
        : "Profile saved successfully.",
    );
    if (postProfileNextScreen === "home") {
      await loadHomeData();
    }
    navigate(postProfileNextScreen);
  };

  const completeMemberOnboarding = async () => {
    setErrorText("");
    setInfoText("");

    const trimmedName = onboardName.trim();
    const trimmedEmail = onboardEmail.trim().toLowerCase();

    if (!pendingMemberId || !pendingClubId) {
      setErrorText("Invite context missing. Please login again.");
      return;
    }

    if (!trimmedName || !trimmedEmail) {
      setErrorText("Name and email are required to join the club.");
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user?.id) {
      setErrorText("Session not found. Please login again.");
      return;
    }

    setLoading(true);

    const { error: claimMemberError } = await supabase
      .from("members")
      .update({
        user_id: user.id,
        name: trimmedName,
        email: trimmedEmail,
        location: onboardLocation.trim() || null,
        skills: onboardSkills.trim() || null,
        avatar_url: onboardAvatarUrl || null,
        membership_status: "active",
        is_active: true,
      })
      .eq("id", pendingMemberId)
      .is("user_id", null);

    if (claimMemberError) {
      setLoading(false);
      setErrorText(claimMemberError.message);
      return;
    }

    await supabase.auth.updateUser(
      {
        email: trimmedEmail,
        data: {
          full_name: trimmedName,
          member_email: trimmedEmail,
          location: onboardLocation.trim() || null,
          skills: onboardSkills.trim() || null,
          avatar_url: onboardAvatarUrl || null,
          terms_accepted_at: new Date().toISOString(),
        },
      },
      { emailRedirectTo: emailRedirectUrl() },
    );

    setClubId(pendingClubId);
    await Promise.all([loadMembers(pendingClubId), loadInvites(pendingClubId)]);
    setLoading(false);
    setInfoText(
      `Welcome aboard. We sent a verification link to ${trimmedEmail}.`,
    );
    navigate("members");
  };

  const acceptMembershipRequest = async (request: MembershipRequest) => {
    setErrorText("");
    setInfoText("");

    if (!request.memberId) {
      setErrorText(
        `Invite exists for ${request.clubName}, but member row is missing. Ask owner to resend the invite.`,
      );
      return;
    }

    setLoading(true);

    const { error: inviteAcceptError } = await supabase
      .from("club_invites")
      .update({ status: "accepted" })
      .eq("id", request.inviteId)
      .eq("status", "pending");

    if (inviteAcceptError) {
      setLoading(false);
      setErrorText(inviteAcceptError.message);
      return;
    }

    setLoading(false);
    setPendingMemberId(request.memberId);
    setPendingClubId(request.clubId);
    setPendingClubName(request.clubName);
    setInfoText(
      `Membership request accepted for ${request.clubName}. Complete your profile to join.`,
    );
    navigate("memberProfile");
  };

  const declineMembershipRequest = async (request: MembershipRequest) => {
    setErrorText("");
    setInfoText("");
    setLoading(true);

    const { error: inviteDeclineError } = await supabase
      .from("club_invites")
      .update({ status: "revoked" })
      .eq("id", request.inviteId)
      .eq("status", "pending");

    if (inviteDeclineError) {
      setLoading(false);
      setErrorText(inviteDeclineError.message);
      return;
    }

    if (request.memberId) {
      await supabase
        .from("members")
        .update({ membership_status: "left", is_active: false })
        .eq("id", request.memberId)
        .is("user_id", null)
        .eq("membership_status", "invited");
    }

    const normalizedPhone = normalizePhone(phone);
    const refreshed = normalizedPhone
      ? await loadMembershipRequests(normalizedPhone)
      : [];

    setLoading(false);
    if (refreshed.length === 0) {
      setInfoText("Membership request declined.");
      navigate("club");
      return;
    }

    setInfoText(`Declined ${request.clubName} request.`);
    navigate("memberRequests");
  };

  const declineInviteFromHome = async (request: MembershipRequest) => {
    setErrorText("");
    setInfoText("");
    setLoading(true);

    const { error: inviteDeclineError } = await supabase
      .from("club_invites")
      .update({ status: "revoked" })
      .eq("id", request.inviteId)
      .eq("status", "pending");

    if (inviteDeclineError) {
      setLoading(false);
      setErrorText(inviteDeclineError.message);
      return;
    }

    if (request.memberId) {
      await supabase
        .from("members")
        .update({ membership_status: "left", is_active: false })
        .eq("id", request.memberId)
        .is("user_id", null)
        .eq("membership_status", "invited");
    }

    await loadHomeData();
    setLoading(false);
    setInfoText(`Declined ${request.clubName} request.`);
  };

  const loadInvites = async (activeClubId: string) => {
    const { data, error } = await supabase
      .from("club_invites")
      .select("id,invited_phone,invited_email,status,token")
      .eq("club_id", activeClubId)
      .order("created_at", { ascending: false });

    if (error || !data) {
      setInvites([]);
      return;
    }

    setInvites(
      data.map((invite) => ({
        id: invite.id,
        invitedPhone: invite.invited_phone,
        invitedEmail: invite.invited_email,
        status: invite.status,
        token: invite.token,
        inviteLink: buildInviteLink(
          invite.token,
          activeClubName || "Your club",
        ),
      })),
    );
  };

  const { sendOtp, verifyOtpAndContinue } = useAuthActions({
    phone,
    otp,
    setPhone,
    setOtpSent,
    setSession,
    setErrorText,
    setInfoText,
    setLoading,
    detectPostLoginFlow,
  });

  const createClub = async () => {
    setErrorText("");
    setInfoText("");

    if (!isSupabaseConfigured) {
      setErrorText(
        "Supabase env vars are missing. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.",
      );
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user?.id) {
      setErrorText("Session not found. Please log in again.");
      return;
    }

    const trimmedClubName = clubName.trim();
    const trimmedDescription = clubDescription.trim();
    if (!trimmedClubName || !trimmedDescription) {
      setErrorText("Club name and description are required.");
      return;
    }

    setLoading(true);
    const { data: createdClub, error: clubError } = await supabase
      .from("clubs")
      .insert({
        name: trimmedClubName,
        description: trimmedDescription,
        logo_url: clubLogoUrl || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (clubError || !createdClub) {
      setLoading(false);
      setErrorText(clubError?.message ?? "Failed to create club.");
      return;
    }

    const { error: memberError } = await supabase.from("members").insert({
      club_id: createdClub.id,
      user_id: user.id,
      name: user.user_metadata?.full_name ?? user.phone ?? "Owner",
      email: user.email ?? null,
      phone: user.phone,
      role: "owner",
      membership_status: "active",
      is_active: true,
    });

    if (memberError) {
      setLoading(false);
      setErrorText(memberError.message);
      return;
    }

    setClubId(createdClub.id);
    setActiveClubName(trimmedClubName);
    await Promise.all([
      loadMembers(createdClub.id),
      loadInvites(createdClub.id),
    ]);
    setClubLogoUrl("");
    setLoading(false);
    setInfoText("Club created and owner membership added.");
    navigate("members");
  };

  // Refreshes the editable profile fields from the logged-in account so the
  // Setup "Your profile" sheet always shows current values.
  const loadMyProfile = async () => {
    // Pull a fresh session so `email_confirmed_at` reflects any confirmation
    // the member just completed via the emailed link.
    const { data: refreshed } = await supabase.auth.refreshSession();
    if (refreshed?.session) {
      setSession(refreshed.session);
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return;
    }
    const metadataName =
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name.trim()
        : "";
    const metadataEmail =
      typeof user.user_metadata?.member_email === "string"
        ? user.user_metadata.member_email.trim()
        : "";
    const metadataLocation =
      typeof user.user_metadata?.location === "string"
        ? user.user_metadata.location
        : "";
    const metadataSkills =
      typeof user.user_metadata?.skills === "string"
        ? user.user_metadata.skills
        : "";
    setOnboardName(metadataName);
    setOnboardEmail(metadataEmail || user.email || "");
    setOnboardLocation(metadataLocation);
    setOnboardSkills(metadataSkills);
    setOnboardAvatarUrl(
      typeof user.user_metadata?.avatar_url === "string"
        ? user.user_metadata.avatar_url
        : "",
    );
  };

  const { loadClubProfile, pickAndUploadClubLogo, updateClubProfile } =
    useClubProfileActions({
      clubId,
      currentRole,
      currentMemberId,
      setClubName,
      setClubDescription,
      setClubLogoUrl,
      setActiveClubName,
      setUploadingClubLogo,
      setErrorText,
      setInfoText,
      setLoading,
      loadHomeData,
      persistActiveClub,
    });

  const {
    updateMemberRole,
    inviteMember,
    loadContacts,
    selectContact,
    requestContactsForInvite,
    inviteContacts,
  } = useMemberActions({
    clubId,
    currentRole,
    currentMemberId,
    activeClubName,
    invitePhone,
    inviteName,
    inviteEmail,
    setInviteName,
    setInvitePhone,
    setInviteEmail,
    setContactOptions,
    setContactsVisible,
    setContactsLoading,
    setContactsPermission,
    setErrorText,
    setInfoText,
    setLoading,
    loadInvites,
    loadMembers,
  });

  const { saveProfile, resendEmailVerification, pickAndUploadAvatar } =
    useProfileActions({
      clubId,
      currentMemberId,
      session,
      onboardName,
      onboardEmail,
      onboardLocation,
      onboardSkills,
      onboardAvatarUrl,
      setOnboardAvatarUrl,
      setUploadingAvatar,
      setErrorText,
      setInfoText,
      setLoading,
      loadMembers,
    });

  const leaveClub = async () => {
    setErrorText("");
    setInfoText("");

    if (!clubId || !currentMemberId) {
      setErrorText("No active club to leave.");
      return;
    }
    if (currentRole === "Owner") {
      setErrorText(
        "Owners can't leave their own club. Transfer ownership first.",
      );
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("members")
      .update({ membership_status: "left", is_active: false })
      .eq("id", currentMemberId);

    if (error) {
      setLoading(false);
      setErrorText(error.message);
      return;
    }

    setLoading(false);
    void clearPersistedActiveClub();
    setInfoText("You have left the club.");
    await goHome();
  };

  const logout = async () => {
    setErrorText("");
    setInfoText("");
    setLoading(true);

    // Unregister this device so it stops receiving the user's pushes.
    if (pushTokenRef.current) {
      try {
        await supabase
          .from("device_push_tokens")
          .delete()
          .eq("token", pushTokenRef.current);
      } catch {
        // Non-fatal.
      }
      pushTokenRef.current = null;
    }

    const { error } = await supabase.auth.signOut();
    setLoading(false);

    if (error) {
      setErrorText(error.message);
      return;
    }

    setSession(null);
    resetOnboardingState();
    void clearPersistedActiveClub();
    setInfoText("Logged out successfully.");
  };

  const duesSummary = useMemo<DuesSummary>(
    () => deriveDuesSummary(memberDues),
    [memberDues],
  );

  const paidCount = duesSummary.paidCount;
  const unpaidCount = duesSummary.unpaidCount;
  const collectionPercent = duesSummary.collectionPercent;
  const canManageDues = canManageFinances(currentRole);
  const canManageActivities = isLeadership(currentRole);

  // Email-verification state derived from the auth session. An email counts as
  // verified once Supabase confirms ownership (`email_confirmed_at` set) and the
  // confirmed address matches what the member is showing in their profile form.
  const sessionUser = session?.user ?? null;
  const verifiedEmail = sessionUser?.email ?? "";
  const pendingEmail =
    typeof sessionUser?.new_email === "string" ? sessionUser.new_email : "";
  const emailVerified =
    verifiedEmail.length > 0 &&
    Boolean(sessionUser?.email_confirmed_at) &&
    verifiedEmail.toLowerCase() === onboardEmail.trim().toLowerCase();
  const emailPending = pendingEmail.length > 0;

  const resumeOnboarding = (request: MembershipRequest) => {
    if (!request.memberId) {
      setErrorText(
        `Member record missing for ${request.clubName}. Ask owner to resend invite.`,
      );
      return;
    }
    setPendingMemberId(request.memberId);
    setPendingClubId(request.clubId);
    setPendingClubName(request.clubName);
    navigate("memberProfile");
  };

  const startCreateClub = () => {
    setClubName("");
    setClubDescription("");
    setClubLogoUrl("");
    navigate("club");
  };

  // Stable identities for every action. The proxy keeps each function's
  // identity constant for the provider's lifetime while always invoking the
  // latest closure, so the memoized context values below depend only on their
  // own domain state — a change in one domain can't bust another's memo.
  const api = useStableApi({
    notify,
    dismissToast,
    navigate,
    goHome,
    sendOtp,
    verifyOtpAndContinue,
    logout,
    pickAndUploadAvatar,
    resendEmailVerification,
    saveProfile,
    loadMyProfile,
    completeBasicProfile,
    completeMemberOnboarding,
    pickAndUploadClubLogo,
    createClub,
    startCreateClub,
    openClub,
    switchClub,
    loadClubProfile,
    updateClubProfile,
    inviteMember,
    loadContacts,
    selectContact,
    requestContactsForInvite,
    inviteContacts,
    updateMemberRole,
    leaveClub,
    acceptMembershipRequest,
    declineMembershipRequest,
    declineInviteFromHome,
    resumeOnboarding,
    refreshDues,
    createDuesPlan,
    updateDuesPlan,
    createDuesCycle,
    updateDuesCycle,
    generateDues,
    ensureAutoDuesCycles,
    recordTransaction,
    startDuePayment,
    sendDuePaymentLinks,
    refreshActivities,
    createMeeting,
    updateMeetingStatus,
    updateMeeting,
    createPoll,
    castVote,
    closePoll,
    createAnnouncement,
    setAnnouncementRead,
  });

  const uiValue = useMemo<UiContextValue>(() => ({ loading }), [loading]);

  const toastValue = useMemo<ToastContextValue>(
    () => ({ toast, notify: api.notify, dismissToast: api.dismissToast }),
    [toast, api],
  );

  const navigationValue = useMemo<NavigationContextValue>(
    () => ({ navigate: api.navigate, goHome: api.goHome }),
    [api],
  );

  const authValue = useMemo<AuthContextValue>(
    () => ({
      phone,
      setPhone,
      otp,
      setOtp,
      otpSent,
      session,
      sendOtp: api.sendOtp,
      verifyOtpAndContinue: api.verifyOtpAndContinue,
      logout: api.logout,
    }),
    [phone, otp, otpSent, session, api],
  );

  const profileValue = useMemo<ProfileContextValue>(
    () => ({
      onboardName,
      setOnboardName,
      onboardEmail,
      setOnboardEmail,
      onboardLocation,
      setOnboardLocation,
      onboardSkills,
      setOnboardSkills,
      onboardAvatarUrl,
      uploadingAvatar,
      pickAndUploadAvatar: api.pickAndUploadAvatar,
      emailVerified,
      emailPending,
      resendEmailVerification: api.resendEmailVerification,
      saveProfile: api.saveProfile,
      loadMyProfile: api.loadMyProfile,
      completeBasicProfile: api.completeBasicProfile,
      completeMemberOnboarding: api.completeMemberOnboarding,
    }),
    [
      onboardName,
      onboardEmail,
      onboardLocation,
      onboardSkills,
      onboardAvatarUrl,
      uploadingAvatar,
      emailVerified,
      emailPending,
      api,
    ],
  );

  const clubsValue = useMemo<ClubsContextValue>(
    () => ({
      myClubs,
      clubId,
      activeClubName,
      clubName,
      setClubName,
      clubDescription,
      setClubDescription,
      clubLogoUrl,
      uploadingClubLogo,
      pickAndUploadClubLogo: api.pickAndUploadClubLogo,
      createClub: api.createClub,
      startCreateClub: api.startCreateClub,
      openClub: api.openClub,
      switchClub: api.switchClub,
      loadClubProfile: api.loadClubProfile,
      updateClubProfile: api.updateClubProfile,
    }),
    [
      myClubs,
      clubId,
      activeClubName,
      clubName,
      clubDescription,
      clubLogoUrl,
      uploadingClubLogo,
      api,
    ],
  );

  const membersValue = useMemo<MembersContextValue>(
    () => ({
      members,
      currentRole,
      currentMemberId,
      invites,
      membershipRequests,
      pendingClubName,
      invitePhone,
      setInvitePhone,
      inviteName,
      setInviteName,
      inviteEmail,
      setInviteEmail,
      contactOptions,
      contactsVisible,
      setContactsVisible,
      contactsLoading,
      contactsPermission,
      inviteMember: api.inviteMember,
      loadContacts: api.loadContacts,
      selectContact: api.selectContact,
      requestContactsForInvite: api.requestContactsForInvite,
      inviteContacts: api.inviteContacts,
      updateMemberRole: api.updateMemberRole,
      leaveClub: api.leaveClub,
      acceptMembershipRequest: api.acceptMembershipRequest,
      declineMembershipRequest: api.declineMembershipRequest,
      declineInviteFromHome: api.declineInviteFromHome,
      resumeOnboarding: api.resumeOnboarding,
    }),
    [
      members,
      currentRole,
      currentMemberId,
      invites,
      membershipRequests,
      pendingClubName,
      invitePhone,
      inviteName,
      inviteEmail,
      contactOptions,
      contactsVisible,
      contactsLoading,
      contactsPermission,
      api,
    ],
  );

  const duesValue = useMemo<DuesContextValue>(
    () => ({
      memberDues,
      duesSummary,
      duesLoading,
      duesPlans,
      duesCycles,
      ledgerEntries,
      canManageDues,
      paidCount,
      unpaidCount,
      collectionPercent,
      refreshDues: api.refreshDues,
      createDuesPlan: api.createDuesPlan,
      updateDuesPlan: api.updateDuesPlan,
      createDuesCycle: api.createDuesCycle,
      updateDuesCycle: api.updateDuesCycle,
      generateDues: api.generateDues,
      ensureAutoDuesCycles: api.ensureAutoDuesCycles,
      recordTransaction: api.recordTransaction,
      startDuePayment: api.startDuePayment,
      sendDuePaymentLinks: api.sendDuePaymentLinks,
    }),
    [
      memberDues,
      duesSummary,
      duesLoading,
      duesPlans,
      duesCycles,
      ledgerEntries,
      canManageDues,
      paidCount,
      unpaidCount,
      collectionPercent,
      api,
    ],
  );

  const activitiesValue = useMemo<ActivitiesContextValue>(
    () => ({
      meetings,
      polls,
      announcements,
      activityLoading,
      canManageActivities,
      refreshActivities: api.refreshActivities,
      createMeeting: api.createMeeting,
      updateMeetingStatus: api.updateMeetingStatus,
      updateMeeting: api.updateMeeting,
      createPoll: api.createPoll,
      castVote: api.castVote,
      closePoll: api.closePoll,
      createAnnouncement: api.createAnnouncement,
      setAnnouncementRead: api.setAnnouncementRead,
    }),
    [meetings, polls, announcements, activityLoading, canManageActivities, api],
  );

  return (
    <UiContext.Provider value={uiValue}>
      <ToastContext.Provider value={toastValue}>
        <NavigationContext.Provider value={navigationValue}>
          <AuthContext.Provider value={authValue}>
            <ProfileContext.Provider value={profileValue}>
              <ClubsContext.Provider value={clubsValue}>
                <MembersContext.Provider value={membersValue}>
                  <DuesContext.Provider value={duesValue}>
                    <ActivitiesContext.Provider value={activitiesValue}>
                      {children}
                    </ActivitiesContext.Provider>
                  </DuesContext.Provider>
                </MembersContext.Provider>
              </ClubsContext.Provider>
            </ProfileContext.Provider>
          </AuthContext.Provider>
        </NavigationContext.Provider>
      </ToastContext.Provider>
    </UiContext.Provider>
  );
}
