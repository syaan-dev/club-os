import {
  buildInviteLink,
  isLeadership,
  mapRole,
  normalizePhone,
} from "../src/lib/format";

describe("normalizePhone", () => {
  it("returns empty string for blank/whitespace input", () => {
    expect(normalizePhone("")).toBe("");
    expect(normalizePhone("   ")).toBe("");
  });

  it("assumes +91 for a bare 10-digit number", () => {
    expect(normalizePhone("9876543210")).toBe("+919876543210");
  });

  it("strips non-digits before counting", () => {
    expect(normalizePhone("98765-43210")).toBe("+919876543210");
    expect(normalizePhone("(987) 654 3210")).toBe("+919876543210");
  });

  it("prefixes '+' for numbers that already include a country code", () => {
    expect(normalizePhone("919876543210")).toBe("+919876543210");
    expect(normalizePhone("+1 415 555 2671")).toBe("+14155552671");
  });

  it("does not force +91 for non-10-digit input", () => {
    expect(normalizePhone("12345")).toBe("+12345");
  });
});

describe("buildInviteLink", () => {
  it("encodes the token and club name into the deep link", () => {
    expect(buildInviteLink("abc123", "Chess Club")).toBe(
      "clubos://join?token=abc123&club=Chess%20Club",
    );
  });

  it("escapes reserved characters in both params", () => {
    expect(buildInviteLink("a&b=c", "R&D / Ops")).toBe(
      "clubos://join?token=a%26b%3Dc&club=R%26D%20%2F%20Ops",
    );
  });
});

describe("mapRole", () => {
  it.each([
    ["owner", "Owner"],
    ["treasurer", "Treasurer"],
    ["secretary", "Secretary"],
    ["member", "Member"],
  ] as const)("maps DB role %s -> %s", (db, display) => {
    expect(mapRole(db)).toBe(display);
  });

  it("defaults unknown or null roles to Member", () => {
    expect(mapRole(null)).toBe("Member");
    expect(mapRole("president")).toBe("Member");
    expect(mapRole("OWNER")).toBe("Member"); // case-sensitive by design
  });
});

describe("isLeadership", () => {
  it.each([
    ["Owner", true],
    ["Treasurer", true],
    ["Secretary", true],
    ["Member", false],
    ["", false],
  ] as const)("role %s -> %s", (role, expected) => {
    expect(isLeadership(role)).toBe(expected);
  });
});
