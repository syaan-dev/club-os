import { colors } from "../src/styles";
import {
  formatDateTime,
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
