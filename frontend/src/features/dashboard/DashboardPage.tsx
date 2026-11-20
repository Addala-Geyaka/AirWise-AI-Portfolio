import { lazy, Suspense } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock3,
  CloudSun,
  RefreshCw,
  Wind,
} from "lucide-react";
import PageHeading from "../../components/PageHeading";
import Panel from "../../components/Panel";
import { useAppContext } from "../../app/AppContext";
import { formatNumber, formatTime } from "../../lib/format";

const TrendChart = lazy(() => import("../../components/TrendChart"));

export default function DashboardPage() {
  const { air, place, preferences, refreshAir } = useAppContext();
  const locationName = place.city || place.name;
  const result = air.data;
  const guidance =
    result?.aqi !== null && result?.aqi !== undefined && result.aqi > 100
      ? "Consider moving your outdoor activity to a lower-AQI time."
      : "Check the forecast before choosing a longer outdoor activity.";

  return (
    <>
      <PageHeading
        eyebrow="YOUR DAILY AIR BRIEF"
        title={`Hello, ${locationName}`}
        description="A calm, clear view of what the air may mean for your plans today."
        action={
          <button
            className="button button-secondary"
            onClick={refreshAir}
            disabled={air.isFetching}
          >
            <RefreshCw
              size={15}
              className={air.isFetching ? "spin" : undefined}
            />
            {air.isFetching ? "Refreshing…" : "Refresh data"}
          </button>
        }
      />
      {air.isLoading && (
        <div className="loading-panel" role="status" aria-live="polite">
          <span className="loader-ring" />
          Fetching the latest model data for {locationName}…
        </div>
      )}
      {air.isError && (
        <div className="notice notice-error" role="alert">
          <div>
            <strong>Air data could not be loaded.</strong>
            <p>
              Check your connection and try again. No readings are being
              estimated.
            </p>
          </div>
          <button
            className="button button-secondary"
            onClick={refreshAir}
            disabled={air.isFetching}
          >
            {air.isFetching ? "Refreshing…" : "Try again"}
          </button>
        </div>
      )}
      {result && (
        <>
          {result.freshness === "stale" && (
            <div className="notice notice-warn" role="status">
              <Clock3 size={17} />
              <span>
                This source timestamp is older than expected. Treat this reading
                as stale.
              </span>
            </div>
          )}
          {result.freshness === "unavailable" && (
            <div className="notice notice-warn" role="status">
              <span>
                Current reading unavailable. The AQI value is not being filled
                in.
              </span>
            </div>
          )}
          <div className="dashboard-grid">
            <Panel className="aqi-panel">
              <div className="panel-head">
                <div>
                  <span className="eyebrow">AIR QUALITY NOW</span>
                  <h2>City air snapshot</h2>
                </div>
                <span className={`source-state ${result.freshness}`}>
                  {result.freshness === "current"
                    ? "Current"
                    : result.freshness}
                </span>
              </div>
              <div className="aqi-main">
                <div
                  className="aqi-meter"
                  role="img"
                  style={
                    {
                      "--aqi-color": result.aqi_color ?? "#87958f",
                    } as React.CSSProperties
                  }
                  aria-label={
                    result.aqi === null
                      ? "AQI unavailable"
                      : `US AQI ${Math.round(result.aqi)}`
                  }
                >
                  <span className="aqi-number">{formatNumber(result.aqi)}</span>
                  <span className="aqi-caption">US AQI</span>
                </div>
                <div className="aqi-summary">
                  <span className="aqi-category">
                    {result.aqi_category ?? "AQI unavailable"}
                  </span>
                  <p>
                    {result.aqi === null
                      ? "The source did not provide a current AQI value."
                      : result.aqi <= 50
                        ? "A lower reading in the US AQI scale."
                        : "Use the forecast to choose a time that suits your plans."}
                  </p>
                  <div className="source-line">
                    <span>Source</span>
                    {result.source}
                  </div>
                  <div className="source-line">
                    <span>Updated</span>
                    {formatTime(result.timestamp)}
                  </div>
                </div>
              </div>
              <div
                className="aqi-scale"
                role="group"
                aria-label="US AQI categories"
              >
                <span>Good</span>
                <span>Moderate</span>
                <span>Sensitive groups</span>
                <span>Unhealthy</span>
                <span>Very unhealthy</span>
                <span>Hazardous</span>
              </div>
              <div className="scale-track">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
            </Panel>
            <Panel className="weather-panel">
              <div className="panel-head">
                <div>
                  <span className="eyebrow">OUTDOOR CONDITIONS</span>
                  <h2>Weather context</h2>
                </div>
                <CloudSun size={21} className="soft-icon" />
              </div>
              <div className="weather-temperature">
                {formatNumber(result.temperature_c, 0)}
                <span>{result.temperature_c === null ? "" : "°"}</span>
              </div>
              <div className="weather-subtitle">Temperature · °C</div>
              <div className="weather-stats">
                <div>
                  <span>Humidity</span>
                  <strong>
                    {formatNumber(result.humidity_percent)}
                    {result.humidity_percent === null ? "" : "%"}
                  </strong>
                </div>
                <div>
                  <span>Wind</span>
                  <strong>
                    {formatNumber(result.wind_speed_kmh)}
                    {result.wind_speed_kmh === null ? "" : " km/h"}
                  </strong>
                </div>
              </div>
              <div className="weather-foot">
                Source: Open-Meteo weather forecast
              </div>
            </Panel>
            <Panel className="trend-panel">
              <div className="panel-head">
                <div>
                  <span className="eyebrow">NEXT 12 HOURS</span>
                  <h2>Plan around the trend</h2>
                </div>
                <span className="chart-legend">
                  <i />
                  Model AQI
                </span>
              </div>
              <Suspense
                fallback={
                  <div className="chart-empty" role="status">
                    Loading chart…
                  </div>
                }
              >
                <TrendChart forecast={result.forecast} />
              </Suspense>
              <p className="panel-footnote">
                Forecast values are modelled, not station measurements.
              </p>
            </Panel>
            <Panel className="routine-panel">
              <div className="panel-head">
                <div>
                  <span className="eyebrow">A SIMPLE NEXT STEP</span>
                  <h2>Your day, your pace</h2>
                </div>
                <span className="round-icon">
                  <Wind size={17} />
                </span>
              </div>
              <div className="routine-copy">{guidance}</div>
              <div className="routine-extra">
                {preferences.sensitiveGroup
                  ? "Family preference is on: include local guidance for sensitive groups."
                  : "Your plan stays flexible as the forecast changes."}
              </div>
              <a className="text-link" href="/planner">
                Open daily planner <ArrowDownRight size={15} />
              </a>
            </Panel>
            <Panel className="pollutants-panel">
              <div className="panel-head">
                <div>
                  <span className="eyebrow">WHAT’S IN THE AIR</span>
                  <h2>Pollutant readings</h2>
                </div>
                <span className="panel-head-note">Source units</span>
              </div>
              <div className="pollutant-grid">
                {result.pollutants.map((pollutant) => (
                  <div className="pollutant-item" key={pollutant.key}>
                    <span>{pollutant.label}</span>
                    <strong>
                      {formatNumber(
                        pollutant.value,
                        pollutant.key === "pm2_5" ? 1 : 0,
                      )}
                    </strong>
                    <small>
                      {pollutant.value === null
                        ? "Unavailable"
                        : pollutant.unit}
                    </small>
                  </div>
                ))}
              </div>
              <div className="pollutant-note">
                <ArrowUpRight size={14} /> Missing measurements stay marked as
                unavailable.
              </div>
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
