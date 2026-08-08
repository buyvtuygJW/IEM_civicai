import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Wraps citizen-facing pages (Home, Welfare Copilot, CivicWatch). Government
 * accounts are redirected straight to the Dashboard — the government console
 * is meant to stay focused on complaint operations and welfare analytics,
 * not double as a citizen-facing site.
 */
export default function CitizenOnlyRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-24 text-center text-slate-500">
        Checking your session…
      </div>
    );
  }

  if (user?.role === "government") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
