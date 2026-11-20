import { CircleHelp, Fan, ShieldAlert, Wind } from "lucide-react";
import PageHeading from "../../components/PageHeading";
import Panel from "../../components/Panel";
import { useAppContext } from "../../app/AppContext";

function ventilationGuidance(aqi: number | null | undefined): string {
  if (aqi === null || aqi === undefined)
    return "Outdoor AQI is unavailable; use a local source before changing ventilation.";
  if (aqi > 100)
    return "If practical, limit unfiltered outdoor air while AQI is elevated; follow building guidance.";
  return "Ventilate when useful for your space, and avoid indoor pollution sources.";
}

export default function IndoorPage() {
  const { air } = useAppContext();
  const aqi = air.data?.aqi;
  return (
    <>
      <PageHeading
        eyebrow="YOUR SPACE"
        title="Indoor air lab"
        description="Use outdoor conditions as context while you manage the air inside your own space."
      />
      <div className="notice notice-info">
        <CircleHelp size={17} />
        <span>
          There is no indoor sensor connected. Outdoor readings cannot tell us
          what your indoor air is like.
        </span>
      </div>
      <div className="feature-grid indoor-grid">
        <Panel className="feature-main indoor-feature">
          <div className="feature-icon">
            <Wind size={20} />
          </div>
          <span className="eyebrow">VENTILATION CONTEXT</span>
          <h2>{ventilationGuidance(aqi)}</h2>
          <p>
            Current outdoor AQI:{" "}
            <strong>
              {aqi === null || aqi === undefined
                ? "Unavailable"
                : Math.round(aqi)}
            </strong>
            {air.data?.timestamp
              ? ` · source time ${new Date(air.data.timestamp).toLocaleString()}`
              : ""}
          </p>
          <div className="source-note">
            Based on the outdoor model forecast for{" "}
            {air.data?.place_name ?? "your selected city"}.
          </div>
        </Panel>
        <Panel className="indoor-tips">
          <div className="panel-head">
            <div>
              <span className="eyebrow">PRACTICAL CHECKLIST</span>
              <h2>Simple indoor steps</h2>
            </div>
            <Fan size={21} className="soft-icon" />
          </div>
          <ul className="tip-list">
            <li>
              <span className="tip-marker">01</span>
              <span>
                Use a filtration device if you already have one, following its
                manufacturer’s directions.
              </span>
            </li>
            <li>
              <span className="tip-marker">02</span>
              <span>
                Reduce indoor smoke and avoid burning materials indoors.
              </span>
            </li>
            <li>
              <span className="tip-marker">03</span>
              <span>
                Check indoor conditions with a suitable monitor if you need a
                measurement.
              </span>
            </li>
          </ul>
          <div className="notice notice-warn compact">
            <ShieldAlert size={16} />
            <span>Plants are not a substitute for filtration.</span>
          </div>
        </Panel>
      </div>
    </>
  );
}
