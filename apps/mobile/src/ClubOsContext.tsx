import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "expo-router";
import * as Contacts from "expo-contacts";
import { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type {
  ContactOption,
  DuesCycle,
  DuesFrequency,
  DuesPlan,
  DuesSummary,
  Invite,
  LedgerEntry,
  Member,
  MemberDue,
  MembershipRequest,
  MyClub,
  Screen,
  TransactionType,
} from "./types";
import { canManageFinances, deriveDuesSummary } from "./dues";

const screenToPath: Record<Screen, string> = {
  otp: "/",
  profileSetup: "/profile-setup",
  memberRequests: "/member-requests",
  home: "/home",
  club: "/club",
  memberProfile: "/member-profile",
  members: "/members",
  hub: "/hub",
  dues: "/dues",
};

type ClubOsContextValue = {
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
  currentRole: Member["role"] | "";
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
  pendingClubName: string;
  onboardName: string;
  setOnboardName: (value: string) => void;
  onboardEmail: string;
  setOnboardEmail: (value: string) => void;
  onboardLocation: string;
  setOnboardLocation: (value: string) => void;
  onboardSkills: string;
  setOnboardSkills: (value: string) => void;
  loading: boolean;
  errorText: string;
  infoText: string;
  session: Session | null;
  clubId: string;
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
  goHome: () => Promise<void>;
  openClub: (clubId: string, name: string) => Promise<void>;
  refreshDues: () => Promise<void>;
  createDuesPlan: (input: {
    name: string;
    amount: number;
    frequency: DuesFrequency;
    graceDays: number;
  }) => Promise<void>;
  createDuesCycle: (input: {
    duesPlanId: string;
    cycleLabel: string;
    dueDate: string;
  }) => Promise<void>;
  generateDues: (cycleId: string) => Promise<void>;
  recordTransaction: (input: {
    type: TransactionType;
    amount: number;
    category: string;
    paymentMethod: string;
    description: string;
  }) => Promise<void>;
  resumeOnboarding: (request: MembershipRequest) => void;
  startCreateClub: () => void;
  logout: () => Promise<void>;
};

const ClubOsContext = createContext<ClubOsContextValue | null>(null);

export function useClubOs() {
  const value = useContext(ClubOsContext);
  if (!value) {
    throw new Error("useClubOs must be used within a ClubOsProvider");
  }
  return value;
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
  const [currentRole, setCurrentRole] = useState<Member["role"] | "">("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [contactOptions, setContactOptions] = useState<ContactOption[]>([]);
  const [contactsVisible, setContactsVisible] = useState(false);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [currentMemberId, setCurrentMemberId] = useState("");
  const [pendingMemberId, setPendingMemberId] = useState("");
  const [pendingClubId, setPendingClubId] = useState("");
  const [pendingClubName, setPendingClubName] = useState("");
  const [onboardName, setOnboardName] = useState("");
  const [onboardEmail, setOnboardEmail] = useState("");
  const [onboardLocation, setOnboardLocation] = useState("");
  const [onboardSkills, setOnboardSkills] = useState("");
  const [postProfileNextScreen, setPostProfileNextScreen] = useState<
    "club" | "members" | "home"
  >("club");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [infoText, setInfoText] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [clubId, setClubId] = useState("");
  const [activeClubName, setActiveClubName] = useState("");

  const navigate = (screen: Screen) => {
    router.replace(screenToPath[screen] as never);
  };

  const resetOnboardingState = () => {
    setOtpSent(false);
    setOtp("");
    setPhone("");
    setClubName("");
    setClubDescription("");
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
    setCurrentMemberId("");
    setPendingMemberId("");
    setPendingClubId("");
    setPendingClubName("");
    setOnboardName("");
    setOnboardEmail("");
    setOnboardLocation("");
    setOnboardSkills("");
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

  const normalizePhone = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }

    // Normalize all user input (including +prefixed values) to strict E.164.
    const digitsOnly = trimmed.replace(/\D/g, "");
    if (digitsOnly.length === 10) {
      return `+91${digitsOnly}`;
    }
    return `+${digitsOnly}`;
  };

  const buildInviteLink = (token: string, club: string) => {
    return `clubos://join?token=${encodeURIComponent(token)}&club=${encodeURIComponent(club)}`;
  };

  const mapRole = (role: string | null): Member["role"] => {
    if (role === "owner") {
      return "Owner";
    }
    if (role === "treasurer") {
      return "Treasurer";
    }
    if (role === "secretary") {
      return "Secretary";
    }
    return "Member";
  };

  const loadHomeData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return;
    }

    const { data: memberships } = await supabase
      .from("members")
      .select("id,club_id,role,membership_status")
      .eq("user_id", user.id)
      .eq("membership_status", "active")
      .order("created_at", { ascending: true });

    const clubIds = Array.from(
      new Set((memberships || []).map((membership) => membership.club_id)),
    );

    let clubsById = new Map<
      string,
      { id: string; name: string; description: string | null }
    >();
    if (clubIds.length > 0) {
      const { data: clubsData } = await supabase
        .from("clubs")
        .select("id,name,description")
        .in("id", clubIds);
      clubsById = new Map((clubsData || []).map((club) => [club.id, club]));
    }

    setMyClubs(
      (memberships || []).map((membership) => ({
        clubId: membership.club_id,
        name: clubsById.get(membership.club_id)?.name ?? "Your club",
        description: clubsById.get(membership.club_id)?.description ?? "",
        role: mapRole(membership.role),
      })),
    );

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
    setLoading(true);
    await Promise.all([
      loadMembers(targetClubId),
      loadInvites(targetClubId),
      loadDues(targetClubId),
      loadDuesPlans(targetClubId),
      loadDuesCycles(targetClubId),
      loadLedger(targetClubId),
    ]);
    setLoading(false);
    navigate("members");
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
    const { data: invitesData, error: invitesError } = await supabase
      .from("club_invites")
      .select("id,club_id,token,status")
      .eq("invited_phone", invitedPhone)
      .in("status", ["pending", "accepted"])
      .order("created_at", { ascending: false });

    if (invitesError || !invitesData || invitesData.length === 0) {
      setMembershipRequests([]);
      return [] as MembershipRequest[];
    }

    const { data: memberRows, error: memberRowsError } = await supabase
      .from("members")
      .select("id,club_id")
      .eq("phone", invitedPhone)
      .is("user_id", null)
      .eq("membership_status", "invited");

    if (memberRowsError) {
      setMembershipRequests([]);
      return [] as MembershipRequest[];
    }

    const memberByClub = new Map(
      (memberRows || []).map((m) => [m.club_id, m.id]),
    );
    const clubIds = Array.from(
      new Set(invitesData.map((invite) => invite.club_id)),
    );

    const { data: clubsData } = await supabase
      .from("clubs")
      .select("id,name")
      .in("id", clubIds);

    const clubNameById = new Map(
      (clubsData || []).map((club) => [club.id, club.name]),
    );

    const requests = invitesData
      .map((invite) => {
        const memberId = memberByClub.get(invite.club_id);
        const club = clubNameById.get(invite.club_id) ?? "Your club";
        return {
          inviteId: invite.id,
          memberId: memberId ?? null,
          clubId: invite.club_id,
          clubName: club,
          token: invite.token,
          inviteLink: buildInviteLink(invite.token, club),
          status: invite.status,
        } satisfies MembershipRequest;
      })
      .filter((item): item is MembershipRequest => Boolean(item));

    setMembershipRequests(requests);
    return requests;
  };

  const loadMembers = async (activeClubId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("members")
      .select("id,name,role,user_id,membership_status")
      .eq("club_id", activeClubId)
      .order("created_at", { ascending: true });

    if (error || !data) {
      return;
    }

    const myMemberRow = data.find((member) => member.user_id === user?.id);
    setCurrentMemberId(myMemberRow?.id ?? "");
    setCurrentRole(
      myMemberRow?.role === "owner"
        ? "Owner"
        : myMemberRow?.role === "treasurer"
          ? "Treasurer"
          : myMemberRow?.role === "secretary"
            ? "Secretary"
            : myMemberRow
              ? "Member"
              : "",
    );

    setMembers(
      data.map((member) => ({
        id: member.id,
        name: member.name,
        role:
          member.role === "owner"
            ? "Owner"
            : member.role === "treasurer"
              ? "Treasurer"
              : member.role === "secretary"
                ? "Secretary"
                : "Member",
        duesPaid: false,
        status: member.membership_status,
      })),
    );
  };

  const loadDues = async (activeClubId: string) => {
    setDuesLoading(true);

    const { data, error } = await supabase
      .from("member_dues")
      .select(
        "id,member_id,amount_due,amount_paid,status,members(name),dues_cycles(cycle_label,due_date)",
      )
      .eq("club_id", activeClubId)
      .order("created_at", { ascending: true });

    if (error || !data) {
      setMemberDues([]);
      setDuesLoading(false);
      return;
    }

    const mapped: MemberDue[] = data.map((row: any) => {
      const memberRel = Array.isArray(row.members)
        ? row.members[0]
        : row.members;
      const cycleRel = Array.isArray(row.dues_cycles)
        ? row.dues_cycles[0]
        : row.dues_cycles;
      return {
        id: row.id,
        memberId: row.member_id,
        memberName: memberRel?.name ?? "Member",
        cycleLabel: cycleRel?.cycle_label ?? "Cycle",
        dueDate: cycleRel?.due_date ?? "",
        amountDue: Number(row.amount_due ?? 0),
        amountPaid: Number(row.amount_paid ?? 0),
        status: row.status,
      } satisfies MemberDue;
    });

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
    const { data, error } = await supabase
      .from("dues_plans")
      .select("id,name,amount,frequency,grace_days")
      .eq("club_id", activeClubId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error || !data) {
      setDuesPlans([]);
      return;
    }

    setDuesPlans(
      data.map((row) => ({
        id: row.id,
        name: row.name,
        amount: Number(row.amount ?? 0),
        frequency: row.frequency as DuesFrequency,
        graceDays: Number(row.grace_days ?? 0),
      })),
    );
  };

  const loadDuesCycles = async (activeClubId: string) => {
    const { data, error } = await supabase
      .from("dues_cycles")
      .select("id,dues_plan_id,cycle_label,due_date,dues_plans(name)")
      .eq("club_id", activeClubId)
      .order("due_date", { ascending: false });

    if (error || !data) {
      setDuesCycles([]);
      return;
    }

    setDuesCycles(
      data.map((row: any) => {
        const planRel = Array.isArray(row.dues_plans)
          ? row.dues_plans[0]
          : row.dues_plans;
        return {
          id: row.id,
          duesPlanId: row.dues_plan_id,
          planName: planRel?.name ?? "Plan",
          cycleLabel: row.cycle_label,
          dueDate: row.due_date ?? "",
        } satisfies DuesCycle;
      }),
    );
  };

  const loadLedger = async (activeClubId: string) => {
    const { data, error } = await supabase
      .from("transactions")
      .select("id,type,amount,category,payment_method,description,created_at")
      .eq("club_id", activeClubId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data) {
      setLedgerEntries([]);
      return;
    }

    setLedgerEntries(
      data.map((row) => ({
        id: row.id,
        type: row.type as TransactionType,
        amount: Number(row.amount ?? 0),
        category: row.category ?? "",
        paymentMethod: row.payment_method ?? "",
        description: row.description ?? null,
        createdAt: row.created_at ?? "",
      })),
    );
  };

  const createDuesPlan = async (input: {
    name: string;
    amount: number;
    frequency: DuesFrequency;
    graceDays: number;
  }) => {
    setErrorText("");
    setInfoText("");

    if (!clubId || !currentMemberId) {
      setErrorText("Open a club first.");
      return;
    }
    if (!canManageFinances(currentRole)) {
      setErrorText("Only an owner or treasurer can create dues plans.");
      return;
    }

    const name = input.name.trim();
    if (!name) {
      setErrorText("Plan name is required.");
      return;
    }
    if (!(input.amount > 0)) {
      setErrorText("Amount must be greater than zero.");
      return;
    }
    if (!Number.isInteger(input.graceDays) || input.graceDays < 0) {
      setErrorText("Grace days must be a non-negative whole number.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("dues_plans").insert({
      club_id: clubId,
      name,
      amount: input.amount,
      frequency: input.frequency,
      grace_days: input.graceDays,
      created_by: currentMemberId,
    });
    setLoading(false);

    if (error) {
      setErrorText(error.message);
      return;
    }

    await loadDuesPlans(clubId);
    setInfoText(`Dues plan "${name}" created.`);
  };

  const createDuesCycle = async (input: {
    duesPlanId: string;
    cycleLabel: string;
    dueDate: string;
  }) => {
    setErrorText("");
    setInfoText("");

    if (!clubId) {
      setErrorText("Open a club first.");
      return;
    }
    if (!canManageFinances(currentRole)) {
      setErrorText("Only an owner or treasurer can create dues cycles.");
      return;
    }
    if (!input.duesPlanId) {
      setErrorText("Select a dues plan for this cycle.");
      return;
    }
    const cycleLabel = input.cycleLabel.trim();
    if (!cycleLabel) {
      setErrorText("Cycle label is required (e.g. 2026-06).");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) {
      setErrorText("Due date must be in YYYY-MM-DD format.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("dues_cycles").insert({
      club_id: clubId,
      dues_plan_id: input.duesPlanId,
      cycle_label: cycleLabel,
      due_date: input.dueDate,
    });
    setLoading(false);

    if (error) {
      setErrorText(error.message);
      return;
    }

    await loadDuesCycles(clubId);
    setInfoText(`Dues cycle "${cycleLabel}" created.`);
  };

  const generateDues = async (cycleId: string) => {
    setErrorText("");
    setInfoText("");

    if (!clubId) {
      setErrorText("Open a club first.");
      return;
    }
    if (!canManageFinances(currentRole)) {
      setErrorText("Only an owner or treasurer can generate dues.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.rpc("generate_dues_for_cycle", {
      _cycle_id: cycleId,
    });

    if (error) {
      setLoading(false);
      setErrorText(error.message);
      return;
    }

    await loadDues(clubId);
    setLoading(false);
    const count = typeof data === "number" ? data : 0;
    setInfoText(
      count > 0
        ? `Billed ${count} member${count === 1 ? "" : "s"} for this cycle.`
        : "No new dues to generate — everyone is already billed.",
    );
  };

  const recordTransaction = async (input: {
    type: TransactionType;
    amount: number;
    category: string;
    paymentMethod: string;
    description: string;
  }) => {
    setErrorText("");
    setInfoText("");

    if (!clubId || !currentMemberId) {
      setErrorText("Open a club first.");
      return;
    }
    if (!canManageFinances(currentRole)) {
      setErrorText("Only an owner or treasurer can record transactions.");
      return;
    }
    if (!(input.amount > 0)) {
      setErrorText("Amount must be greater than zero.");
      return;
    }
    const category = input.category.trim();
    if (!category) {
      setErrorText("Category is required.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("transactions").insert({
      club_id: clubId,
      member_id: null,
      recorded_by: currentMemberId,
      type: input.type,
      amount: input.amount,
      category,
      payment_method: input.paymentMethod.trim() || "UPI",
      status: "completed",
      description: input.description.trim() || null,
      source: "manual",
    });
    setLoading(false);

    if (error) {
      setErrorText(error.message);
      return;
    }

    await loadLedger(clubId);
    setInfoText(
      `${input.type === "income" ? "Income" : "Expense"} of ${input.amount} recorded.`,
    );
  };

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

    const { data: activeMemberships, error: activeMembershipsError } =
      await supabase
        .from("members")
        .select("id,club_id,membership_status")
        .eq("user_id", user.id)
        .eq("membership_status", "active")
        .order("created_at", { ascending: true })
        .limit(1);

    if (!activeMembershipsError && activeMemberships && activeMemberships[0]) {
      const activeClubId = activeMemberships[0].club_id;
      setClubId(activeClubId);
      const { data: activeClub } = await supabase
        .from("clubs")
        .select("name")
        .eq("id", activeClubId)
        .maybeSingle();
      setActiveClubName(activeClub?.name ?? "");

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
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: trimmedName,
        member_email: trimmedEmail,
        location: onboardLocation.trim() || null,
        skills: onboardSkills.trim() || null,
      },
    });
    setLoading(false);

    if (error) {
      setErrorText(error.message);
      return;
    }

    setInfoText("Profile saved successfully.");
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

    await supabase.auth.updateUser({
      data: {
        full_name: trimmedName,
        member_email: trimmedEmail,
        location: onboardLocation.trim() || null,
        skills: onboardSkills.trim() || null,
      },
    });

    setClubId(pendingClubId);
    await Promise.all([loadMembers(pendingClubId), loadInvites(pendingClubId)]);
    setLoading(false);
    setInfoText("Welcome aboard. Your member profile is now active.");
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

  const sendOtp = async () => {
    setErrorText("");
    setInfoText("");

    if (!isSupabaseConfigured) {
      setErrorText(
        "Supabase env vars are missing. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.",
      );
      return;
    }

    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone.length < 10) {
      setErrorText("Enter a valid phone number with country code.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      phone: normalizedPhone,
    });
    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes("unsupported phone provider")) {
        setErrorText(
          "Local SMS provider mismatch. Ensure [auth.sms] enable_signup=true, [auth.sms.test_otp] has +919876543210 mapping, restart Supabase, and use EXPO_PUBLIC_SUPABASE_ANON_KEY (not a secret key).",
        );
      } else {
        setErrorText(error.message);
      }
      return;
    }

    setPhone(normalizedPhone);
    setOtpSent(true);
    setInfoText("OTP sent. Enter the 6-digit code to continue.");
  };

  const verifyOtpAndContinue = async () => {
    setErrorText("");
    setInfoText("");

    if (!isSupabaseConfigured) {
      setErrorText(
        "Supabase env vars are missing. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.",
      );
      return;
    }

    const normalizedPhone = normalizePhone(phone);
    if (otp.trim().length < 6) {
      setErrorText("Enter the 6-digit OTP.");
      return;
    }

    setLoading(true);
    const {
      data: { session: verifiedSession },
      error,
    } = await supabase.auth.verifyOtp({
      phone: normalizedPhone,
      token: otp.trim(),
      type: "sms",
    });
    setLoading(false);

    if (error) {
      setErrorText(error.message);
      return;
    }

    setSession(verifiedSession);
    await detectPostLoginFlow();
    setInfoText("Phone verified successfully.");
  };

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
    setLoading(false);
    setInfoText("Club created and owner membership added.");
    navigate("members");
  };

  const logout = async () => {
    setErrorText("");
    setInfoText("");
    setLoading(true);

    const { error } = await supabase.auth.signOut();
    setLoading(false);

    if (error) {
      setErrorText(error.message);
      return;
    }

    setSession(null);
    resetOnboardingState();
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

  const inviteMember = async () => {
    setErrorText("");
    setInfoText("");

    if (!clubId) {
      setErrorText("Create a club first.");
      return;
    }

    if (!currentMemberId) {
      setErrorText("Unable to resolve your membership role. Please re-login.");
      return;
    }

    const normalizedPhone = invitePhone ? normalizePhone(invitePhone) : "";
    const trimmedName = inviteName.trim();
    const trimmedEmail = inviteEmail.trim().toLowerCase();

    if (!normalizedPhone) {
      setErrorText(
        "Phone number is required for member invitation in Phase 1.",
      );
      return;
    }

    if (normalizedPhone.length < 10) {
      setErrorText("Enter a valid phone number with country code.");
      return;
    }

    const { data: existingMember } = await supabase
      .from("members")
      .select("id,membership_status")
      .eq("club_id", clubId)
      .eq("phone", normalizedPhone)
      .in("membership_status", ["invited", "active", "suspended"])
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingMember && existingMember.length > 0) {
      setErrorText("This phone number is already in your club member records.");
      return;
    }

    setLoading(true);
    const token = `invite_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: invitedMemberRow, error: invitedMemberCreateError } =
      await supabase
        .from("members")
        .insert({
          club_id: clubId,
          user_id: null,
          name: trimmedName || "Invited member",
          email: trimmedEmail || null,
          phone: normalizedPhone,
          role: "member",
          membership_status: "invited",
          is_active: true,
        })
        .select("id")
        .single();

    if (invitedMemberCreateError || !invitedMemberRow) {
      setLoading(false);
      setErrorText(
        invitedMemberCreateError?.message ??
          "Failed to create member invite record.",
      );
      return;
    }

    const { error } = await supabase.from("club_invites").insert({
      club_id: clubId,
      invited_phone: normalizedPhone || null,
      invited_email: trimmedEmail || null,
      token,
      invited_by: currentMemberId,
      expires_at: expiresAt,
    });

    if (error) {
      await supabase.from("members").delete().eq("id", invitedMemberRow.id);
      setLoading(false);
      setErrorText(error.message);
      return;
    }

    setInviteName("");
    setInvitePhone("");
    setInviteEmail("");
    await Promise.all([loadInvites(clubId), loadMembers(clubId)]);
    setLoading(false);
    const inviteLink = buildInviteLink(token, activeClubName || "Your club");
    setInfoText(
      `Invite created for ${activeClubName || "your club"}. Link: ${inviteLink}`,
    );
  };

  const loadContacts = async () => {
    setErrorText("");
    setContactsLoading(true);

    const permission = await Contacts.requestPermissionsAsync();
    if (permission.status !== "granted") {
      setContactsLoading(false);
      setErrorText("Contacts permission denied. Please enter phone manually.");
      return;
    }

    const contactsResult = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers],
      pageSize: 80,
    });

    const mappedContacts: ContactOption[] = (contactsResult.data || [])
      .map((contact: Contacts.Contact, index: number) => {
        const phoneValue = contact.phoneNumbers?.[0]?.number ?? "";
        return {
          id: contact.id ?? `contact_${index}`,
          name: contact.name || "Unnamed contact",
          phone: normalizePhone(phoneValue),
        };
      })
      .filter((contact) => contact.phone.length >= 10);

    setContactOptions(mappedContacts);
    setContactsVisible(true);
    setContactsLoading(false);
    if (mappedContacts.length === 0) {
      setInfoText("No contacts with valid phone numbers found on this device.");
    }
  };

  const selectContact = (selectedContact: ContactOption) => {
    setInviteName(selectedContact.name);
    setInvitePhone(selectedContact.phone);
    setContactsVisible(false);
    setInfoText(`Selected ${selectedContact.name}. You can now send invite.`);
  };

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
    navigate("club");
  };

  const value: ClubOsContextValue = {
    phone,
    setPhone,
    otp,
    setOtp,
    otpSent,
    clubName,
    setClubName,
    clubDescription,
    setClubDescription,
    members,
    invites,
    membershipRequests,
    myClubs,
    memberDues,
    duesSummary,
    duesLoading,
    duesPlans,
    duesCycles,
    ledgerEntries,
    canManageDues,
    currentRole,
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
    pendingClubName,
    onboardName,
    setOnboardName,
    onboardEmail,
    setOnboardEmail,
    onboardLocation,
    setOnboardLocation,
    onboardSkills,
    setOnboardSkills,
    loading,
    errorText,
    infoText,
    session,
    clubId,
    paidCount,
    unpaidCount,
    collectionPercent,
    navigate,
    sendOtp,
    verifyOtpAndContinue,
    completeBasicProfile,
    completeMemberOnboarding,
    acceptMembershipRequest,
    declineMembershipRequest,
    declineInviteFromHome,
    createClub,
    inviteMember,
    loadContacts,
    selectContact,
    goHome,
    openClub,
    refreshDues,
    createDuesPlan,
    createDuesCycle,
    generateDues,
    recordTransaction,
    resumeOnboarding,
    startCreateClub,
    logout,
  };

  return (
    <ClubOsContext.Provider value={value}>{children}</ClubOsContext.Provider>
  );
}
