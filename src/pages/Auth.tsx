import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

type AuthMode = "login" | "signup";

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [studyFocus, setStudyFocus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === "login") {
        const { error: err } = await signIn(email, password);
        if (err) {
          setError(err);
        } else {
          navigate("/");
        }
      } else {
        if (!fullName.trim()) {
          setError("Please enter your full name.");
          setSubmitting(false);
          return;
        }
        if (!studyFocus.trim()) {
          setError("Please enter your study focus.");
          setSubmitting(false);
          return;
        }
        const { error: err } = await signUp(email, password, fullName.trim(), studyFocus.trim());
        if (err) {
          setError(err);
        } else {
          navigate("/");
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    setError(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <h1 className="text-2xl font-bold tracking-tight text-text-heading">
          Study Coach
        </h1>
        <p className="mt-1 text-sm text-text-body">
          {mode === "login"
            ? "Welcome back. Sign in to continue."
            : "Create an account to get started."}
        </p>

        {/* Toggle */}
        <div className="mt-6 flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          <button
            type="button"
            onClick={() => { setMode("login"); setError(null); }}
            className={`flex-1 cursor-pointer rounded-md px-4 py-2 text-sm font-medium transition-all duration-150 ${
              mode === "login"
                ? "bg-white text-text-heading shadow-sm"
                : "text-text-body hover:text-text-heading"
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => { setMode("signup"); setError(null); }}
            className={`flex-1 cursor-pointer rounded-md px-4 py-2 text-sm font-medium transition-all duration-150 ${
              mode === "signup"
                ? "bg-white text-text-heading shadow-sm"
                : "text-text-body hover:text-text-heading"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-heading">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-text-heading outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-heading">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-text-heading outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="At least 6 characters"
            />
          </div>

          {mode === "signup" && (
            <>
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-text-heading">
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-text-heading outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g. Alex Johnson"
                />
              </div>

              <div>
                <label htmlFor="studyFocus" className="block text-sm font-medium text-text-heading">
                  Study Focus
                </label>
                <input
                  id="studyFocus"
                  type="text"
                  required
                  value={studyFocus}
                  onChange={(e) => setStudyFocus(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-text-heading outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g. exam prep, certification, self-study"
                />
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className={`w-full cursor-pointer rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-150 ${
              submitting
                ? "cursor-not-allowed bg-primary-light/60"
                : "bg-primary hover:bg-primary-light"
            }`}
          >
            {submitting
              ? "Please wait…"
              : mode === "login"
                ? "Log In"
                : "Create Account"}
          </button>
        </form>

        {/* Toggle link */}
        <p className="mt-6 text-center text-sm text-text-body">
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={switchMode}
                className="cursor-pointer font-medium text-primary underline-offset-2 hover:underline"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={switchMode}
                className="cursor-pointer font-medium text-primary underline-offset-2 hover:underline"
              >
                Log in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}