import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";

/* ------------------------------------------------------------------ */
/*  Click-outside hook                                                */
/* ------------------------------------------------------------------ */

function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        handler();
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [ref, handler]);
}

/* ------------------------------------------------------------------ */
/*  NavBar                                                            */
/* ------------------------------------------------------------------ */

export default function NavBar() {
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [studyFocus, setStudyFocus] = useState("");
  const [otherFocus, setOtherFocus] = useState("");
  const [proficiencyLevel, setProficiencyLevel] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef, () => setDropdownOpen(false));

  // Predefined study focus options
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

  // Reset form fields when modal opens
  useEffect(() => {
    if (editOpen && profile) {
      setFullName(profile.full_name);
      const storedFocus = profile.study_focus ?? "";
      const matched = STUDY_FOCUS_OPTIONS.find(
        (opt) => opt.value !== "other" && opt.value === storedFocus,
      );
      if (matched) {
        setStudyFocus(storedFocus);
        setOtherFocus("");
      } else if (storedFocus) {
        setStudyFocus("other");
        setOtherFocus(storedFocus);
      } else {
        setStudyFocus("");
        setOtherFocus("");
      }
      setProficiencyLevel(profile.proficiency_level ?? "");
      setSaveError(null);
    }
  }, [editOpen, profile]);

  const handleSaveProfile = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    setSaveError(null);

    const resolvedFocus =
      studyFocus === "other" ? otherFocus.trim() : studyFocus;

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        study_focus: resolvedFocus || null,
        proficiency_level: proficiencyLevel || null,
      })
      .eq("id", user.id);

    if (error) {
      setSaveError(error.message);
    } else {
      await refreshProfile();
      setEditOpen(false);
    }
    setSaving(false);
  }, [user, fullName, studyFocus, refreshProfile]);

  const handleLogOut = useCallback(async () => {
    setDropdownOpen(false);
    await signOut();
    navigate("/");
  }, [signOut, navigate]);

  const initials = profile?.full_name
    ? profile.full_name.charAt(0).toUpperCase()
    : "?";

  return (
    <>
      <nav className="flex items-center justify-between border-b border-gray-200/80 bg-white/95 backdrop-blur-sm px-6 py-3">
        {/* Left: brand */}
        <Link to="/home" className="text-lg font-semibold tracking-tight text-text-heading">
          Study Coach
        </Link>

        {/* Right: nav links + avatar */}
        <div className="flex items-center gap-6">
          <Link
            to="/home"
            className="text-sm font-medium text-text-body transition-colors duration-150 hover:text-text-heading"
          >
            Home
          </Link>
          <Link
            to="/dashboard"
            className="text-sm font-medium text-text-body transition-colors duration-150 hover:text-text-heading"
          >
            Dashboard
          </Link>

          {/* Avatar button */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:opacity-90 active:scale-[0.95]"
              title={profile?.full_name ?? "Profile"}
            >
              {initials}
            </button>

            {/* Dropdown */}
            {dropdownOpen && (
              <div className="card-elevated absolute right-0 top-full mt-2 w-44 p-1 shadow-elevated animate-fade-in">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    setEditOpen(true);
                  }}
                  className="flex w-full cursor-pointer items-center rounded-md px-3 py-2 text-left text-sm text-text-heading transition-colors duration-150 hover:bg-gray-100"
                >
                  Profile
                </button>
                <button
                  onClick={handleLogOut}
                  className="flex w-full cursor-pointer items-center rounded-md px-3 py-2 text-left text-sm text-error transition-colors duration-150 hover:bg-error-light"
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── Profile edit modal ──────────────────────────────────── */}
      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4 backdrop-blur-sm"
          onClick={() => setEditOpen(false)}
        >
          <div
            className="card-elevated-lg w-full max-w-sm p-6 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-text-heading">
              Edit Profile
            </h2>
            <p className="mt-1 text-sm text-text-body">
              Update your name and study focus.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium text-text-heading">
                  Full Name
                </label>
                <input
                  id="edit-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-refined mt-1"
                />
              </div>

              <div>
                <label htmlFor="edit-focus" className="block text-sm font-medium text-text-heading">
                  Study Focus
                </label>
                <select
                  id="edit-focus"
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
                      htmlFor="edit-other-focus"
                      className="block text-sm font-medium text-text-heading"
                    >
                      Please specify
                    </label>
                    <input
                      id="edit-other-focus"
                      type="text"
                      value={otherFocus}
                      onChange={(e) => setOtherFocus(e.target.value)}
                      placeholder="e.g. learning a new language"
                      className="input-refined mt-1"
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {/* ── Proficiency Level ───────────────────────────── */}
              <div>
                <label className="block text-sm font-medium text-text-heading">
                  Proficiency Level
                </label>
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
              </div>

              {saveError && (
                <p className="rounded-lg bg-error-light px-3 py-2 text-sm text-error">
                  {saveError}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditOpen(false)}
                  className="btn btn-secondary flex-1 py-2.5 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="btn btn-primary flex-1 py-2.5 text-sm"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}