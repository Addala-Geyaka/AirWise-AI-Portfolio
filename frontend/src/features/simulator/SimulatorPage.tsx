import { useMemo, useState } from "react";
import { ArrowRightLeft, Clock3, Info } from "lucide-react";
import PageHeading from "../../components/PageHeading";
import Panel from "../../components/Panel";
import { useAppContext } from "../../app/AppContext";
import { formatTime } from "../../lib/format";

export default function SimulatorPage() {
  const { air } = useAppContext();
  const choices = useMemo(
    () => (air.data?.forecast ?? []).filter((point) => point.aqi !== null),
    [air.data?.forecast],
  );
  const [selectedTime, setSelectedTime] = useState("");
  const selected =
    choices.find((point) => point.time === selectedTime) ?? choices[0];
  const baseline = air.data?.aqi;
  return (
    <>
      <PageHeading
        eyebrow="COMPARE THE TIMING"
        title="What if you shifted your plan?"
        description="Compare source forecast hours and choose a time that works better for your routine."
      />
      <div className="notice notice-info">
        <Info size={17} />
        <span>
          This tool compares forecasted AQI by hour. It does not predict
          personal exposure, health outcomes, or a change to city air quality.
        </span>
      </div>
      <div className="feature-grid simulator-grid">
        <Panel className="feature-main">
          <div className="panel-head">
            <div>
              <span className="eyebrow">TIMING COMPARISON</span>
              <h2>Pick a forecast hour</h2>
            </div>
            <ArrowRightLeft size={20} className="soft-icon" />
          </div>
          {choices.length > 0 ? (
            <label className="select-label">
              Forecast time
              <select
                value={selected?.time ?? ""}
                onChange={(event) => setSelectedTime(event.target.value)}
              >
                {choices.map((point) => (
                  <option value={point.time} key={point.time}>
                    {formatTime(point.time, air.data?.timezone)}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="empty-state">
              No hourly AQI forecast is available yet. Try again when source
              data is available.
            </div>
          )}
          <div className="comparison-cards">
            <div className="comparison-card">
              <span>Current source reading</span>
              <strong>
                {baseline === null || baseline === undefined
                  ? "Unavailable"
                  : Math.round(baseline)}
              </strong>
              <small>US AQI · current model</small>
            </div>
            <div className="comparison-arrow">
              <ArrowRightLeft size={18} />
            </div>
            <div className="comparison-card selected">
              <span>Selected forecast</span>
              <strong>
                {selected?.aqi === null || selected?.aqi === undefined
                  ? "Unavailable"
                  : Math.round(selected.aqi)}
              </strong>
              <small>
                {selected
                  ? formatTime(selected.time, air.data?.timezone)
                  : "No forecast selected"}
              </small>
            </div>
          </div>
          {selected && (
            <div className="forecast-callout">
              <Clock3 size={16} />
              <span>
                Source forecast for{" "}
                {formatTime(selected.time, air.data?.timezone)}. Values are
                modelled estimates, not monitor observations.
              </span>
            </div>
          )}
        </Panel>
        <Panel className="side-callout">
          <span className="eyebrow">A SIMPLE WAY TO USE THIS</span>
          <h2>Keep the plan flexible</h2>
          <p>
            Choose a time based on your schedule and the available forecast.
            Check a local air quality authority for official public guidance.
          </p>
          <div className="source-note">
            Source: {air.data?.source ?? "Not available"}
            {air.data?.timestamp
              ? ` · ${formatTime(air.data.timestamp, air.data.timezone)}`
              : ""}
          </div>
        </Panel>
      </div>
    </>
  );
}
