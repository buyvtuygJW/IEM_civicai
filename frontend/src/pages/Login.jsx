import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { loginUser } from "../api";
import { useAuth } from "../context/AuthContext";
import ChakraIcon from "../components/ChakraIcon";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await loginUser({ email, password });
      login(res.data.access_token, res.data.user);
      const redirectTo = location.state?.from?.pathname ||
        (res.data.user.role === "government" ? "/dashboard" : "/civicwatch");
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || "Couldn't log in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role) => {
    if (role === "citizen") {
      setEmail("citizen@demo.in");
      setPassword("demo1234");
    } else {
      setEmail("official@demo.in");
      setPassword("demo1234");
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="flex justify-center mb-4">
        <ChakraIcon size={56} id="chakraLogin" />
      </div>
      <div className="flex justify-center mb-2">
        <p className="eyebrow">Sign in</p>
      </div>
      <h2 className="font-display text-3xl font-bold text-center mb-8 bg-gradient-to-r from-orange-500 via-indigo-600 to-green-600 bg-clip-text text-transparent">
        Welcome back to HindCivicAi
      </h2>

      <form onSubmit={submit} className="ledger-card rounded-md p-6 space-y-4">
        <label className="text-sm block">
          Email
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border border-ink/30 rounded px-3 py-2 bg-transparent"
          />
        </label>
        <label className="text-sm block">
          Password
          <input
            type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border border-ink/30 rounded px-3 py-2 bg-transparent"
          />
        </label>

        {error && <p className="text-sm text-brick">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 rounded flex items-center justify-center gap-2">
          {loading && <Loader2 className="animate-spin" size={16} />}
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <div className="text-xs text-slate2 font-mono text-center pt-2 border-t border-ink/10">
          Demo accounts:{" "}
          <button type="button" onClick={() => fillDemo("citizen")} className="underline hover:text-ink">citizen</button>
          {" · "}
          <button type="button" onClick={() => fillDemo("government")} className="underline hover:text-ink">government</button>
        </div>
      </form>

      <p className="text-center text-sm text-ink/70 mt-6">
        Don't have an account? <Link to="/register" className="text-gold underline">Register here</Link>
      </p>
      <p className="text-center text-sm text-ink/60 mt-2">
        New government employee?{" "}
        <Link to="/register?role=government" className="text-green-700 underline font-medium">
          Register here
        </Link>
      </p>
    </div>
  );
}
