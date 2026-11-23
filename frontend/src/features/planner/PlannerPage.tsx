import { useMemo } from "react";
import { Activity, ArrowRight, CheckCircle2, Clock3, Wind } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import PageHeading from "../../components/PageHeading";
import Panel from "../../components/Panel";
import { useAppContext } from "../../app/AppContext";
import { toggleCompletedAction } from "../../lib/preferences";
import { buildRoutine } from "./rules";
import { fetchPlannerBrief } from "../../lib/api";

export default function PlannerPage() {
  const { air, preferences, setPreferences } = useAppContext();
  const actions = useMemo(
    () => buildRoutine(air.data, preferences.sensitiveGroup),
    [air.data, preferences.sensitiveGroup],
  );
  const brief = useQuery({
    queryKey: [
      "planner-brief",
      air.data?.latitude,
      air.data?.longitude,
      air.data?.aqi,
    ],
    queryFn: ({ signal }) => fetchPlannerBrief(air.data!, signal),
    enabled: air.data !== undefined,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
  return (
    <>
      <PageHeading
        eyebrow="A FLEXIBLE PLAN"
        title="Your daily planner"
        description="Rule-based actions with an optional AI-written summary from the current air-quality source data."
        action={
          <span className="rule-badge">
            <Activity size={14} />
            {brief.data?.provider === "gemini"
              ? "Gemini summary"
              : "Rule-based fallback"}
          </span>
        }
      />
      {air.isLoading && (
        <div className="loading-panel" role="status">
          Building your plan from current data…
        </div>
      )}
      {air.isError && (
        <div className="notice notice-error" role="alert">
          The live air reading is unavailable. The plan below uses a safe
          fallback and asks you to check a local source.
        </div>
      )}
      <div className="feature-grid planner-grid">
        <Panel className="feature-main">
          <div className="panel-head">
            <div>
              <span className="eyebrow">TODAY’S ROUTINE</span>
              <h2>Pick what feels workable</h2>
            </div>
            <span className="round-icon">
              <Clock3 size={17} />
            </span>
          </div>
          <p className="panel-intro">
            This is planning support, not a health assessment. AQI and forecast
            values come from the selected city’s data source.
          </p>
          <div className="ai-brief" aria-live="polite">
            <div className="ai-brief-title">
              <Wind size={15} aria-hidden="true" />
              <strong>Air quality brief</strong>
              <span className="ai-source-badge">
                {brief.data?.provider === "gemini" ? "Gemini" : "Rule-based"}
              </span>
            </div>
            <p>
              {brief.isLoading
                ? "Preparing a short summary from the source readings…"
                : (brief.data?.brief ??
                  "The brief is unavailable right now. Your routine below still uses local rules and source data.")}
            </p>
            <small>
              Uses AQI and forecast values only. It does not provide medical
              advice.
            </small>
          </div>
          <div className="action-list">
            {actions.map((action) => {
              const checked = preferences.completedActions.includes(action.id);
              return (
                <label
                  className={`action-row${checked ? " complete" : ""}`}
                  key={action.id}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setPreferences(
                        toggleCompletedAction(preferences, action.id),
                      )
                    }
                  />
                  <span className="action-check">
                    <CheckCircle2 size={18} />
                  </span>
                  <span className="action-copy">
                    <strong>{action.title}</strong>
                    <small>{action.detail}</small>
                  </span>
                </label>
              );
            })}
          </div>
          <div className="save-hint" role="status">
            Checked actions are saved on this device.
          </div>
        </Panel>
        <Panel className="side-callout">
          <span className="eyebrow">MAKE IT YOURS</span>
          <h2>Set your family preferences</h2>
          <p>
            Choose whether plans should include general reminders for sensitive
            groups. No personal health details are requested.
          </p>
          <Link to="/family" className="text-link">
            Review profile <ArrowRight size={15} />
          </Link>
        </Panel>
      </div>
    </>
  );
}
