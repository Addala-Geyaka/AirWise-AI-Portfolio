import { describe, expect, it } from "vitest";
import { formatHour, formatTime, uniqueTextParts } from "./format";

describe("location-aware time formatting", () => {
  const timestamp = "2026-11-20T12:00:00.000Z";

  it("formats source timestamps in the selected location timezone", () => {
    expect(formatHour(timestamp, "Asia/Kolkata")).not.toBe(
      formatHour(timestamp, "UTC"),
    );
    expect(formatTime(timestamp, "Asia/Kolkata")).not.toBe(
      formatTime(timestamp, "UTC"),
    );
  });

  it("falls back safely when an upstream timezone name is invalid", () => {
    expect(() => formatTime(timestamp, "not-a-timezone")).not.toThrow();
    expect(() => formatHour(timestamp, "not-a-timezone")).not.toThrow();
  });
});

describe("location label formatting", () => {
  it("trims empty parts and removes case-insensitive duplicates", () => {
    expect(
      uniqueTextParts([" Bengaluru ", "bengaluru", null, "Karnataka"]),
    ).toEqual(["Bengaluru", "Karnataka"]);
  });
});
