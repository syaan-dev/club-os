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
  },
}));

type QueryResult = { data: any; error: any };

type QueryState = {
  table: string;
  mode: "select" | "update" | "insert" | "delete";
  filters: Record<string, unknown>;
  payload?: unknown;
};

const createBuilder = (
  table: string,
  handler: (query: QueryState) => QueryResult,
) => {
  const state: QueryState = {
    table,
    mode: "select",
    filters: {},
  };

  const builder: any = {
    select: () => {
      state.mode = "select";
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

const mockSession = {
  access_token: "test",
  token_type: "bearer",
  expires_in: 3600,
  refresh_token: "refresh",
  user: {
    id: "user-id",
    phone: "+919876543210",
    email: "member@test.com",
    user_metadata: {},
  },
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
};

describe("App onboarding flows", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
    });
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: mockSession.user },
      error: null,
    });
    (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({
      error: null,
    });
    (supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });
    (supabase.auth.updateUser as jest.Mock).mockResolvedValue({ error: null });

    (supabase.from as jest.Mock).mockImplementation((table: string) =>
      createBuilder(table, () => ({ data: [], error: null })),
    );
  });

  it("sends OTP with normalized phone number", async () => {
    renderRouter(APP_DIR, { initialUrl: "/" });

    fireEvent.changeText(
      await screen.findByPlaceholderText("Phone number"),
      "9876543210",
    );
    fireEvent.press(screen.getByText("Send OTP"));

    await waitFor(() => {
      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
        phone: "+919876543210",
      });
    });
  });

  it("shows the home page with club invitations after login when pending invites exist", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
    });

    (supabase.from as jest.Mock).mockImplementation((table: string) =>
      createBuilder(table, (query) => {
        if (
          table === "members" &&
          query.mode === "select" &&
          query.filters["eq:user_id"]
        ) {
          return { data: [], error: null };
        }
        if (table === "club_invites" && query.mode === "select") {
          return {
            data: [
              {
                id: "inv1",
                club_id: "club1",
                token: "token1",
                status: "pending",
              },
              {
                id: "inv2",
                club_id: "club2",
                token: "token2",
                status: "pending",
              },
            ],
            error: null,
          };
        }
        if (
          table === "members" &&
          query.mode === "select" &&
          query.filters["eq:phone"]
        ) {
          return {
            data: [
              { id: "mem1", club_id: "club1" },
              { id: "mem2", club_id: "club2" },
            ],
            error: null,
          };
        }
        if (table === "clubs" && query.mode === "select") {
          return {
            data: [
              { id: "club1", name: "Chess Club" },
              { id: "club2", name: "Cycling Club" },
            ],
            error: null,
          };
        }
        return { data: [], error: null };
      }),
    );

    renderRouter(APP_DIR, { initialUrl: "/" });

    expect(await screen.findByText("Your clubs")).toBeTruthy();
    expect(await screen.findByText("Club invitations")).toBeTruthy();
    expect(await screen.findByText("Chess Club")).toBeTruthy();
    expect(await screen.findByText("Cycling Club")).toBeTruthy();
  });

  it("accepts a membership request and moves to profile completion", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
    });

    (supabase.from as jest.Mock).mockImplementation((table: string) =>
      createBuilder(table, (query) => {
        if (
          table === "members" &&
          query.mode === "select" &&
          query.filters["eq:user_id"]
        ) {
          return { data: [], error: null };
        }
        if (table === "club_invites" && query.mode === "select") {
          return {
            data: [
              {
                id: "inv1",
                club_id: "club1",
                token: "token1",
                status: "pending",
              },
            ],
            error: null,
          };
        }
        if (
          table === "members" &&
          query.mode === "select" &&
          query.filters["eq:phone"]
        ) {
          return {
            data: [{ id: "mem1", club_id: "club1" }],
            error: null,
          };
        }
        if (table === "clubs" && query.mode === "select") {
          return {
            data: [{ id: "club1", name: "Chess Club" }],
            error: null,
          };
        }
        if (table === "club_invites" && query.mode === "update") {
          return {
            data: [{ id: "inv1", status: "accepted" }],
            error: null,
          };
        }
        return { data: [], error: null };
      }),
    );

    renderRouter(APP_DIR, { initialUrl: "/" });

    expect(await screen.findByText("Your clubs")).toBeTruthy();
    fireEvent.press(screen.getByText("Accept invitation"));

    expect(
      await screen.findByText("2. Join club and complete profile"),
    ).toBeTruthy();
  });
});
