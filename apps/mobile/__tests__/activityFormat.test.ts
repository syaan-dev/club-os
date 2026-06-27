import { colors } from "../src/styles";
import {
  formatDateTime,
  formatCountdown,
  meetingStatusColor,
} from "../src/components/activity/format";

describe("activity formatDateTime", () => {
  it("returns empty string for blank input", () => {
    expect(formatDateTime("")).toBe("");
  });

  it("returns the raw value when unparsable", () => {
    expect(formatDateTime("nope")).toBe("nope");
  });

  it("renders a short day/month/year date for valid input", () => {
    const out = formatDateTime("2026-06-30T10:00:00.000Z");
    expect(out).toMatch(/\d{1,2} \w{3} \d{4}/);
    expect(out).toContain("2026");
  });
});

describe("formatCountdown", () => {
  const inMs = (ms: number) => new Date(Date.now() + ms).toISOString();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  it("returns null for blank or unparsable input", () => {
    expect(formatCountdown(null)).toBeNull();
    expect(formatCountdown("")).toBeNull();
    expect(formatCountdown("nope")).toBeNull();
  });

  it("treats sub-minute and past times as 'now'", () => {
    expect(formatCountdown(inMs(-hour))).toBe("now");
    expect(formatCountdown(inMs(30 * 1000))).toBe("now");
  });

  it("renders minutes under an hour", () => {
    expect(formatCountdown(inMs(2 * minute))).toBe("in 2 minutes");
    expect(formatCountdown(inMs(45 * minute))).toBe("in 45 minutes");
  });

  it("renders hours under a day", () => {
    expect(formatCountdown(inMs(hour + minute))).toBe("in an hour");
    expect(formatCountdown(inMs(3 * hour))).toBe("in 3 hours");
  });

  it("never reads 'in 24 hours' near the day boundary", () => {
    expect(formatCountdown(inMs(day - 5 * minute))).toBe("in 23 hours");
  });

  it("renders days beyond a day", () => {
    expect(formatCountdown(inMs(day + minute))).toBe("tomorrow");
    expect(formatCountdown(inMs(3 * day))).toBe("in 3 days");
  });

  it("falls back to a full date beyond 30 days", () => {
    expect(formatCountdown(inMs(45 * day))).toMatch(/\d{1,2} \w{3} \d{4}/);
  });
});

describe("meetingStatusColor", () => {
  it("maps completed meetings to the accent colour", () => {
    expect(meetingStatusColor("completed")).toBe(colors.accent);
  });

  it("maps cancelled meetings to red", () => {
    expect(meetingStatusColor("cancelled")).toBe(colors.red);
  });

  it("maps scheduled (default) meetings to green", () => {
    expect(meetingStatusColor("scheduled")).toBe(colors.green);
  });
});
