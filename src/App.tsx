import { Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import Home from "./pages/Home";
import Quiz from "./pages/Quiz";
import Results from "./pages/Results";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";

const navBarHiddenPaths = ["/", "/quiz", "/results", "/onboarding"];

const footerHiddenPaths = ["/", "/quiz", "/results", "/onboarding"];

export default function App() {
  const location = useLocation();
  const showNavBar = !navBarHiddenPaths.includes(location.pathname);
  const showFooter = !footerHiddenPaths.includes(location.pathname);

  return (
    <AuthProvider>
      <div className="min-h-screen bg-surface">
        {showNavBar && <NavBar />}
        <Routes>
          {/* Public landing page */}
          <Route path="/" element={<LandingPage />} />

          {/* Auth-protected routes */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz"
            element={
              <ProtectedRoute>
                <Quiz />
              </ProtectedRoute>
            }
          />
          <Route
            path="/results"
            element={
              <ProtectedRoute>
                <Results />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
        {showFooter && <Footer />}
      </div>
    </AuthProvider>
  );
}