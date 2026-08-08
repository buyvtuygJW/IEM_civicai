import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import CitizenOnlyRoute from "./components/CitizenOnlyRoute";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import WelfareCopilot from "./pages/WelfareCopilot";
import CivicWatch from "./pages/CivicWatch";
import Dashboard from "./pages/Dashboard";
import AdminComplaints from "./pages/AdminComplaints";
import AdminWelfare from "./pages/AdminWelfare";
import Login from "./pages/Login";
import Register from "./pages/Register";

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<CitizenOnlyRoute><Home /></CitizenOnlyRoute>} />
            <Route path="/welfare" element={<CitizenOnlyRoute><WelfareCopilot /></CitizenOnlyRoute>} />
            <Route path="/civicwatch" element={<CitizenOnlyRoute><CivicWatch /></CitizenOnlyRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/admin/complaints"
              element={
                <ProtectedRoute role="government">
                  <AdminComplaints />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/welfare"
              element={
                <ProtectedRoute role="government">
                  <AdminWelfare />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute role="government">
                  <Dashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
        <footer className="max-w-6xl mx-auto px-6 py-10 mt-10 border-t border-ink/15 text-xs font-mono text-slate2">
          CivicAI — built for IEMHACKS 4.0. Demo data only; not affiliated with any government body.
        </footer>
      </div>
    </AuthProvider>
  );
}
