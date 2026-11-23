import { lazy, Suspense, useCallback, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppContextProvider } from "./AppContext";
import { AuthProvider } from "../auth/AuthContext";
import { loadPlace, savePlace } from "./locationStorage";
import { usePreferences } from "../hooks/usePreferences";
import { fetchAirQuality } from "../lib/api";
import type { Place } from "../types/air";
import AppLayout from "./AppLayout";

const DashboardPage = lazy(() => import("../features/dashboard/DashboardPage"));
const FamilyPage = lazy(() => import("../features/family/FamilyPage"));
const PlannerPage = lazy(() => import("../features/planner/PlannerPage"));
const IndoorPage = lazy(() => import("../features/indoor/IndoorPage"));
const AlternativesPage = lazy(
  () => import("../features/alternatives/AlternativesPage"),
);
const SimulatorPage = lazy(() => import("../features/simulator/SimulatorPage"));
const ProgressPage = lazy(() => import("../features/progress/ProgressPage"));
const AccountPage = lazy(() => import("../features/account/AccountPage"));

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

function AppRoutes() {
  const [place, setPlaceState] = useState<Place>(loadPlace);
  const [refreshNumber, setRefreshNumber] = useState(() => {
    const navigation = window.performance.getEntriesByType("navigation")[0] as
      PerformanceNavigationTiming | undefined;
    return navigation?.type === "reload" ? 1 : 0;
  });
  const [preferences, setPreferences] = usePreferences();
  const setPlace = useCallback((next: Place) => {
    setPlaceState(next);
    setRefreshNumber(0);
    try {
      savePlace(next);
    } catch {
      // Location selection still works when browser storage is unavailable.
    }
  }, []);
  const refreshAir = useCallback(() => {
    setRefreshNumber((current) => current + 1);
  }, []);
  const air = useQuery({
    queryKey: ["air-quality", place.latitude, place.longitude, refreshNumber],
    queryFn: ({ signal }) => fetchAirQuality(place, refreshNumber > 0, signal),
  });

  return (
    <AppContextProvider
      value={{ place, setPlace, refreshAir, air, preferences, setPreferences }}
    >
      <Routes>
        <Route element={<AppLayout />}>
          <Route
            index
            element={
              <Suspense fallback={<PageLoading />}>
                <DashboardPage />
              </Suspense>
            }
          />
          <Route
            path="family"
            element={
              <Suspense fallback={<PageLoading />}>
                <FamilyPage />
              </Suspense>
            }
          />
          <Route
            path="planner"
            element={
              <Suspense fallback={<PageLoading />}>
                <PlannerPage />
              </Suspense>
            }
          />
          <Route
            path="indoor"
            element={
              <Suspense fallback={<PageLoading />}>
                <IndoorPage />
              </Suspense>
            }
          />
          <Route
            path="alternatives"
            element={
              <Suspense fallback={<PageLoading />}>
                <AlternativesPage />
              </Suspense>
            }
          />
          <Route
            path="simulator"
            element={
              <Suspense fallback={<PageLoading />}>
                <SimulatorPage />
              </Suspense>
            }
          />
          <Route
            path="progress"
            element={
              <Suspense fallback={<PageLoading />}>
                <ProgressPage />
              </Suspense>
            }
          />
          <Route
            path="account"
            element={
              <Suspense fallback={<PageLoading />}>
                <AccountPage />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AppContextProvider>
  );
}

function PageLoading() {
  return (
    <div className="page-loading" role="status" aria-live="polite">
      Opening your air quality workspace…
    </div>
  );
}
