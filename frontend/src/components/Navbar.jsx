import { NavLink, useNavigate } from "react-router-dom";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import ChakraIcon from "./ChakraIcon";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { to: "/", label: "Home" },
    { to: "/welfare", label: "Welfare Copilot" },
    { to: "/civicwatch", label: "CivicWatch" },
  ];
  if (user?.role === "government") {
    links.push({ to: "/admin/complaints", label: "Manage Complaints" });
    links.push({ to: "/dashboard", label: "Dashboard" });
  }

  const handleLogout = () => {
    logout();
    navigate("/");
    setMobileOpen(false);
  };

  const linkClass = ({ isActive }) =>
    `px-3 py-2 rounded-full text-sm font-medium transition-colors ${
      isActive ? "bg-white/70 text-ink shadow-sm" : "text-ink/60 hover:text-ink hover:bg-white/40"
    }`;

  return (
    <div className="sticky top-0 z-50 px-4 pt-4">
      <header
        className="max-w-6xl mx-auto rounded-full px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4"
        style={{
          background: "rgba(255,255,255,0.55)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          border: "1px solid rgba(255,255,255,0.7)",
          boxShadow: "0 8px 30px -10px rgba(30,39,73,0.18)",
        }}
      >
        <NavLink to="/" className="flex items-center gap-2 shrink-0" onClick={() => setMobileOpen(false)}>
          <ChakraIcon size={30} id="chakraNav" />
          <span className="font-display font-bold text-lg bg-gradient-to-r from-orange-500 via-indigo-600 to-green-600 bg-clip-text text-transparent">
            CivicAI
          </span>
        </NavLink>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === "/"} className={linkClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <div className="text-right leading-tight">
                <p className="text-sm font-semibold text-ink">{user.name}</p>
                <p className="text-[0.65rem] uppercase tracking-wide text-slate2 font-medium">
                  {user.role === "government" ? user.department || "Government" : "Citizen"}
                </p>
              </div>
              <button onClick={handleLogout} className="btn-secondary px-3 py-2 text-xs gap-1.5" aria-label="Log out">
                <LogOut size={14} /> Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="text-sm font-medium text-ink/70 hover:text-ink px-3 py-2">
                Log in
              </NavLink>
              <NavLink to="/register" className="btn-primary px-4 py-2 text-sm">
                Register
              </NavLink>
            </>
          )}
        </div>

        <button
          className="md:hidden p-2 rounded-full hover:bg-white/50"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {mobileOpen && (
        <div
          className="max-w-6xl mx-auto mt-2 rounded-3xl px-4 py-4 md:hidden flex flex-col gap-1"
          style={{
            background: "rgba(255,255,255,0.7)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.7)",
          }}
        >
          {links.map((link) => (
            <NavLink
              key={link.to} to={link.to} end={link.to === "/"}
              className={linkClass} onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
          <div className="border-t border-ink/10 mt-2 pt-2 flex flex-col gap-2">
            {user ? (
              <button onClick={handleLogout} className="btn-secondary px-3 py-2 text-xs justify-center gap-1.5">
                <LogOut size={14} /> Log out ({user.name})
              </button>
            ) : (
              <>
                <NavLink to="/login" className="text-sm text-center py-2" onClick={() => setMobileOpen(false)}>
                  Log in
                </NavLink>
                <NavLink to="/register" className="btn-primary px-4 py-2 text-sm text-center" onClick={() => setMobileOpen(false)}>
                  Register
                </NavLink>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
