import { act, render } from "@testing-library/react-native";
import { ClubOsProvider } from "../src/ClubOsContext";
import { PlanFormModal } from "../src/components/economy/PlanFormModal";
import { MeetingFormModal } from "../src/components/activity/MeetingFormModal";
import type { ClubMeeting, DuesPlan } from "../src/types";

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
}));

jest.mock("expo-contacts", () => ({
  requestPermissionsAsync: jest.fn(async () => ({ status: "granted" })),
  getContactsAsync: jest.fn(async () => ({ data: [] })),
  Fields: { PhoneNumbers: "phoneNumbers" },
}));

jest.mock("../lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: jest.fn(async () => ({ data: { session: null } })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      getUser: jest.fn(async () => ({ data: { user: null } })),
    },
    from: jest.fn(),
  },
}));

const flush = () => act(async () => {});

const plan: DuesPlan = {
  id: "p1",
  name: "Gold Membership",
  amount: 1500,
  frequency: "quarterly",
  graceDays: 5,
  autoGenerate: true,
  startDate: "2026-01-01",
};

const meeting: ClubMeeting = {
  id: "m1",
  title: "Quarterly Review",
  description: "Budget walkthrough",
  location: "Clubhouse",
  scheduledAt: "2026-06-20T18:00:00.000Z",
  status: "scheduled",
  createdByName: "Mia",
};

describe("PlanFormModal re-seeding", () => {
  it("seeds the form fields from the plan being edited when opened", async () => {
    const view = render(
      <ClubOsProvider>
        <PlanFormModal visible editingPlan={plan} onClose={() => {}} />
      </ClubOsProvider>,
    );
    await flush();

    expect(view.getByLabelText("Plan name").props.value).toBe("Gold Membership");
    expect(view.getByLabelText("Plan amount").props.value).toBe("1500");
    expect(view.getByLabelText("Grace days").props.value).toBe("5");
    // Auto-generate plans reveal the start-date field, seeded from the plan.
    expect(
      view.getByLabelText("Auto billing start date").props.accessibilityValue
        .text,
    ).toBe("2026-01-01");
  });

  it("clears the form when switched from edit to create mode", async () => {
    const view = render(
      <ClubOsProvider>
        <PlanFormModal visible editingPlan={plan} onClose={() => {}} />
      </ClubOsProvider>,
    );
    await flush();
    expect(view.getByLabelText("Plan name").props.value).toBe("Gold Membership");

    // Reopen for a brand-new plan (editingPlan becomes null while visible).
    view.rerender(
      <ClubOsProvider>
        <PlanFormModal visible editingPlan={null} onClose={() => {}} />
      </ClubOsProvider>,
    );
    await flush();

    expect(view.getByLabelText("Plan name").props.value).toBe("");
    expect(view.getByLabelText("Plan amount").props.value).toBe("");
    // Grace days falls back to the "3" default, not the edited plan's 5.
    expect(view.getByLabelText("Grace days").props.value).toBe("3");
  });
});

describe("MeetingFormModal re-seeding", () => {
  it("seeds title, date, location and agenda from the meeting being edited", async () => {
    const view = render(
      <ClubOsProvider>
        <MeetingFormModal visible editingMeeting={meeting} onClose={() => {}} />
      </ClubOsProvider>,
    );
    await flush();

    expect(view.getByLabelText("Meeting title").props.value).toBe(
      "Quarterly Review",
    );
    // The date field is seeded from the meeting's full scheduled timestamp.
    expect(
      view.getByLabelText("Meeting date").props.accessibilityValue.text,
    ).toBe("2026-06-20T18:00:00.000Z");
    expect(view.getByLabelText("Meeting location").props.value).toBe(
      "Clubhouse",
    );
    expect(view.getByLabelText("Meeting agenda").props.value).toBe(
      "Budget walkthrough",
    );
  });

  it("clears the form when switched from edit to create mode", async () => {
    const view = render(
      <ClubOsProvider>
        <MeetingFormModal visible editingMeeting={meeting} onClose={() => {}} />
      </ClubOsProvider>,
    );
    await flush();
    expect(view.getByLabelText("Meeting title").props.value).toBe(
      "Quarterly Review",
    );

    view.rerender(
      <ClubOsProvider>
        <MeetingFormModal visible editingMeeting={null} onClose={() => {}} />
      </ClubOsProvider>,
    );
    await flush();

    expect(view.getByLabelText("Meeting title").props.value).toBe("");
    expect(
      view.getByLabelText("Meeting date").props.accessibilityValue.text,
    ).toBe("");
    expect(view.getByLabelText("Meeting location").props.value).toBe("");
    expect(view.getByLabelText("Meeting agenda").props.value).toBe("");
  });
});
