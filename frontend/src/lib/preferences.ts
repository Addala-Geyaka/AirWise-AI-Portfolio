import { z } from "zod";

const STORAGE_KEY = "airwise.preferences.v1";
const STORAGE_VERSION = 1;
const StoredPreferencesSchema = z.object({
  version: z.literal(STORAGE_VERSION),
  sensitiveGroup: z.boolean(),
  completedActions: z.array(z.string().max(80)).max(100),
});

export type Preferences = z.infer<typeof StoredPreferencesSchema>;

export const DEFAULT_PREFERENCES: Preferences = {
  version: STORAGE_VERSION,
  sensitiveGroup: false,
  completedActions: [],
};

/** Load validated, versioned local preferences; malformed values fall back safely. */
export function loadPreferences(): Preferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const result = StoredPreferencesSchema.safeParse(
      JSON.parse(raw) as unknown,
    );
    return result.success ? result.data : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/** Persist a typed preference object through the versioned schema. */
export function savePreferences(value: Preferences): void {
  const validated = StoredPreferencesSchema.parse(value);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
}

export function toggleCompletedAction(
  preferences: Preferences,
  actionId: string,
): Preferences {
  const completedActions = preferences.completedActions.includes(actionId)
    ? preferences.completedActions.filter((id) => id !== actionId)
    : [...preferences.completedActions, actionId];
  return { ...preferences, completedActions };
}
