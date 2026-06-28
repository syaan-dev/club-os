import { fireEvent, waitFor } from "@testing-library/react-native";
import { renderRouter, screen } from "expo-router/testing-library";
import { supabase } from "../lib/supabase";
import RootLayout from "../app/_layout";
import OtpScreen from "../app/index";
import ProfileSetupScreen from "../app/profile-setup";
import MemberRequestsScreen from "../app/member-requests";
import MemberProfileScreen from "../app/member-profile";
import HomeScreen from "../app/home";
import ClubScreen from "../app/club";
import TabsLayout from "../app/(tabs)/_layout";
import MembersScreen from "../app/(tabs)/members";
import ActivityScreen from "../app/(tabs)/activity";
import EconomyScreen from "../app/(tabs)/economy";
import SetupScreen from "../app/(tabs)/setup";

jest.mock("expo-contacts", () => ({
  requestPermissionsAsync: jest.fn(async () => ({ status: "granted" })),
  getContactsAsync: jest.fn(async () => ({ data: [] })),
  Fields: { PhoneNumbers: "phoneNumbers" },
}));

jest.mock("../lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      getUser: jest.fn(),
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
      updateUser: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

type QueryResult = { data: any; error: any };

type QueryState = {
  table: string;
  mode: "select" | "update" | "insert" | "delete";
  filters: Record<string, unknown>;
  payload?: unknown;
};

// Captures the most recent insert payload per table so tests can assert the
// exact rows written by the dues/ledger forms.
const lastInsert: Record<string, unknown> = {};

const createBuilder = (
  table: string,
  handler: (query: QueryState) => QueryResult,
) => {
  const state: QueryState = { table, mode: "select", filters: {} };

  const builder: any = {
    select: () => {
      if (state.mode === "select") state.mode = "select";
      return builder;
    },
    update: (payload: unknown) => {
      state.mode = "update";
      state.payload = payload;
      return builder;
    },
    insert: (payload: unknown) => {
      state.mode = "insert";
      state.payload = payload;
      lastInsert[table] = payload;
      return builder;
    },
    delete: () => {
      state.mode = "delete";
      return builder;
    },
    eq: (field: string, value: unknown) => {
      state.filters[`eq:${field}`] = value;
      return builder;
    },
    is: (field: string, value: unknown) => {
      state.filters[`is:${field}`] = value;
      return builder;
    },
    in: (field: string, value: unknown) => {
      state.filters[`in:${field}`] = value;
      return builder;
    },
    order: () => builder,
    limit: () => builder,
    single: async () => handler(state),
    maybeSingle: async () => handler(state),
    then: (
      resolve: (value: QueryResult) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(handler(state)).then(resolve, reject),
  };

  return builder;
};

const APP_DIR = {
  _layout: RootLayout,
  index: OtpScreen,
  "profile-setup": ProfileSetupScreen,
  "member-requests": MemberRequestsScreen,
  "member-profile": MemberProfileScreen,
  home: HomeScreen,
  club: ClubScreen,
  "(tabs)/_layout": TabsLayout,
  "(tabs)/members": MembersScreen,
  "(tabs)/activity": ActivityScreen,
  "(tabs)/economy": EconomyScreen,
  "(tabs)/setup": SetupScreen,
};

const sessionFor = (role: "owner" | "member") => ({
  access_token: "test",
  token_type: "bearer",
  expires_in: 3600,
  refresh_token: "refresh",
  user: {
    id: "user-id",
    phone: "+919876543210",
    email: "user@test.com",
    user_metadata: { full_name: "Test User", member_email: "user@test.com" },
    _role: role,
  },
});

// Routes a single from() handler for a club where the current user holds `role`.
const buildFromHandler =
  (role: "owner" | "member") =>
  (table: string, query: QueryState): QueryResult => {
    if (table === "members") {
      // loadMembers: full roster for a club (filtered by club, not user).
      if (query.filters["eq:club_id"] && !query.filters["eq:user_id"]) {
        return {
          data: [
            {
              id: "me",
              name: "Test User",
              role,
              user_id: "user-id",
              membership_status: "active",
            },
            {
              id: "other",
              name: "Other Member",
              role: "member",
              user_id: "other-user",
              membership_status: "active",
            },
          ],
          error: null,
        };
      }
      // detectPostLoginFlow / loadHomeData: this user's active memberships.
      if (query.filters["eq:user_id"]) {
        return {
          data: [
            {
              id: "me",
              club_id: "club1",
              role,
              membership_status: "active",
            },
          ],
          error: null,
        };
      }
      // loadMembershipRequests by phone -> none.
      return { data: [], error: null };
    }
    if (table === "clubs") {
      const club = {
        id: "club1",
        name: "Sunrise Runners",
        description: "Runners",
      };
      // loadHomeData/openClub use .in("id", [...]) and expect an array;
      // detectPostLoginFlow uses .eq("id", ...).maybeSingle() and expects one.
      if (query.filters["in:id"]) {
        return { data: [club], error: null };
      }
      return { data: club, error: null };
    }
    // dues_plans, dues_cycles, member_dues, ledger_entries, club_invites -> empty.
    return { data: [], error: null };
  };

const renderForRole = (role: "owner" | "member") => {
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({
    data: { session: sessionFor(role) },
  });
  (supabase.auth.getUser as jest.Mock).mockResolvedValue({
    data: { user: sessionFor(role).user },
    error: null,
  });
  (supabase.from as jest.Mock).mockImplementation((table: string) =>
    createBuilder(table, (query) => buildFromHandler(role)(table, query)),
  );
  renderRouter(APP_DIR, { initialUrl: "/" });
};

describe("Dues & ledger role matrix", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    for (const key of Object.keys(lastInsert)) delete lastInsert[key];
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
    (supabase.auth.updateUser as jest.Mock).mockResolvedValue({ error: null });
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: 0, error: null });
  });

  it("lets an owner create a dues plan from the Economy tab", async () => {
    renderForRole("owner");

    // Owner auto-enters the active club and lands on the Members tab.
    expect(await screen.findByText("Member directory")).toBeTruthy();

    // Move to the Economy tab and open the Plans sub-tab.
    fireEvent.press(screen.getByText("Economy"));
    fireEvent.press(await screen.findByLabelText("Plans tab"));

    expect(await screen.findByText("Dues plans")).toBeTruthy();
    expect(screen.getByText("Billing cycles")).toBeTruthy();

    // Open the plan sheet, then fill and submit the dues plan form.
    fireEvent.press(screen.getByLabelText("New dues plan"));
    fireEvent.changeText(
      screen.getByLabelText("Plan name"),
      "Monthly Membership",
    );
    fireEvent.changeText(screen.getByLabelText("Plan amount"), "1000");
    fireEvent.changeText(screen.getByLabelText("Grace days"), "3");
    fireEvent.press(screen.getByText("Create dues plan"));

    await waitFor(() => {
      expect(lastInsert["dues_plans"]).toEqual(
        expect.objectContaining({
          club_id: "club1",
          name: "Monthly Membership",
          amount: 1000,
          frequency: "monthly",
          grace_days: 3,
          created_by: "me",
        }),
      );
    });
  });

  it("records a manual ledger expense for an owner", async () => {
    renderForRole("owner");

    expect(await screen.findByText("Member directory")).toBeTruthy();

    fireEvent.press(screen.getByText("Economy"));
    fireEvent.press(await screen.findByLabelText("Ledger tab"));

    expect(await screen.findByText("Recent transactions")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("New transaction"));

    fireEvent.press(screen.getByLabelText("Transaction type expense"));
    fireEvent.changeText(screen.getByLabelText("Transaction amount"), "350");
    fireEvent.changeText(
      screen.getByLabelText("Transaction category"),
      "Venue",
    );
    fireEvent.press(screen.getByText("Record transaction"));

    await waitFor(() => {
      expect(lastInsert["ledger_entries"]).toEqual(
        expect.objectContaining({
          club_id: "club1",
          type: "expense",
          amount: 350,
          category: "Venue",
          method: "UPI",
          status: "completed",
          source: "manual",
          recorded_by: "me",
        }),
      );
    });
  });

  it("hides dues management and invite controls from a plain member", async () => {
    renderForRole("member");

    expect(await screen.findByText("Member directory")).toBeTruthy();

    // Member cannot send invites on the Members tab.
    expect(screen.queryByText("Send onboarding invite")).toBeNull();

    // Member cannot manage dues plans on the Economy tab.
    fireEvent.press(screen.getByText("Economy"));
    fireEvent.press(await screen.findByLabelText("Plans tab"));
    expect(
      await screen.findByText(
        "Only an owner or treasurer can manage dues plans and cycles.",
      ),
    ).toBeTruthy();
  });
});
