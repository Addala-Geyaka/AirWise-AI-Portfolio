import type { AirQuality } from "../../types/air";

export interface RoutineAction {
  id: string;
  title: string;
  detail: string;
}

export function buildRoutine(
  air: AirQuality | undefined,
  sensitiveGroup: boolean,
): RoutineAction[] {
  const aqi = air?.aqi;
  if (aqi === null || aqi === undefined) {
    return [
      {
        id: "check-source",
        title: "Check a local AQI source",
        detail:
          "The current reading is unavailable, so this plan avoids assumptions.",
      },
      {
        id: "keep-flexible",
        title: "Keep outdoor plans flexible",
        detail: "Review conditions again before heading out.",
      },
    ];
  }
  if (aqi <= 50) {
    return [
      {
        id: "usual-routine",
        title: "Follow your usual routine",
        detail: "The source reports AQI in the Good band right now.",
      },
      {
        id: "check-later",
        title: "Check again later",
        detail: "Modelled conditions can change through the day.",
      },
    ];
  }
  const actions: RoutineAction[] = [
    {
      id: "choose-window",
      title: "Choose a lower-AQI time",
      detail: "Compare the hourly forecast before scheduling outdoor activity.",
    },
    {
      id: "alternate-plan",
      title: "Keep an indoor option ready",
      detail: "Adjust your plan if conditions change.",
    },
  ];
  if (sensitiveGroup)
    actions.push({
      id: "local-guidance",
      title: "Check local guidance",
      detail: "Your family preference is on for sensitive-group reminders.",
    });
  return actions;
}
