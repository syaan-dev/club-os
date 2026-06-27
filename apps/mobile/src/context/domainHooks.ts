// Domain selector hooks — focused slices over the per-domain contexts.
//
// Screens import the specific domain hook they need (e.g. `useDues()`) rather
// than the whole context surface. Each hook reads a single domain context (a
// couple compose two), so a screen only re-renders when the data it actually
// uses changes — typing a club name no longer re-renders the dues or activity
// lists.
//
// These are pure selectors: they add no state of their own and stay in sync
// with the provider automatically.

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
} from "./domainContexts";

// Phone-OTP auth + session lifecycle. Also exposes the global `loading`
// spinner the auth screen shows while sending/verifying the OTP.
export function useAuth() {
  const c = useDomainContext(AuthContext);
  const { loading } = useDomainContext(UiContext);
  return {
    phone: c.phone,
    setPhone: c.setPhone,
    otp: c.otp,
    setOtp: c.setOtp,
    otpSent: c.otpSent,
    session: c.session,
    loading,
    sendOtp: c.sendOtp,
    verifyOtpAndContinue: c.verifyOtpAndContinue,
    logout: c.logout,
  };
}

// Toast notifications.
export function useToast() {
  const c = useDomainContext(ToastContext);
  return {
    toast: c.toast,
    notify: c.notify,
    dismissToast: c.dismissToast,
  };
}

// Cross-cutting transient UI state. `loading` is the global action spinner
// shared by every screen (distinct from domain flags like `duesLoading`).
export function useUi() {
  return {
    loading: useDomainContext(UiContext).loading,
  };
}

// The signed-in member's own profile + onboarding fields.
export function useProfile() {
  const c = useDomainContext(ProfileContext);
  return {
    onboardName: c.onboardName,
    setOnboardName: c.setOnboardName,
    onboardEmail: c.onboardEmail,
    setOnboardEmail: c.setOnboardEmail,
    onboardLocation: c.onboardLocation,
    setOnboardLocation: c.setOnboardLocation,
    onboardSkills: c.onboardSkills,
    setOnboardSkills: c.setOnboardSkills,
    onboardAvatarUrl: c.onboardAvatarUrl,
    uploadingAvatar: c.uploadingAvatar,
    pickAndUploadAvatar: c.pickAndUploadAvatar,
    emailVerified: c.emailVerified,
    emailPending: c.emailPending,
    resendEmailVerification: c.resendEmailVerification,
    saveProfile: c.saveProfile,
    loadMyProfile: c.loadMyProfile,
    completeBasicProfile: c.completeBasicProfile,
    completeMemberOnboarding: c.completeMemberOnboarding,
  };
}

// The active club + the user's club list and club-profile editing.
export function useClubs() {
  const c = useDomainContext(ClubsContext);
  const { goHome } = useDomainContext(NavigationContext);
  return {
    myClubs: c.myClubs,
    clubId: c.clubId,
    activeClubName: c.activeClubName,
    clubName: c.clubName,
    setClubName: c.setClubName,
    clubDescription: c.clubDescription,
    setClubDescription: c.setClubDescription,
    clubLogoUrl: c.clubLogoUrl,
    uploadingClubLogo: c.uploadingClubLogo,
    pickAndUploadClubLogo: c.pickAndUploadClubLogo,
    createClub: c.createClub,
    startCreateClub: c.startCreateClub,
    openClub: c.openClub,
    switchClub: c.switchClub,
    goHome,
    loadClubProfile: c.loadClubProfile,
    updateClubProfile: c.updateClubProfile,
  };
}

// The member directory, invites and membership requests.
export function useMembers() {
  const c = useDomainContext(MembersContext);
  return {
    members: c.members,
    currentRole: c.currentRole,
    currentMemberId: c.currentMemberId,
    invites: c.invites,
    membershipRequests: c.membershipRequests,
    pendingClubName: c.pendingClubName,
    invitePhone: c.invitePhone,
    setInvitePhone: c.setInvitePhone,
    inviteName: c.inviteName,
    setInviteName: c.setInviteName,
    inviteEmail: c.inviteEmail,
    setInviteEmail: c.setInviteEmail,
    contactOptions: c.contactOptions,
    contactsVisible: c.contactsVisible,
    setContactsVisible: c.setContactsVisible,
    contactsLoading: c.contactsLoading,
    contactsPermission: c.contactsPermission,
    inviteMember: c.inviteMember,
    loadContacts: c.loadContacts,
    selectContact: c.selectContact,
    requestContactsForInvite: c.requestContactsForInvite,
    inviteContacts: c.inviteContacts,
    updateMemberRole: c.updateMemberRole,
    leaveClub: c.leaveClub,
    acceptMembershipRequest: c.acceptMembershipRequest,
    declineMembershipRequest: c.declineMembershipRequest,
    declineInviteFromHome: c.declineInviteFromHome,
    resumeOnboarding: c.resumeOnboarding,
  };
}

// Dues plans, cycles, member dues, the ledger and their mutations.
export function useDues() {
  const c = useDomainContext(DuesContext);
  return {
    memberDues: c.memberDues,
    duesSummary: c.duesSummary,
    duesLoading: c.duesLoading,
    duesPlans: c.duesPlans,
    duesCycles: c.duesCycles,
    ledgerEntries: c.ledgerEntries,
    canManageDues: c.canManageDues,
    paidCount: c.paidCount,
    unpaidCount: c.unpaidCount,
    collectionPercent: c.collectionPercent,
    refreshDues: c.refreshDues,
    createDuesPlan: c.createDuesPlan,
    updateDuesPlan: c.updateDuesPlan,
    createDuesCycle: c.createDuesCycle,
    updateDuesCycle: c.updateDuesCycle,
    generateDues: c.generateDues,
    ensureAutoDuesCycles: c.ensureAutoDuesCycles,
    recordTransaction: c.recordTransaction,
    startDuePayment: c.startDuePayment,
    sendDuePaymentLinks: c.sendDuePaymentLinks,
  };
}

// Meetings, polls, announcements and their mutations.
export function useActivities() {
  const c = useDomainContext(ActivitiesContext);
  return {
    meetings: c.meetings,
    polls: c.polls,
    announcements: c.announcements,
    activityLoading: c.activityLoading,
    canManageActivities: c.canManageActivities,
    refreshActivities: c.refreshActivities,
    createMeeting: c.createMeeting,
    updateMeetingStatus: c.updateMeetingStatus,
    updateMeeting: c.updateMeeting,
    setMeetingRsvp: c.setMeetingRsvp,
    createPoll: c.createPoll,
    castVote: c.castVote,
    closePoll: c.closePoll,
    createAnnouncement: c.createAnnouncement,
    setAnnouncementRead: c.setAnnouncementRead,
  };
}

// Screen navigation. Small but shared by most screens.
export function useNavigation() {
  const c = useDomainContext(NavigationContext);
  return {
    navigate: c.navigate,
    goHome: c.goHome,
  };
}
