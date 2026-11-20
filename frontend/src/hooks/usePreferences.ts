import { useCallback, useState } from "react";
import {
  loadPreferences,
  savePreferences,
  type Preferences,
} from "../lib/preferences";

/** Keep validated preferences in sync with local storage. */
export function usePreferences(): [Preferences, (next: Preferences) => void] {
  const [preferences, setState] = useState(loadPreferences);
  const setPreferences = useCallback((next: Preferences) => {
    setState(next);
    try {
      savePreferences(next);
    } catch {
      // The feature remains usable if browser storage is unavailable.
    }
  }, []);
  return [preferences, setPreferences];
}
