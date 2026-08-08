import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { registerUser } from "../api";
import { useAuth } from "../context/AuthContext";
import ChakraIcon from "../components/ChakraIcon";

export default function Register() {
  const [role, setRole] = useState("citizen");
  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "", department: "", government_code: "",
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await registerUser({ ...form, role });
      login(res.data.access_token, res.data.user);
      navigate(role === "government" ? "/admin/complaints" : "/civicwatch", { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || "Couldn't create your account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="flex justify-center mb-4">
        <ChakraIcon size={56} id="chakraRegister" />
      </div>
      <div className="flex justify-center mb-2">
        <p className="eyebrow">Create an account</p>
      </div>
      <h2 className="font-display text-3xl font-bold text-center mb-6 bg-gradient-to-r from-orange-500 via-indigo-600 to-green-600 bg-clip-text text-transparent">
        Join IndiCivicAI
      </h2>

      <div className="flex gap-2 mb-6 p-1 rounded-full bg-white/50 backdrop-blur border border-white/70">
        {[
          { v: "citizen", l: "Citizen" },
          { v: "government", l: "Government Employee" },
        ].map((opt) => (
          <button
            key={opt.v}
            type="button"
            onClick={() => setRole(opt.v)}
            className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${
              role === opt.v
                ? "bg-gradient-to-r from-indigo-600 to-blue-500 text-white shadow-md"
                : "text-ink/60 hover:text-ink"
            }`}
          >
            {opt.l}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="ledger-card rounded-md p-6 space-y-4">
        <label className="text-sm block">
          Full name
          <input required value={form.name} onChange={(e) => set("name", e.target.value)}
            className="mt-1 w-full border border-ink/30 rounded px-3 py-2 bg-transparent" />
        </label>
        <label className="text-sm block">
          Email
          <input type="email" required value={form.email} onChange={(e) => set("email", e.target.value)}
            className="mt-1 w-full border border-ink/30 rounded px-3 py-2 bg-transparent" />
        </label>
        <label className="text-sm block">
          Password
          <input type="password" required minLength={6} value={form.password} onChange={(e) => set("password", e.target.value)}
            className="mt-1 w-full border border-ink/30 rounded px-3 py-2 bg-transparent" />
        </label>
        <label className="text-sm block">
          Phone (optional)
          <input value={form.phone} onChange={(e) => set("phone", e.target.value)}
            className="mt-1 w-full border border-ink/30 rounded px-3 py-2 bg-transparent" />
        </label>

        {role === "government" && (
          <>
            <label className="text-sm block">
              Department
              <input required value={form.department} onChange={(e) => set("department", e.target.value)}
                placeholder="e.g. Electricity Department"
                className="mt-1 w-full border border-ink/30 rounded px-3 py-2 bg-transparent" />
            </label>
            <label className="text-sm block">
              Government registration code
              <input required value={form.government_code} onChange={(e) => set("government_code", e.target.value)}
                placeholder="Provided by your department admin"
                className="mt-1 w-full border border-ink/30 rounded px-3 py-2 bg-transparent" />
              <span className="text-xs text-slate2 font-mono">
                Demo code: CIVIC-GOV-2026
              </span>
            </label>
          </>
        )}

        {error && <p className="text-sm text-brick">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 rounded flex items-center justify-center gap-2">
          {loading && <Loader2 className="animate-spin" size={16} />}
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm text-ink/70 mt-6">
        Already have an account? <Link to="/login" className="text-gold underline">Sign in</Link>
      </p>
    </div>
  );
}
