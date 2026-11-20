import { CheckCheck, Circle, ListChecks } from "lucide-react";
import PageHeading from "../../components/PageHeading";
import Panel from "../../components/Panel";
import { useAppContext } from "../../app/AppContext";
import { buildRoutine } from "../planner/rules";

export default function ProgressPage() {
  const { air, preferences, setPreferences } = useAppContext();
  const actions = buildRoutine(air.data, preferences.sensitiveGroup);
  const completed = preferences.completedActions.filter((id) =>
    actions.some((action) => action.id === id),
  ).length;
  return (
    <>
      <PageHeading
        eyebrow="YOUR MOMENTUM"
        title="Progress center"
        description="Keep track of small planning actions you checked off today."
      />
      <div className="progress-grid">
        <Panel className="progress-summary">
          <div className="feature-icon">
            <CheckCheck size={21} />
          </div>
          <span className="eyebrow">TODAY’S CHECKLIST</span>
          <div className="progress-count">
            {completed}
            <span> / {actions.length}</span>
          </div>
          <p>planning steps completed</p>
          <div className="progress-track">
            <i
              style={{
                width: `${actions.length === 0 ? 0 : (completed / actions.length) * 100}%`,
              }}
            />
          </div>
          <small>Progress is saved in this browser.</small>
        </Panel>
        <Panel className="progress-actions">
          <div className="panel-head">
            <div>
              <span className="eyebrow">PLAN CHECKLIST</span>
              <h2>Small steps count</h2>
            </div>
            <ListChecks size={21} className="soft-icon" />
          </div>
          {actions.map((action) => {
            const checked = preferences.completedActions.includes(action.id);
            return (
              <label
                className={`progress-action${checked ? " complete" : ""}`}
                key={action.id}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    setPreferences({
                      ...preferences,
                      completedActions: checked
                        ? preferences.completedActions.filter(
                            (id) => id !== action.id,
                          )
                        : [...preferences.completedActions, action.id],
                    })
                  }
                />
                {checked ? <CheckCheck size={18} /> : <Circle size={18} />}
                <span>
                  <strong>{action.title}</strong>
                  <small>{action.detail}</small>
                </span>
              </label>
            );
          })}
        </Panel>
      </div>
      <div className="notice notice-info">
        <span>
          AirWise does not convert these actions into personal exposure
          reduction or environmental savings.
        </span>
      </div>
    </>
  );
}
