import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { quizSubject } from "../data/sampleQuiz";

/**
 * Checks whether the current user has already completed a diagnostic quiz
 * for the current subject. Returns { hasDiagnostic, checking } so the caller
 * can decide which CTA to show.
 *
 * This is the single source of truth – both Home and Dashboard use it so
 * the rule stays consistent if the query changes later.
 */
export function useDiagnosticCheck(userId: string | undefined) {
  const [hasDiagnostic, setHasDiagnostic] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!userId) {
      setHasDiagnostic(false);
      setChecking(false);
      return;
    }

    let cancelled = false;

    const check = async () => {
      try {
        const { data } = await supabase
          .from("quiz_results")
          .select("id")
          .eq("user_id", userId)
          .eq("subject", quizSubject)
          .eq("session_type", "diagnostic")
          .order("completed_at", { ascending: false })
          .limit(1);

        if (!cancelled) {
          setHasDiagnostic(data !== null && data.length > 0);
        }
      } catch {
        if (!cancelled) setHasDiagnostic(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    check();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { hasDiagnostic, checking };
}