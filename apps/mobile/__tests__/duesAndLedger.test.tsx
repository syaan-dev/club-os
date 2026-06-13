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
import MembersScreen from "../app/members";
import HubScreen from "../app/hub";
import DuesScreen from "../app/dues";

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
  members: MembersScreen,
  hub: HubScreen,
  dues: DuesScreen,
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
const buildFromHandler = (role: "owner" | "member") =>
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
    // dues_plans, dues_cycles, member_dues, transactions, club_invites -> empty.
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

  it("lets an owner open the dues desk and create a plan", async () => {
    renderForRole("owner");

    // Land on home, open the club -> membership desk.
    fireEvent.press(await screen.findByText("Sunrise Runners"));
    expect(await screen.findByText("3. Membership desk")).toBeTruthy();

    // Owner sees the dues management entry point.
    const duesButton = await screen.findByText("Manage dues & ledger");
    fireEvent.press(duesButton);

    // Dues screen shows all three management cards.
    expect(await screen.findByText("Dues plans")).toBeTruthy();
    expect(screen.getByText("Billing cycles")).toBeTruthy();
    expect(screen.getByText("Manual ledger")).toBeTruthy();

    // Fill and submit the dues plan form.
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

    fireEvent.press(await screen.findByText("Sunrise Runners"));
    fireEvent.press(await screen.findByText("Manage dues & ledger"));

    expect(await screen.findByText("Manual ledger")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Transaction type expense"));
    fireEvent.changeText(screen.getByLabelText("Transaction amount"), "350");
    fireEvent.changeText(screen.getByLabelText("Transaction category"), "Venue");
    fireEvent.press(screen.getByText("Record transaction"));

    await waitFor(() => {
      expect(lastInsert["transactions"]).toEqual(
        expect.objectContaining({
          club_id: "club1",
          type: "expense",
          amount: 350,
          category: "Venue",
          payment_method: "UPI",
          status: "completed",
          source: "manual",
          recorded_by: "me",
        }),
      );
    });
  });

  it("hides dues management and invite controls from a plain member", async () => {
    renderForRole("member");

    fireEvent.press(await screen.findByText("Sunrise Runners"));
    expect(await screen.findByText("3. Membership desk")).toBeTruthy();

    // Member cannot manage dues or send invites.
    expect(screen.queryByText("Manage dues & ledger")).toBeNull();
    expect(screen.queryByText("Send onboarding invite")).toBeNull();
  });
});
