import { useState, useEffect, useRef, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

type AuthMode = "login" | "signup";

interface Props {
  /** Which form to show initially */
  initialMode: AuthMode;
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Called when user wants to close (click overlay, press Escape, after success) */
  onClose: () => void;
}

export default function AuthModal({ initialMode, isOpen, onClose }: Props) {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Reset form when modal opens / mode is forced from outside
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setEmail("");
      setPassword("");
      setFullName("");
      setError(null);
      setSuccess(null);
      setSubmitting(false);
      // Remember what was focused before
      triggerRef.current = document.activeElement as HTMLElement;
    }
  }, [isOpen, initialMode]);

  // Focus trap & Escape key
  useEffect(() => {
    if (!isOpen) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    // Focus the first focusable element inside the modal
    const focusable = dialog.querySelector<HTMLElement>(
      'button, input, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // Simple focus trap
      if (e.key === "Tab") {
        const focusableEls = dialog.querySelectorAll<HTMLElement>(
          'button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusableEls.length === 0) return;

        const first = focusableEls[0];
        const last = focusableEls[focusableEls.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    // Prevent body scroll while modal is open
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      // Restore focus to trigger
      triggerRef.current?.focus();
    };
  }, [isOpen, onClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      if (mode === "login") {
        const { error: err } = await signIn(email, password);
        if (err) {
          setError(err);
        } else {
          onClose();
          navigate("/home");
        }
      } else {
        if (!fullName.trim()) {
          setError("Please enter your full name.");
          setSubmitting(false);
          return;
        }
        const result = await signUp(email, password, fullName.trim());
        if (result.error) {
          setError(result.error);
        } else if (result.emailConfirmationSent) {
          setMode("login");
          setError(null);
          setEmail("");
          setPassword("");
          setFullName("");
          setSuccess(
            "Account created! Check your email for a confirmation link.",
          );
        } else {
          onClose();
          navigate("/onboarding");
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
    setSuccess(null);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="w-full max-w-sm animate-[fadeIn_200ms_ease-out] rounded-xl border border-gray-200 bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="auth-modal-title" className="text-xl font-bold tracking-tight text-text-heading">
          Study Coach
        </h2>
        <p className="mt-1 text-sm text-text-body">
          {mode === "login"
            ? "Welcome back. Sign in to continue."
            : "Create an account to get started."}
        </p>

        {/* Toggle */}
        <div className="mt-5 flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          <button
            type="button"
            onClick={() => { setMode("login"); setError(null); setSuccess(null); }}
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
            onClick={() => { setMode("signup"); setError(null); setSuccess(null); }}
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
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="auth-email" className="block text-sm font-medium text-text-heading">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-text-heading outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-sm font-medium text-text-heading">
              Password
            </label>
            <input
              id="auth-password"
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
            <div>
              <label htmlFor="auth-fullName" className="block text-sm font-medium text-text-heading">
                Full Name
              </label>
              <input
                id="auth-fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-text-heading outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. Alex Johnson"
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {/* Success */}
          {success && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              {success}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className={`w-full cursor-pointer rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-150 active:scale-[0.98] ${
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
        <p className="mt-5 text-center text-sm text-text-body">
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