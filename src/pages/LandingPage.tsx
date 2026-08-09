import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import AuthModal from "../components/AuthModal";

/* ------------------------------------------------------------------ */
/*  How-it-works steps                                                */
/* ------------------------------------------------------------------ */

const STEPS = [
  {
    number: "01",
    title: "Take a diagnostic quiz",
    description:
      "Answer a short set of questions covering the core topics of a subject — just like a quick check-in.",
  },
  {
    number: "02",
    title: "See your real gaps",
    description:
      "Get a clear breakdown of which subtopics you've mastered and which ones need more attention.",
  },
  {
    number: "03",
    title: "Practice what matters",
    description:
      "Jump into targeted practice sessions that focus exactly on your weak areas, so your time is never wasted.",
  },
];

/* ------------------------------------------------------------------ */
/*  Abstract hero illustration (inline SVG)                           */
/* ------------------------------------------------------------------ */

function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 520 440"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-auto w-full max-w-lg"
      aria-hidden="true"
    >
      {/* Background subtle wave */}
      <path
        d="M0 320 Q130 280 260 320 T520 320"
        stroke="#C9953E"
        strokeWidth="2"
        fill="none"
        opacity="0.2"
      />
      <path
        d="M0 350 Q130 310 260 350 T520 350"
        stroke="#C9953E"
        strokeWidth="1.5"
        fill="none"
        opacity="0.15"
      />

      {/* Open book */}
      <g transform="translate(160, 140)">
        {/* Left page */}
        <path
          d="M0 0 Q-40 -10 -80 10 L-80 120 Q-40 100 0 110 Z"
          fill="#1B2A4A"
          opacity="0.9"
        />
        {/* Right page */}
        <path
          d="M0 0 Q40 -10 80 10 L80 120 Q40 100 0 110 Z"
          fill="#2C3F6A"
          opacity="0.9"
        />
        {/* Spine */}
        <line x1="0" y1="0" x2="0" y2="110" stroke="#C9953E" strokeWidth="2" />
        {/* Content lines on left page */}
        <rect x="-62" y="30" width="50" height="3" rx="1.5" fill="#E8D5A3" opacity="0.6" />
        <rect x="-62" y="40" width="40" height="3" rx="1.5" fill="#E8D5A3" opacity="0.4" />
        <rect x="-62" y="50" width="45" height="3" rx="1.5" fill="#E8D5A3" opacity="0.5" />
        <rect x="-62" y="60" width="35" height="3" rx="1.5" fill="#E8D5A3" opacity="0.3" />
        <rect x="-62" y="75" width="48" height="3" rx="1.5" fill="#E8D5A3" opacity="0.5" />
        <rect x="-62" y="85" width="38" height="3" rx="1.5" fill="#E8D5A3" opacity="0.4" />
        {/* Content lines on right page */}
        <rect x="12" y="30" width="50" height="3" rx="1.5" fill="#E8D5A3" opacity="0.6" />
        <rect x="12" y="40" width="40" height="3" rx="1.5" fill="#E8D5A3" opacity="0.4" />
        <rect x="12" y="50" width="45" height="3" rx="1.5" fill="#E8D5A3" opacity="0.5" />
        <rect x="12" y="60" width="35" height="3" rx="1.5" fill="#E8D5A3" opacity="0.3" />
        <rect x="12" y="75" width="48" height="3" rx="1.5" fill="#E8D5A3" opacity="0.5" />
        <rect x="12" y="85" width="38" height="3" rx="1.5" fill="#E8D5A3" opacity="0.4" />
      </g>

      {/* Lightbulb / idea glow (top right quadrant) */}
      <g transform="translate(380, 120)">
        <circle cx="0" cy="0" r="40" fill="#C9953E" opacity="0.08" />
        <circle cx="0" cy="0" r="25" fill="#C9953E" opacity="0.12" />
        {/* Bulb shape */}
        <path
          d="M-14 -5 C-14 -24 14 -24 14 -5 C14 6 8 8 8 16 L-8 16 C-8 8 -14 6 -14 -5 Z"
          fill="#C9953E"
          opacity="0.7"
        />
        <rect x="-4" y="16" width="8" height="4" rx="1" fill="#C9953E" opacity="0.4" />
        <rect x="-3" y="22" width="6" height="3" rx="1" fill="#C9953E" opacity="0.3" />
      </g>

      {/* Floating geometric elements */}
      <g transform="translate(80, 80)">
        <circle cx="0" cy="0" r="8" fill="#1B2A4A" opacity="0.15" />
        <rect x="-6" y="-6" width="12" height="12" rx="2" fill="#C9953E" opacity="0.2" transform="rotate(45)" />
      </g>
      <g transform="translate(450, 300)">
        <circle cx="0" cy="0" r="6" fill="#C9953E" opacity="0.25" />
      </g>
      <g transform="translate(130, 380)">
        <rect x="-5" y="-5" width="10" height="10" rx="1" fill="#2C3F6A" opacity="0.15" transform="rotate(30)" />
      </g>

      {/* Graduation cap (bottom right area) */}
      <g transform="translate(420, 360)">
        <path
          d="M-30 0 L0 -25 L30 0 L0 8 Z"
          fill="#1B2A4A"
          opacity="0.7"
        />
        <rect x="-4" y="6" width="8" height="14" rx="1" fill="#2C3F6A" opacity="0.6" />
        <line x1="0" y1="20" x2="0" y2="28" stroke="#C9953E" strokeWidth="1.5" opacity="0.6" />
      </g>

      {/* Checkmark / target */}
      <g transform="translate(60, 310)">
        <circle cx="0" cy="0" r="18" fill="none" stroke="#2C3F6A" strokeWidth="2" opacity="0.25" />
        <path d="M-6 0 L-2 5 L7 -5" stroke="#C9953E" strokeWidth="2.5" fill="none" opacity="0.6" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Landing Page                                                      */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "signup">("login");

  // If already authenticated, redirect straight to home
  useEffect(() => {
    if (!loading && user) {
      navigate("/home", { replace: true });
    }
  }, [user, loading, navigate]);

  const openAuth = (mode: "login" | "signup") => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

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

  // If user is already logged in, don't render the landing page
  // (the useEffect above is handling the redirect)
  if (user) return null;

  return (
    <div className="min-h-screen bg-surface">
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <span className="text-lg font-semibold tracking-tight text-text-heading">
          Study Coach
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => openAuth("login")}
            className="cursor-pointer rounded-lg px-5 py-2.5 text-sm font-medium text-text-heading transition-all duration-150 hover:bg-gray-100 active:scale-[0.98]"
          >
            Log In
          </button>
          <button
            onClick={() => openAuth("signup")}
            className="cursor-pointer rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-primary-light active:scale-[0.98]"
          >
            Sign Up
          </button>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="mx-auto flex max-w-6xl flex-col items-center gap-12 px-6 pt-12 sm:px-10 lg:flex-row lg:pt-24">
        {/* Text */}
        <div className="flex-1 text-center lg:text-left">
          <h1 className="text-4xl font-bold tracking-tight text-text-heading sm:text-5xl lg:text-6xl">
            Learn smarter.
            <br />
            <span className="text-primary-light">
              Understand exactly where you're stuck.
            </span>
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-text-body">
            Stop guessing. Take a targeted diagnostic quiz, uncover the
            specific subtopics tripping you up, and practice only what you
            actually need — so every study session counts.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
            <button
              onClick={() => openAuth("signup")}
              className="cursor-pointer rounded-lg bg-primary px-8 py-3.5 text-base font-semibold text-white shadow-sm transition-all duration-150 hover:bg-primary-light active:scale-[0.98]"
            >
              Get started free
            </button>
            <button
              onClick={() => openAuth("login")}
              className="cursor-pointer rounded-lg border border-gray-300 bg-white px-8 py-3.5 text-base font-medium text-text-heading transition-all duration-150 hover:bg-gray-50 active:scale-[0.98]"
            >
              Log In
            </button>
          </div>
        </div>

        {/* Illustration */}
        <div className="flex-1">
          <HeroIllustration />
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section className="mx-auto mt-24 max-w-5xl px-6 pb-24 sm:px-10">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-text-heading">
            How it works
          </h2>
          <p className="mt-3 text-base text-text-body">
            From confusion to clarity in three simple steps.
          </p>
        </div>

        <div className="mt-14 grid gap-8 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.number} className="text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/5 text-lg font-bold text-primary">
                {step.number}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-text-heading">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-body">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 bg-white py-8 text-center text-sm text-text-body">
        <p>&copy; {new Date().getFullYear()} Study Coach. All rights reserved.</p>
      </footer>

      {/* ── Auth Modal ───────────────────────────────────────────── */}
      <AuthModal
        initialMode={authModalMode}
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}