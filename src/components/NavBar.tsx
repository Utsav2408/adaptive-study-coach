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
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef, () => setDropdownOpen(false));

  // Reset form fields when modal opens
  useEffect(() => {
    if (editOpen && profile) {
      setFullName(profile.full_name);
      setStudyFocus(profile.study_focus);
      setSaveError(null);
    }
  }, [editOpen, profile]);

  const handleSaveProfile = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    setSaveError(null);

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), study_focus: studyFocus.trim() })
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
    navigate("/auth");
  }, [signOut, navigate]);

  const initials = profile?.full_name
    ? profile.full_name.charAt(0).toUpperCase()
    : "?";

  return (
    <>
      <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        {/* Left: avatar + brand */}
        <div className="flex items-center gap-3">
          {/* Avatar button */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-sm font-semibold text-white transition-opacity duration-150 hover:opacity-90"
              title={profile?.full_name ?? "Profile"}
            >
              {initials}
            </button>

            {/* Dropdown */}
            {dropdownOpen && (
              <div className="absolute left-0 top-full mt-2 w-44 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
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
                  className="flex w-full cursor-pointer items-center rounded-md px-3 py-2 text-left text-sm text-red-600 transition-colors duration-150 hover:bg-red-50"
                >
                  Log Out
                </button>
              </div>
            )}
          </div>

          <Link to="/" className="text-lg font-semibold text-text-heading">
            Study Coach
          </Link>
        </div>

        {/* Right: nav links */}
        <div className="flex items-center gap-6">
          <Link
            to="/"
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
        </div>
      </nav>

      {/* ── Profile edit modal ──────────────────────────────────── */}
      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
          onClick={() => setEditOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-lg"
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
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-text-heading outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label htmlFor="edit-focus" className="block text-sm font-medium text-text-heading">
                  Study Focus
                </label>
                <input
                  id="edit-focus"
                  type="text"
                  value={studyFocus}
                  onChange={(e) => setStudyFocus(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-text-heading outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {saveError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {saveError}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setEditOpen(false)}
                  className="flex-1 cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-text-heading transition-colors duration-150 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className={`flex-1 cursor-pointer rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 ${
                    saving
                      ? "cursor-not-allowed bg-primary-light/60"
                      : "bg-primary hover:bg-primary-light"
                  }`}
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