import { Routes, Route, useLocation } from "react-router-dom";
import NavBar from "./components/NavBar";
import Home from "./pages/Home";
import Quiz from "./pages/Quiz";
import Results from "./pages/Results";
import Dashboard from "./pages/Dashboard";

const navBarHiddenPaths = ["/quiz", "/results"];

export default function App() {
  const location = useLocation();
  const showNavBar = !navBarHiddenPaths.includes(location.pathname);

  return (
    <div className="min-h-screen bg-gray-50">
      {showNavBar && <NavBar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/results" element={<Results />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </div>
  );
}