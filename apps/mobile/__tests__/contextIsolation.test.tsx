import { act, fireEvent, render } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";
import { ClubOsProvider } from "../src/ClubOsContext";
import {
  useActivities,
  useClubs,
  useDues,
  useMembers,
} from "../src/context/domainHooks";

jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  }),
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

// Render counters mutated in component bodies. Each probe consumes exactly one
// domain context, so its counter only increments when THAT context's value
// changes — which is the property the split was built to guarantee.
let duesRenders = 0;
let membersRenders = 0;
let activitiesRenders = 0;

function DuesProbe() {
  duesRenders += 1;
  const { memberDues } = useDues();
  return <Text testID="dues">{memberDues.length}</Text>;
}

function MembersProbe() {
  membersRenders += 1;
  const { members } = useMembers();
  return <Text testID="members">{members.length}</Text>;
}

function ActivitiesProbe() {
  activitiesRenders += 1;
  const { meetings } = useActivities();
  return <Text testID="activities">{meetings.length}</Text>;
}

function ClubController() {
  const { clubName, setClubName } = useClubs();
  return (
    <Pressable testID="rename" onPress={() => setClubName("Renamed")}>
      <Text testID="clubName">{clubName}</Text>
    </Pressable>
  );
}

beforeEach(() => {
  duesRenders = 0;
  membersRenders = 0;
  activitiesRenders = 0;
});

// Lets the provider's async bootstrap effect (getSession) settle.
const flush = () => act(async () => {});

describe("per-domain context isolation", () => {
  it("does not re-render unrelated domains when one domain's state changes", async () => {
    const view = render(
      <ClubOsProvider>
        <ClubController />
        <DuesProbe />
        <MembersProbe />
        <ActivitiesProbe />
      </ClubOsProvider>,
    );
    await flush();

    const baselineDues = duesRenders;
    const baselineMembers = membersRenders;
    const baselineActivities = activitiesRenders;

    // Mutate a Clubs-domain field only.
    fireEvent.press(view.getByTestId("rename"));

    // The Clubs consumer reflects the change...
    expect(view.getByTestId("clubName")).toHaveTextContent("Renamed");

    // ...while the dues, members and activities consumers never re-rendered,
    // because their memoized context values kept a stable identity.
    expect(duesRenders).toBe(baselineDues);
    expect(membersRenders).toBe(baselineMembers);
    expect(activitiesRenders).toBe(baselineActivities);
  });

  it("renders each domain consumer with empty defaults before a club loads", async () => {
    const view = render(
      <ClubOsProvider>
        <DuesProbe />
        <MembersProbe />
        <ActivitiesProbe />
      </ClubOsProvider>,
    );
    await flush();

    expect(view.getByTestId("dues")).toHaveTextContent("0");
    expect(view.getByTestId("members")).toHaveTextContent("0");
    expect(view.getByTestId("activities")).toHaveTextContent("0");
  });
});
