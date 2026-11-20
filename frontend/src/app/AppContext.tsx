import { createContext, useContext } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import type { AirQuality, Place } from "../types/air";
import type { Preferences } from "../lib/preferences";

export interface AppContextValue {
  place: Place;
  setPlace: (place: Place) => void;
  refreshAir: () => void;
  air: UseQueryResult<AirQuality, Error>;
  preferences: Preferences;
  setPreferences: (preferences: Preferences) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppContextProvider = AppContext.Provider;

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("App context is not available");
  return context;
}
