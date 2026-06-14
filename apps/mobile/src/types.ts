export type Screen =
  | "otp"
  | "profileSetup"
  | "memberRequests"
  | "home"
  | "club"
  | "memberProfile"
  | "members"
  | "activity"
  | "economy"
  | "setup";

export type Member = {
  id: string;
  name: string;
  role: "Owner" | "Treasurer" | "Secretary" | "Member";
  duesPaid: boolean;
  status: "invited" | "active" | "suspended" | "left";
  phone?: string;
};

export type Invite = {
  id: string;
  invitedPhone: string | null;
  invitedEmail: string | null;
  status: string;
  token: string;
  inviteLink: string;
};

export type MembershipRequest = {
  inviteId: string;
  memberId: string | null;
  clubId: string;
  clubName: string;
  token: string;
  inviteLink: string;
  status: "pending" | "accepted" | "expired" | "revoked";
};

export type ContactOption = {
  id: string;
  name: string;
  phone: string;
};

export type MyClub = {
  clubId: string;
  name: string;
  description: string;
  role: Member["role"];
};

export type DueStatus = "pending" | "paid" | "overdue" | "waived";

export type MemberDue = {
  id: string;
  memberId: string;
  memberName: string;
  cycleLabel: string;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  status: DueStatus;
};

export type DuesSummary = {
  totalBilled: number;
  totalCollected: number;
  totalOutstanding: number;
  paidCount: number;
  unpaidCount: number;
  overdueCount: number;
  waivedCount: number;
  collectionPercent: number;
};

export type DuesFrequency = "one_time" | "monthly" | "quarterly";

export type DuesPlan = {
  id: string;
  name: string;
  amount: number;
  frequency: DuesFrequency;
  graceDays: number;
  autoGenerate: boolean;
  startDate: string | null;
};

export type DuesCycle = {
  id: string;
  duesPlanId: string;
  planName: string;
  cycleLabel: string;
  dueDate: string;
};

export type TransactionType = "income" | "expense";

export type LedgerEntry = {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  paymentMethod: string;
  description: string | null;
  createdAt: string;
};

export type MeetingStatus = "scheduled" | "completed" | "cancelled";

export type ClubMeeting = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  scheduledAt: string;
  status: MeetingStatus;
  createdByName: string;
};

export type PollStatus = "open" | "closed";

export type Poll = {
  id: string;
  question: string;
  options: string[];
  status: PollStatus;
  closesAt: string | null;
  createdByName: string;
  createdAt: string;
  voteCounts: number[];
  totalVotes: number;
  myOptionIndex: number | null;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  createdByName: string;
  createdAt: string;
  isRead: boolean;
};
