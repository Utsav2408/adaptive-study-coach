import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "../lib/supabaseClient";
import type { User, Session } from "@supabase/supabase-js";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface Profile {
  id: string;
  full_name: string;
  study_focus: string | null;
  proficiency_level: string | null;
  created_at: string;
}

interface SignUpResult {
  error: string | null;
  emailConfirmationSent?: boolean;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Context                                                           */
/* ------------------------------------------------------------------ */

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/* ------------------------------------------------------------------ */
/*  Provider                                                          */
/* ------------------------------------------------------------------ */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Fetch profile ──────────────────────────────────────────────
  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Failed to fetch profile:", error);
      setProfile(null);
    } else {
      setProfile(data);
    }
  }, [user]);

  // ── Initial session ────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // Fetch profile after session is restored
        supabase
          .from("profiles")
          .select("*")
          .eq("id", s.user.id)
          .single()
          .then(({ data, error }) => {
            if (!error && data) setProfile(data);
          })
          .then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (!s?.user) {
          setProfile(null);
        }
      },
    );

    return () => listener?.subscription.unsubscribe();
  }, []);

  // Auto-refresh profile when user changes
  useEffect(() => {
    if (user) {
      refreshProfile();
    }
  }, [user, refreshProfile]);

  // ── Sign In ────────────────────────────────────────────────────
  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error?.message ?? null };
    },
    [],
  );

  // ── Sign Up ────────────────────────────────────────────────────
  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      // 1. Create the auth user — pass fullName via user_metadata so the
      //    database trigger (handle_new_user) picks it up automatically.
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName },
        },
      });

      if (error) {
        return { error: error.message };
      }

      const newUser = data.user;
      if (!newUser) {
        return { error: "Sign up succeeded but no user was returned." };
      }

      // 2. If a session was returned (email confirmation disabled), the
      //    trigger has already created the profile. Refresh it.
      if (data.session) {
        await refreshProfile();
      }

      // 3. Let the caller know whether email confirmation is needed
      return { error: null, emailConfirmationSent: !data.session };
    },
    [refreshProfile],
  );

  // ── Sign Out ───────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  /* ── Render ──────────────────────────────────────────────────── */

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Hook                                                              */
/* ------------------------------------------------------------------ */

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}