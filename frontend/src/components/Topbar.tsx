import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LocateFixed,
  Map,
  MapPin,
  Search,
  ChevronDown,
  LoaderCircle,
  UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useAppContext } from "../app/AppContext";
import { searchPlaces } from "../lib/api";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import type { Place } from "../types/air";

function locationKind(place: Place): string | undefined {
  const code = place.feature_code;
  if (code === "PCLI") return "Country";
  if (code === "PPLC") return "Capital city";
  if (code?.startsWith("ADM"))
    return code === "ADM1" ? "State / province" : "Administrative area";
  if (code?.startsWith("PPL")) return "City / town";
  return code === "LOC" ? "Location" : undefined;
}

function uniqueParts(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  return values.filter((value): value is string => {
    if (!value?.trim()) return false;
    const key = value.trim().toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function placeLabel(place: Place): string {
  return uniqueParts([
    place.name,
    place.district,
    place.city,
    place.admin1,
    place.admin2,
    place.postcode,
    place.country,
  ]).join(", ");
}

function placeContext(place: Place): string {
  const context = uniqueParts([
    place.district,
    place.city,
    place.admin1,
    place.admin2,
    place.postcode,
    place.country,
  ]).filter(
    (value) => value.toLocaleLowerCase() !== place.name.toLocaleLowerCase(),
  );
  return [locationKind(place), context.join(", ")].filter(Boolean).join(" · ");
}

export default function Topbar() {
  const { place, setPlace, air } = useAppContext();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const debounced = useDebouncedValue(query.trim(), 550);
  const results = useQuery({
    queryKey: ["place-search", debounced],
    queryFn: ({ signal }) => searchPlaces(debounced, signal),
    enabled: debounced.length >= 2 && open,
    staleTime: 60 * 60 * 1000,
  });

  function choosePlace(next: Place) {
    setPlace(next);
    setQuery("");
    setOpen(false);
    setLocationError("");
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationError("Your browser does not support location access.");
      return;
    }
    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        choosePlace({
          name: "My location",
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        setLocating(false);
      },
      (error) => {
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? "Allow location access in your browser to use this feature."
            : "We could not find your location. Try searching for a place instead.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 10_000 },
    );
  }

  const mapUrl = `https://www.openstreetmap.org/?mlat=${place.latitude}&mlon=${place.longitude}#map=12/${place.latitude}/${place.longitude}`;

  return (
    <header className="topbar">
      <div className="mobile-brand">
        <img className="mobile-brand-mark" src="/airwise-mark.png" alt="" />
        airwise<span>AI</span>
      </div>
      <form
        className="city-search"
        role="search"
        onSubmit={(event) => event.preventDefault()}
      >
        <Search size={17} aria-hidden="true" />
        <label className="sr-only" htmlFor="city-search-input">
          Search cities, states, or countries
        </label>
        <input
          id="city-search-input"
          role="combobox"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "Enter" && results.data?.[0]) {
              event.preventDefault();
              choosePlace(results.data[0]);
            }
          }}
          placeholder="Search any city, state, country, or postcode…"
          autoComplete="off"
          aria-expanded={open && debounced.length >= 2}
          aria-controls="city-search-results"
          aria-haspopup="listbox"
          aria-autocomplete="list"
        />
        {air.isFetching && (
          <LoaderCircle
            className="spin"
            size={16}
            role="img"
            aria-label="Updating air data"
          />
        )}
        {open && debounced.length >= 2 && (
          <div
            id="city-search-results"
            className="search-results"
            role="listbox"
            aria-label="Location search results"
          >
            {results.isFetching && (
              <div className="search-message">Looking up places…</div>
            )}
            {results.isError && (
              <div className="search-message">
                Location search is unavailable right now.
              </div>
            )}
            {results.data?.map((result) => (
              <button
                type="button"
                className="search-result"
                role="option"
                aria-selected="false"
                key={`${result.name}-${result.latitude}`}
                onClick={() => choosePlace(result)}
              >
                <MapPin size={16} aria-hidden="true" />
                <span>
                  <strong>{result.name}</strong>
                  <small>{placeContext(result)}</small>
                </span>
              </button>
            ))}
            {results.data?.length === 0 && (
              <div className="search-message">
                No matching place yet. Try a nearby city, state, or postcode.
              </div>
            )}
          </div>
        )}
      </form>
      <div className="location-tools">
        <div className="location-pill" title={placeLabel(place)}>
          <MapPin size={15} aria-hidden="true" />
          <span>{place.city || place.name}</span>
          <ChevronDown size={14} aria-hidden="true" />
        </div>
        <button
          className="location-action"
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          aria-label={locating ? "Finding your location" : "My location"}
          title="Use my current location"
        >
          {locating ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <LocateFixed size={16} />
          )}
          <span>{locating ? "Finding…" : "My location"}</span>
        </button>
        <a
          className="map-link"
          href={mapUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Map: Open ${place.name} on OpenStreetMap`}
          title="Open on map"
        >
          <Map size={16} aria-hidden="true" />
          <span>Map</span>
        </a>
        <Link
          className="account-link"
          to="/account"
          aria-label={user ? "Account" : "Sign in"}
          title={user?.email ?? "Sign in"}
        >
          <UserRound size={16} aria-hidden="true" />
          <span>{user ? "Account" : "Sign in"}</span>
        </Link>
      </div>
      <div className="topbar-status" role="status" aria-live="polite">
        <span
          className={`status-dot ${air.data?.freshness === "stale" ? "stale" : ""}`}
        />
        {air.isError
          ? "Data unavailable"
          : air.data?.freshness === "stale"
            ? "Stale source data"
            : air.data
              ? "Forecast updated"
              : "Connecting"}
      </div>
      {locationError && (
        <div className="location-error" role="alert">
          {locationError}
        </div>
      )}
    </header>
  );
}
