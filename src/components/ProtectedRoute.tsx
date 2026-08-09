import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profileLoading, profile } = useAuth();
  const location = useLocation();

  // ── Wait for auth session to resolve ──────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-text-body">Loading…</p>
        </div>
      </div>
    );
  }

  // ── Not authenticated → redirect to auth ──────────────────────
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // ── Wait for profile to finish loading ────────────────────────
  if (profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-text-body">Loading…</p>
        </div>
      </div>
    );
  }

  // ── Not onboarded yet & not already on the onboarding page → redirect ─
  if (
    profile &&
    !profile.onboarding_completed &&
    location.pathname !== "/onboarding"
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}