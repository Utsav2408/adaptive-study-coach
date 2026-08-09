import { Link } from "react-router-dom";

export default function NavBar() {
  return (
    <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
      <Link to="/" className="text-lg font-semibold text-gray-900">
        Study Coach
      </Link>
      <div className="flex items-center gap-6">
        <Link
          to="/"
          className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
        >
          Home
        </Link>
        <Link
          to="/dashboard"
          className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
        >
          Dashboard
        </Link>
      </div>
    </nav>
  );
}