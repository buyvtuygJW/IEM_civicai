import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, CircleDashed, FileText, Send, Loader2, HandCoins, ShieldCheck } from "lucide-react";
import { checkEligibility, welfareChat } from "../api";

const OCCUPATIONS = [
  "Farmer", "Student", "Self-employed", "Small business owner", "Street vendor",
  "Salaried employee", "Homemaker", "Unemployed", "Retired",
];

const INDIAN_STATES = [
  "Andhra Pradesh", "Bihar", "Delhi", "Gujarat", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Rajasthan", "Tamil Nadu", "Telangana",
  "Uttar Pradesh", "West Bengal", "Other",
];

const CATEGORIES = ["General", "OBC", "SC", "ST"];
const MARITAL_STATUSES = ["Single", "Married", "Widowed", "Divorced"];
const EDUCATION_LEVELS = [
  "Not yet in school", "Below 10th", "10th passed", "12th passed", "Graduate", "Post-graduate",
];

const emptyProfile = {
  age: "", gender: "", occupation: "", annual_income: "", state: "",
  owns_land: null, owns_pucca_house: null, has_girl_child_under_10: null,
  bpl_or_seci_listed: null, has_disability: null,
  // personal / logical / academic
  category: "", marital_status: "", residence_type: "", family_members: "",
  education_level: "", currently_studying: null, is_pregnant_or_lactating: null,
  has_bank_account: null,
};

function TriToggle({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-ink/10 text-sm">
      <span className="text-ink/80">{label}</span>
      <div className="flex gap-1 font-mono text-xs">
        {[
          { v: true, l: "Yes" },
          { v: false, l: "No" },
          { v: null, l: "Skip" },
        ].map((opt) => (
          <button
            type="button"
            key={String(opt.v)}
            onClick={() => onChange(opt.v)}
            className={`px-2 py-1 rounded border ${
              value === opt.v
                ? "bg-ink text-paper border-ink"
                : "border-ink/30 text-ink/60 hover:border-ink"
            }`}
          >
            {opt.l}
          </button>
        ))}
      </div>
    </div>
  );
}

function SchemeCard({ scheme }) {
  const almost = scheme.status === "almost_eligible";
  return (
    <div className="ledger-card rounded-md p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">{scheme.category}</p>
          <h4 className="font-display text-lg font-semibold text-ink">{scheme.name}</h4>
        </div>
        <span
          className={`font-mono text-[0.65rem] uppercase tracking-wide px-2 py-1 rounded shrink-0 ${
            almost ? "bg-gold/15 text-gold" : "bg-forest/15 text-forest"
          }`}
        >
          {almost ? "Almost eligible" : "Eligible"}
        </span>
      </div>
      <p className="text-sm text-ink/70 mt-2 leading-relaxed">{scheme.description}</p>
      <p className="text-sm font-semibold text-ink mt-2">Benefit: {scheme.benefit}</p>

      <div className="mt-4">
        <p className="eyebrow mb-2 flex items-center gap-1">
          <FileText size={12} /> Document checklist
        </p>
        <ul className="space-y-1">
          {scheme.documents.map((doc) => (
            <li key={doc} className="flex items-center gap-2 text-sm text-ink/80">
              <CircleDashed size={14} className="text-slate2 shrink-0" />
              {doc}
            </li>
          ))}
        </ul>
      </div>

      {scheme.missing_criteria?.length > 0 && (
        <p className="text-xs text-slate2 mt-3 font-mono">
          Still need: {scheme.missing_criteria.join(", ")}
        </p>
      )}

      <a
        href={scheme.apply_url}
        target="_blank"
        rel="noreferrer"
        className="btn-primary inline-block mt-4 px-4 py-2 rounded"
      >
        Apply on official portal
      </a>
    </div>
  );
}

