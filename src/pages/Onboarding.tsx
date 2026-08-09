import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const STUDY_FOCUS_OPTIONS = [
  { value: "exam_prep", label: "Exam Preparation" },
  { value: "certification", label: "Certification" },
  { value: "self_study", label: "Self-Study" },
  { value: "professional_development", label: "Professional Development" },
  { value: "other", label: "Other" },
] as const;

const PROFICIENCY_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
] as const;

/* ── Onboarding illustration ──────────────────────────────────────── */

function OnboardingIllustration() {
  return (
    <svg
      viewBox="0 0 120 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mx-auto h-20 w-auto"
      aria-hidden="true"
    >
      <circle cx="60" cy="45" r="30" fill="#1B2A4A" opacity="0.06" />
      <circle cx="60" cy="45" r="20" fill="#1B2A4A" opacity="0.06" />
      <circle cx="60" cy="45" r="10" fill="#C9953E" opacity="0.12" />
      {/* Compass arrow */}
      <path d="M60 25 L64 42 L80 45 L64 48 L60 65 L56 48 L40 45 L56 42Z" fill="#1B2A4A" opacity="0.12" />
      <path d="M60 30 L62 43 L72 45 L62 47 L60 60 L58 47 L48 45 L58 43Z" fill="#C9953E" opacity="0.2" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Onboarding Page                                                   */
/* ------------------------------------------------------------------ */

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();

  const [studyFocus, setStudyFocus] = useState("");
  const [otherFocus, setOtherFocus] = useState("");
  const [proficiencyLevel, setProficiencyLevel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // If the user is already onboarded, redirect away
  useEffect(() => {
    if (profile?.onboarding_completed) {
      navigate("/", { replace: true });
    }
  }, [profile, navigate]);

  // Reset when mounted
  useEffect(() => {
    setStudyFocus("");
    setOtherFocus("");
    setProficiencyLevel("");
    setError(null);
  }, []);

  const resolvedStudyFocus =
    studyFocus === "other" ? otherFocus.trim() : studyFocus;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate
    if (!studyFocus) {
      setError("Please select your study focus.");
      return;
    }
    if (studyFocus === "other" && !otherFocus.trim()) {
      setError("Please describe your study focus.");
      return;
    }
    if (!proficiencyLevel) {
      setError("Please select your proficiency level.");
      return;
    }

    if (!user) {
      setError("You must be logged in.");
      return;
    }

    setSaving(true);

    const { error: fnError } = await supabase.functions.invoke(
      "update-onboarding",
      {
        body: {
          study_focus: resolvedStudyFocus,
          proficiency_level: proficiencyLevel,
          onboarding_completed: true,
        },
      },
    );

    setSaving(false);

    if (fnError) {
      setError(
        fnError instanceof Error
          ? fnError.message
          : "Something went wrong. Please try again.",
      );
      return;
    }

    await refreshProfile();
    navigate("/", { replace: true });
  };

  // If profile is still loading or user is already onboarded, show nothing
  if (!profile || profile.onboarding_completed) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md">
        {/* ── Card ─────────────────────────────────────────────────── */}
        <div className="card-elevated-lg p-8">
          {/* Header with illustration */}
          <div className="text-center">
            <OnboardingIllustration />
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-text-heading">
              Let's personalize your first quiz
            </h1>
            <p className="mt-2 text-sm text-text-body">
              Help us tailor your experience.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-7 space-y-6">
            {/* ── Study Focus ──────────────────────────────────────── */}
            <fieldset>
              <label
                htmlFor="study-focus"
                className="block text-sm font-medium text-text-heading"
              >
                Study Focus <span className="text-error">*</span>
              </label>
              <select
                id="study-focus"
                value={studyFocus}
                onChange={(e) => setStudyFocus(e.target.value)}
                className="input-refined mt-1"
              >
                <option value="">Select your focus…</option>
                {STUDY_FOCUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {studyFocus === "other" && (
                <div className="mt-3 animate-[fadeIn_150ms_ease-out]">
                  <label
                    htmlFor="other-focus"
                    className="block text-sm font-medium text-text-heading"
                  >
                    Please specify
                  </label>
                  <input
                    id="other-focus"
                    type="text"
                    value={otherFocus}
                    onChange={(e) => setOtherFocus(e.target.value)}
                    placeholder="e.g. learning a new language"
                    className="input-refined mt-1"
                    autoFocus
                  />
                </div>
              )}
            </fieldset>

            {/* ── Proficiency Level ─────────────────────────────────── */}
            <fieldset>
              <legend className="text-sm font-medium text-text-heading">
                Proficiency Level <span className="text-error">*</span>
              </legend>
              <div className="mt-2 flex gap-2">
                {PROFICIENCY_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => setProficiencyLevel(level.value)}
                    className={`flex-1 cursor-pointer rounded-lg border px-4 py-2.5 text-sm font-medium transition-all duration-150 ${
                      proficiencyLevel === level.value
                        ? "border-accent bg-accent-muted text-accent shadow-sm"
                        : "border-gray-200 bg-white text-text-body hover:border-gray-300 hover:text-text-heading"
                    }`}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* ── Error ───────────────────────────────────────────── */}
            {error && (
              <p className="rounded-lg bg-error-light px-3 py-2 text-sm text-error">
                {error}
              </p>
            )}

            {/* ── Submit ──────────────────────────────────────────── */}
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary w-full py-3 text-sm"
            >
              {saving ? "Saving…" : "Get Started"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}