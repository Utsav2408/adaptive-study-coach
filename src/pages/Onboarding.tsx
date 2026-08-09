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

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        study_focus: resolvedStudyFocus,
        proficiency_level: proficiencyLevel,
        onboarding_completed: true,
      })
      .eq("id", user.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
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
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-text-heading">
            Let's personalize your first quiz
          </h1>
          <p className="mt-2 text-sm text-text-body">
            Help us tailor your experience.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {/* ── Study Focus ──────────────────────────────────────── */}
          <fieldset>
            <label
              htmlFor="study-focus"
              className="block text-sm font-medium text-text-heading"
            >
              Study Focus <span className="text-red-500">*</span>
            </label>
            <select
              id="study-focus"
              value={studyFocus}
              onChange={(e) => setStudyFocus(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-text-heading outline-none transition-all duration-150 focus:border-accent focus:ring-2 focus:ring-accent/20"
            >
              <option value="">Select your focus…</option>
              {STUDY_FOCUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* "Other" text field */}
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
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-text-heading outline-none transition-all duration-150 focus:border-accent focus:ring-2 focus:ring-accent/20"
                  autoFocus
                />
              </div>
            )}
          </fieldset>

          {/* ── Proficiency Level ─────────────────────────────────── */}
          <fieldset>
            <legend className="text-sm font-medium text-text-heading">
              Proficiency Level <span className="text-red-500">*</span>
            </legend>
            <div className="mt-2 flex gap-2">
              {PROFICIENCY_LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setProficiencyLevel(level.value)}
                  className={`flex-1 cursor-pointer rounded-lg border px-4 py-2.5 text-sm font-medium transition-all duration-150 ${
                    proficiencyLevel === level.value
                      ? "border-accent bg-accent/10 text-accent shadow-sm"
                      : "border-gray-300 bg-white text-text-body hover:border-gray-400 hover:text-text-heading"
                  }`}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </fieldset>

          {/* ── Error ───────────────────────────────────────────── */}
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {/* ── Submit ──────────────────────────────────────────── */}
          <button
            type="submit"
            disabled={saving}
            className={`w-full cursor-pointer rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-150 ${
              saving
                ? "cursor-not-allowed bg-primary-light/60"
                : "bg-primary hover:bg-primary-light active:scale-[0.98]"
            }`}
          >
            {saving ? "Saving…" : "Get Started"}
          </button>
        </form>
      </div>
    </div>
  );
}