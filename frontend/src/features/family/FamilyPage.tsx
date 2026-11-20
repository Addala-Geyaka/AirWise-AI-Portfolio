import { ShieldCheck, UsersRound } from "lucide-react";
import PageHeading from "../../components/PageHeading";
import Panel from "../../components/Panel";
import { useAppContext } from "../../app/AppContext";

export default function FamilyPage() {
  const { preferences, setPreferences } = useAppContext();
  return (
    <>
      <PageHeading
        eyebrow="YOUR PREFERENCES"
        title="Family profile"
        description="Set a few planning preferences. These stay on this device and are not sent to the air data provider."
      />
      <div className="feature-grid family-grid">
        <Panel className="feature-main">
          <div className="feature-icon">
            <UsersRound size={20} />
          </div>
          <span className="eyebrow">ROUTINE CONTEXT</span>
          <h2>Who should your plan keep in mind?</h2>
          <p>
            Choose whether to include general reminders to follow local guidance
            for sensitive groups. This preference does not change the underlying
            AQI reading.
          </p>
          <label className="setting-row">
            <span>
              <strong>Include sensitive-group reminders</strong>
              <small>
                For example, when planning for children, older adults, or people
                who identify as sensitive to air quality.
              </small>
            </span>
            <input
              type="checkbox"
              checked={preferences.sensitiveGroup}
              onChange={(event) =>
                setPreferences({
                  ...preferences,
                  sensitiveGroup: event.target.checked,
                })
              }
            />
          </label>
          <div className="save-hint" role="status">
            Saved on this device automatically
          </div>
        </Panel>
        <Panel className="privacy-card">
          <div className="feature-icon soft">
            <ShieldCheck size={20} />
          </div>
          <span className="eyebrow">PRIVATE BY DEFAULT</span>
          <h2>Your choice stays local</h2>
          <p>
            AirWise stores this planning preference in your browser. It does not
            ask for names, ages, diagnoses, or other personal health details.
          </p>
          <div className="privacy-badge">No account required</div>
        </Panel>
      </div>
    </>
  );
}
