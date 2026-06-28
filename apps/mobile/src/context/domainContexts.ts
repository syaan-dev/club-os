import { createContext, useContext } from "react";
import type { ClubOsContextValue } from "../ClubOsContext";

// Independent per-domain contexts. The provider owns all state in one place but
// publishes a separate, individually-memoized value object per domain. React
// compares context values with Object.is, so a consumer only re-renders when
// the value of the specific context it reads changes. Splitting the former
// single context this way eliminates cross-domain re-renders (typing a club
// name no longer re-renders the dues or activity lists).
//
// Each *ContextValue is a Pick of the master ClubOsContextValue so the slices
// can never drift from the canonical shape.

export type UiContextValue = Pick<ClubOsContextValue, "loading">;

export type ToastContextValue = Pick<
  ClubOsContextValue,
  "toast" | "notify" | "dismissToast"
>;

export type NavigationContextValue = Pick<
  ClubOsContextValue,
  "navigate" | "goHome"
>;

export type AuthContextValue = Pick<
  ClubOsContextValue,
  | "phone"
  | "setPhone"
  | "otp"
  | "setOtp"
  | "otpSent"
  | "session"
  | "sendOtp"
  | "verifyOtpAndContinue"
  | "logout"
>;

export type ProfileContextValue = Pick<
  ClubOsContextValue,
  | "onboardName"
  | "setOnboardName"
  | "onboardEmail"
  | "setOnboardEmail"
  | "onboardLocation"
  | "setOnboardLocation"
  | "onboardSkills"
  | "setOnboardSkills"
  | "onboardAvatarUrl"
  | "uploadingAvatar"
  | "pickAndUploadAvatar"
  | "emailVerified"
  | "emailPending"
  | "resendEmailVerification"
  | "saveProfile"
  | "loadMyProfile"
  | "completeBasicProfile"
  | "completeMemberOnboarding"
>;

export type ClubsContextValue = Pick<
  ClubOsContextValue,
  | "myClubs"
  | "clubId"
  | "activeClubName"
  | "clubName"
  | "setClubName"
  | "clubDescription"
  | "setClubDescription"
  | "clubLogoUrl"
  | "uploadingClubLogo"
  | "pickAndUploadClubLogo"
  | "createClub"
  | "startCreateClub"
  | "openClub"
  | "switchClub"
  | "loadClubProfile"
  | "updateClubProfile"
>;

export type MembersContextValue = Pick<
  ClubOsContextValue,
  | "members"
  | "currentRole"
  | "currentMemberId"
  | "invites"
  | "membershipRequests"
  | "pendingClubName"
  | "invitePhone"
  | "setInvitePhone"
  | "inviteName"
  | "setInviteName"
  | "inviteEmail"
  | "setInviteEmail"
  | "contactOptions"
  | "contactsVisible"
  | "setContactsVisible"
  | "contactsLoading"
  | "contactsPermission"
  | "inviteMember"
  | "loadContacts"
  | "selectContact"
  | "requestContactsForInvite"
  | "inviteContacts"
  | "updateMemberRole"
  | "leaveClub"
  | "acceptMembershipRequest"
  | "declineMembershipRequest"
  | "declineInviteFromHome"
  | "resumeOnboarding"
>;

export type DuesContextValue = Pick<
  ClubOsContextValue,
  | "memberDues"
  | "duesSummary"
  | "duesLoading"
  | "duesPlans"
  | "duesCycles"
  | "ledgerEntries"
  | "ledgerSummary"
  | "canManageDues"
  | "paidCount"
  | "unpaidCount"
  | "collectionPercent"
  | "refreshDues"
  | "createDuesPlan"
  | "updateDuesPlan"
  | "setDuesPlanActive"
  | "createDuesCycle"
  | "updateDuesCycle"
  | "generateDues"
  | "ensureAutoDuesCycles"
  | "recordTransaction"
  | "startDuePayment"
  | "sendDuePaymentLinks"
  | "markDuePaid"
>;

export type ActivitiesContextValue = Pick<
  ClubOsContextValue,
  | "meetings"
  | "polls"
  | "announcements"
  | "activityLoading"
  | "canManageActivities"
  | "refreshActivities"
  | "createMeeting"
  | "updateMeetingStatus"
  | "updateMeeting"
  | "setMeetingRsvp"
  | "createPoll"
  | "updatePoll"
  | "castVote"
  | "closePoll"
  | "createAnnouncement"
  | "setAnnouncementRead"
>;

export const UiContext = createContext<UiContextValue | null>(null);
export const ToastContext = createContext<ToastContextValue | null>(null);
export const NavigationContext = createContext<NavigationContextValue | null>(
  null,
);
export const AuthContext = createContext<AuthContextValue | null>(null);
export const ProfileContext = createContext<ProfileContextValue | null>(null);
export const ClubsContext = createContext<ClubsContextValue | null>(null);
export const MembersContext = createContext<MembersContextValue | null>(null);
export const DuesContext = createContext<DuesContextValue | null>(null);
export const ActivitiesContext = createContext<ActivitiesContextValue | null>(
  null,
);

// Reads a domain context, throwing the familiar provider guard error so a
// misplaced consumer fails loudly instead of dereferencing null.
export function useDomainContext<T>(
  context: React.Context<T | null>,
): T {
  const value = useContext(context);
  if (!value) {
    throw new Error("Domain hooks must be used within a ClubOsProvider");
  }
  return value;
}