export default function WelfareCopilot() {
  const [profile, setProfile] = useState(emptyProfile);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [chatLog, setChatLog] = useState([
    { role: "assistant", text: "Hi! I'm your Welfare Copilot. Fill in your details, or just ask me a question below — e.g. 'What documents do I need for PM-KISAN?'" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const set = (key, value) => setProfile((p) => ({ ...p, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...profile,
        age: profile.age ? Number(profile.age) : null,
        annual_income: profile.annual_income ? Number(profile.annual_income) : null,
        family_members: profile.family_members ? Number(profile.family_members) : null,
        gender: profile.gender || null,
        occupation: profile.occupation || null,
        state: profile.state || null,
        category: profile.category || null,
        marital_status: profile.marital_status || null,
        residence_type: profile.residence_type || null,
        education_level: profile.education_level || null,
      };
      const res = await checkEligibility(payload);
      setResults(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatLog((log) => [...log, { role: "user", text: msg }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await welfareChat(msg, profile);
      setChatLog((log) => [...log, { role: "assistant", text: res.data.answer }]);
    } catch {
      setChatLog((log) => [...log, { role: "assistant", text: "Sorry, I couldn't reach the server just now." }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg shrink-0">
          <HandCoins className="text-white" size={18} />
        </div>
        <p className="eyebrow">Welfare Copilot</p>
      </div>
      <h2 className="font-display text-3xl font-bold text-ink mb-2">
        What government benefits am I eligible for?
      </h2>
      <p className="text-ink/70 max-w-2xl mb-8">
        Fill in as much as you're comfortable sharing — schemes now span every age group, from
        infant nutrition support to senior citizen pensions. Nothing is stored beyond an
        anonymous count for the government dashboard's scheme-adoption stats.
      </p>

      <div className="grid lg:grid-cols-5 gap-8">
        <form onSubmit={submit} className="lg:col-span-2 ledger-card rounded-md p-6 space-y-4 h-fit">
          <p className="eyebrow">Your profile</p>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Age
              <input
                type="number" min="0" max="120" value={profile.age}
                onChange={(e) => set("age", e.target.value)}
                className="mt-1 w-full border border-ink/30 rounded px-2 py-1.5 bg-transparent"
              />
            </label>
            <label className="text-sm">
              Gender
              <select
                value={profile.gender} onChange={(e) => set("gender", e.target.value)}
                className="mt-1 w-full border border-ink/30 rounded px-2 py-1.5 bg-transparent"
              >
                <option value="">Prefer not to say</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>

          <label className="text-sm block">
            Occupation
            <select
              value={profile.occupation} onChange={(e) => set("occupation", e.target.value)}
              className="mt-1 w-full border border-ink/30 rounded px-2 py-1.5 bg-transparent"
            >
              <option value="">Select…</option>
              {OCCUPATIONS.map((o) => (
                <option key={o} value={o.toLowerCase()}>{o}</option>
              ))}
            </select>
          </label>

          <label className="text-sm block">
            Annual household income (₹)
            <input
              type="number" min="0" value={profile.annual_income}
              onChange={(e) => set("annual_income", e.target.value)}
              placeholder="e.g. 180000"
              className="mt-1 w-full border border-ink/30 rounded px-2 py-1.5 bg-transparent"
            />
          </label>

          <label className="text-sm block">
            State
            <select
              value={profile.state} onChange={(e) => set("state", e.target.value)}
              className="mt-1 w-full border border-ink/30 rounded px-2 py-1.5 bg-transparent"
            >
              <option value="">Select…</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          {/* Personal / logical questions */}
          <p className="eyebrow pt-2">Personal details</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Category
              <select
                value={profile.category} onChange={(e) => set("category", e.target.value)}
                className="mt-1 w-full border border-ink/30 rounded px-2 py-1.5 bg-transparent"
              >
                <option value="">Skip</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-sm">
              Marital status
              <select
                value={profile.marital_status} onChange={(e) => set("marital_status", e.target.value)}
                className="mt-1 w-full border border-ink/30 rounded px-2 py-1.5 bg-transparent"
              >
                <option value="">Skip</option>
                {MARITAL_STATUSES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Residence
              <select
                value={profile.residence_type} onChange={(e) => set("residence_type", e.target.value)}
                className="mt-1 w-full border border-ink/30 rounded px-2 py-1.5 bg-transparent"
              >
                <option value="">Skip</option>
                <option value="urban">Urban</option>
                <option value="rural">Rural</option>
              </select>
            </label>
            <label className="text-sm">
              Family members
              <input
                type="number" min="1" value={profile.family_members}
                onChange={(e) => set("family_members", e.target.value)}
                placeholder="e.g. 4"
                className="mt-1 w-full border border-ink/30 rounded px-2 py-1.5 bg-transparent"
              />
            </label>
          </div>

          {/* Academic question */}
          <label className="text-sm block">
            Highest education level
            <select
              value={profile.education_level} onChange={(e) => set("education_level", e.target.value)}
              className="mt-1 w-full border border-ink/30 rounded px-2 py-1.5 bg-transparent"
            >
              <option value="">Skip</option>
              {EDUCATION_LEVELS.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </label>

          <div>
            <TriToggle label="Currently enrolled as a student?" value={profile.currently_studying} onChange={(v) => set("currently_studying", v)} />
            <TriToggle label="Own agricultural land?" value={profile.owns_land} onChange={(v) => set("owns_land", v)} />
            <TriToggle label="Own a pucca (permanent) house?" value={profile.owns_pucca_house} onChange={(v) => set("owns_pucca_house", v)} />
            <TriToggle label="Girl child under 10 in family?" value={profile.has_girl_child_under_10} onChange={(v) => set("has_girl_child_under_10", v)} />
            {profile.gender === "female" && (
              <TriToggle label="Currently pregnant or lactating?" value={profile.is_pregnant_or_lactating} onChange={(v) => set("is_pregnant_or_lactating", v)} />
            )}
            <TriToggle label="Have a bank account?" value={profile.has_bank_account} onChange={(v) => set("has_bank_account", v)} />
            <TriToggle label="BPL / SECC listed household?" value={profile.bpl_or_seci_listed} onChange={(v) => set("bpl_or_seci_listed", v)} />
            <TriToggle label="Certified disability (80%+)?" value={profile.has_disability} onChange={(v) => set("has_disability", v)} />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 rounded flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" size={16} /> : null}
            {loading ? "Checking…" : "Check my eligibility"}
          </button>
        </form>

        <div className="lg:col-span-3 space-y-6">
          {results ? (
            <>
              {results.eligible.length > 0 && (
                <div>
                  <p className="eyebrow mb-3 flex items-center gap-1">
                    <CheckCircle2 size={14} className="text-forest" /> You likely qualify for
                  </p>
                  <div className="space-y-4">
                    {results.eligible.map((s) => <SchemeCard key={s.id} scheme={s} />)}
                  </div>
                </div>
              )}
              {results.almost_eligible.length > 0 && (
                <div>
                  <p className="eyebrow mb-3 mt-6">Close — worth a look</p>
                  <div className="space-y-4">
                    {results.almost_eligible.map((s) => <SchemeCard key={s.id} scheme={s} />)}
                  </div>
                </div>
              )}
              {results.eligible.length === 0 && results.almost_eligible.length === 0 && (
                <p className="text-sm text-ink/60 ledger-card rounded-md p-6">
                  No matches yet based on what you've shared. Try filling in a few more fields,
                  or ask the copilot below.
                </p>
              )}
            </>
          ) : (
            <div className="ledger-card rounded-md p-6 text-sm text-ink/60">
              Fill in the form and press "Check my eligibility" to see matched schemes here.
            </div>
          )}

          <div className="ledger-card rounded-md p-5">
            <p className="eyebrow mb-3">Ask the copilot</p>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1 mb-3">
              {chatLog.map((m, i) => (
                <div key={i} className={`text-sm ${m.role === "assistant" ? "text-ink" : "text-ink/70 text-right"}`}>
                  <span className={`inline-block px-3 py-2 rounded-md ${m.role === "assistant" ? "bg-paperdark" : "bg-ink text-paper"}`}>
                    {m.text}
                  </span>
                </div>
              ))}
              {chatLoading && <p className="text-xs text-slate2 font-mono">Thinking…</p>}
            </div>
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                placeholder="e.g. What documents do I need for PM-KISAN?"
                className="flex-1 border border-ink/30 rounded px-3 py-2 text-sm bg-transparent"
              />
              <button onClick={sendChat} className="btn-secondary px-3 rounded" aria-label="Send">
                <Send size={16} />
              </button>
            </div>
          </div>

          <div className="ledger-card rounded-md p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="text-white" size={16} />
            </div>
            <p className="text-sm text-ink/80">
              Work for a government department?{" "}
              <Link to="/register?role=government" className="text-green-700 font-medium underline">
                Register your official account →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
