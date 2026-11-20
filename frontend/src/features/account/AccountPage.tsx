import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  KeyRound,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import PageHeading from "../../components/PageHeading";
import Panel from "../../components/Panel";
import { useAuth } from "../../auth/AuthContext";
import { supabaseProjectUrl } from "../../auth/supabase";

type AccountMode = "sign-in" | "sign-up";
const supabaseCallbackUrl = supabaseProjectUrl
  ? `${supabaseProjectUrl.replace(/\/$/, "")}/auth/v1/callback`
  : "your-project.supabase.co/auth/v1/callback";

function explainAuthError(
  cause: unknown,
  provider: "email" | "google",
): string {
  const message = cause instanceof Error ? cause.message : "";
  const normalized = message.toLocaleLowerCase();
  if (
    provider === "google" &&
    normalized.includes("provider") &&
    (normalized.includes("not enabled") || normalized.includes("unsupported"))
  ) {
    return "Google sign-in is not enabled in Supabase yet. Open Authentication → Sign-in providers → Google, enable it, and add your Google OAuth client ID and secret.";
  }
  if (normalized.includes("redirect") || normalized.includes("allow list")) {
    return "Supabase rejected the return address. Add http://localhost:5173/account to Authentication → URL Configuration → Redirect URLs.";
  }
  if (normalized.includes("invalid login credentials")) {
    return "That email and password do not match an account. Check them or create an account first.";
  }
  if (normalized.includes("failed to fetch")) {
    return "Could not reach Supabase. Check your internet connection and project URL, then restart the web app.";
  }
  return (
    message || `We could not complete ${provider} sign-in. Please try again.`
  );
}

export default function AccountPage() {
  const auth = useAuth();
  const [mode, setMode] = useState<AccountMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      if (mode === "sign-in") {
        await auth.signIn(email, password);
        setMessage("You are signed in.");
      } else {
        const confirmationNeeded = await auth.signUp(email, password);
        setMessage(
          confirmationNeeded
            ? "Check your email for the account confirmation link."
            : "Your account is ready.",
        );
      }
    } catch (cause) {
      setError(explainAuthError(cause, "email"));
    } finally {
      setBusy(false);
    }
  }

  async function googleSignIn() {
    setBusy(true);
    setError("");
    try {
      await auth.signInWithGoogle();
    } catch (cause) {
      setError(explainAuthError(cause, "google"));
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setError("");
    try {
      await auth.signOut();
      setMessage("You have been signed out.");
    } catch {
      setError("Sign-out did not finish. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="YOUR AIRWISE ACCOUNT"
        title="Account and sign-in"
        description="Sign in with email or Google when account access is configured. You can keep using AirWise as a guest."
      />
      <div className="feature-grid account-grid">
        <Panel className="feature-main account-panel">
          <div className="feature-icon">
            <UserRound size={20} />
          </div>
          {auth.loading ? (
            <div className="loading-panel" role="status">
              Checking your sign-in…
            </div>
          ) : auth.user ? (
            <>
              <span className="eyebrow">SIGNED IN</span>
              <h2>{auth.user.email ?? "Your AirWise account"}</h2>
              <p>Your account session is managed securely by Supabase.</p>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => void signOut()}
                disabled={busy}
              >
                Sign out
              </button>
            </>
          ) : !auth.configured ? (
            <>
              <span className="eyebrow">ONE-TIME SETUP NEEDED</span>
              <h2>Connect your Supabase project</h2>
              <p>
                Sign-in is ready to use once you add your Supabase project URL
                and publishable key to <code>frontend/.env.local</code>. Email
                and Google sign-in must also be enabled in Supabase.
              </p>
              <Link to="/" className="text-link">
                Continue as a guest <ArrowRight size={15} />
              </Link>
            </>
          ) : (
            <>
              <span className="eyebrow">PRIVATE SIGN-IN</span>
              <h2>
                {mode === "sign-in" ? "Welcome back" : "Create your account"}
              </h2>
              <div
                className="account-tabs"
                role="group"
                aria-label="Account action"
              >
                <button
                  type="button"
                  className={mode === "sign-in" ? "selected" : ""}
                  onClick={() => {
                    setMode("sign-in");
                    setMessage("");
                    setError("");
                  }}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className={mode === "sign-up" ? "selected" : ""}
                  onClick={() => {
                    setMode("sign-up");
                    setMessage("");
                    setError("");
                  }}
                >
                  Create account
                </button>
              </div>
              <form
                className="account-form"
                onSubmit={(event) => void submit(event)}
              >
                <label>
                  Email address
                  <span className="account-input">
                    <Mail size={16} aria-hidden="true" />
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </span>
                </label>
                <label>
                  Password
                  <span className="account-input">
                    <KeyRound size={16} aria-hidden="true" />
                    <input
                      type="password"
                      autoComplete={
                        mode === "sign-in" ? "current-password" : "new-password"
                      }
                      minLength={8}
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </span>
                </label>
                <button
                  className="button button-primary"
                  type="submit"
                  disabled={busy}
                >
                  {busy
                    ? "Please wait…"
                    : mode === "sign-in"
                      ? "Sign in with email"
                      : "Create account"}
                </button>
              </form>
              <div className="account-divider">
                <span>or</span>
              </div>
              <button
                className="button button-secondary google-button"
                type="button"
                onClick={() => void googleSignIn()}
                disabled={busy}
              >
                <span className="google-g" aria-hidden="true">
                  G
                </span>
                Continue with Google
              </button>
              <details className="google-help">
                <summary>Google sign-in not working?</summary>
                <ol>
                  <li>
                    In Supabase, open Authentication → Sign-in providers →
                    Google. Enable Google and enter your Google OAuth client ID
                    and secret.
                  </li>
                  <li>
                    In Google Cloud, add <code>http://localhost:5173</code> as
                    an authorized JavaScript origin and this callback as an
                    authorized redirect URI:
                    <code className="google-callback">
                      {supabaseCallbackUrl}
                    </code>
                  </li>
                  <li>
                    In Supabase URL Configuration, add
                    <code>http://localhost:5173/account</code> to Redirect URLs.
                    If Google consent is in testing mode, add your Google
                    account as a test user.
                  </li>
                  <li>
                    Restart Vite after changing frontend environment values.
                  </li>
                </ol>
              </details>
              <p className="account-privacy">
                <ShieldCheck size={15} aria-hidden="true" />
                Sign-in is handled by Supabase. AirWise never sees your
                password.
              </p>
            </>
          )}
          {message && (
            <p className="account-message" role="status">
              {message}
            </p>
          )}
          {error && (
            <p className="account-error" role="alert">
              {error}
            </p>
          )}
        </Panel>
        <Panel className="privacy-card account-side">
          <div className="feature-icon soft">
            <ShieldCheck size={20} />
          </div>
          <span className="eyebrow">GUEST MODE IS AVAILABLE</span>
          <h2>Your location stays on this device</h2>
          <p>
            Location and planner preferences are stored locally. Signing in does
            not upload them or share personal health details.
          </p>
        </Panel>
      </div>
    </>
  );
}
