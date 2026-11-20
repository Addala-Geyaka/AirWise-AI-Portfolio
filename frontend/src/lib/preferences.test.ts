import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  savePreferences,
  toggleCompletedAction,
} from "./preferences";

describe("validated preferences", () => {
  beforeEach(() => window.localStorage.clear());

  it("uses defaults for missing or tampered storage", () => {
    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES);
    window.localStorage.setItem(
      "airwise.preferences.v1",
      JSON.stringify({ version: 99, sensitiveGroup: "yes" }),
    );
    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it("persists supported settings and action state", () => {
    const next = {
      ...DEFAULT_PREFERENCES,
      sensitiveGroup: true,
      completedActions: ["check-later"],
    };
    savePreferences(next);
    expect(loadPreferences()).toEqual(next);
  });

  it("toggles an action without mutating the input", () => {
    const next = toggleCompletedAction(DEFAULT_PREFERENCES, "plan-window");
    expect(next.completedActions).toEqual(["plan-window"]);
    expect(DEFAULT_PREFERENCES.completedActions).toEqual([]);
  });
});
