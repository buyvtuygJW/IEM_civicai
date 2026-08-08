import { useEffect, useState } from "react";
import { CheckCircle2, CircleDashed, FileText, Send, Loader2, HandCoins, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { checkEligibility, welfareChat, listStates } from "../api";

const OCCUPATIONS = [
  "Farmer", "Student", "Self-employed", "Small business owner", "Street vendor",
  "Salaried employee", "Homemaker", "Unemployed", "Retired",
];

// Fallback used only if the /welfare/states API call fails — the real list
// (all 28 states + 8 UTs, gazetteer-normalized) is fetched at mount.
const FALLBACK_STATES = [
  "Andhra Pradesh", "Bihar", "Delhi", "Gujarat", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Rajasthan", "Tamil Nadu", "Telangana",
  "Uttar Pradesh", "West Bengal", "Other",
];

const CATEGORIES = ["General", "OBC", "SC", "ST"];
const MARITAL_STATUSES = ["Single", "Married", "Widowed", "Divorced"];
const EDUCATION_LEVELS = [
  "No formal education", "Below 10th", "10th passed", "12th passed", "Graduate", "Postgraduate",
];

const emptyProfile = {
  age: "", gender: "", occupation: "", annual_income: "", state: "",
  owns_land: null, owns_pucca_house: null, has_girl_child_under_10: null,
  bpl_or_seci_listed: null, has_disability: null,
  // Personal / logical / academic questions — the more we know, the more
  // schemes (student, maternity, senior, category-based) we can match.
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

// Format/range checks — apply to ANY non-blank value, in the form or the chat
// box, because a garbled value (letters pasted into age, a negative income)
// should never go out over the wire no matter which control triggered it.
// Leaving a field blank is not an error here — that's a legitimate "prefer
// not to say" and is handled separately by requiredErrors below.
function formatErrors(p) {
  const errs = {};
  if (p.age !== "" && p.age != null) {
    const n = Number(p.age);
    if (!Number.isInteger(n) || n < 0 || n > 120) {
      errs.age = "Enter a whole number between 0 and 120.";
    }
  }
  if (p.annual_income !== "" && p.annual_income != null) {
    const n = Number(p.annual_income);
    if (Number.isNaN(n) || n < 0) {
      errs.annual_income = "Enter a valid, non-negative amount.";
    }
  }
  if (p.family_members !== "" && p.family_members != null) {
    const n = Number(p.family_members);
    if (!Number.isInteger(n) || n < 1 || n > 30) {
      errs.family_members = "Enter a whole number between 1 and 30.";
    }
  }
  return errs;
}

// Fields the eligibility check can't meaningfully run without — almost every
// scheme filters by age, and many by state, so submitting blank here doesn't
// warn the person, it just silently returns nothing useful. The chat box
// doesn't use these — it works fine with zero profile info.
function requiredErrors(p) {
  const errs = {};
  if (p.age === "" || p.age == null) errs.age = "Age is required — most schemes filter by age.";
  if (!p.state) errs.state = "State is required — many schemes are state-specific.";
  return errs;
}

export default function WelfareCopilot() {
  const [profile, setProfile] = useState(emptyProfile);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [states, setStates] = useState(FALLBACK_STATES.map((name) => ({ name })));

  useEffect(() => {
    listStates()
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length) setStates(res.data);
      })
      .catch(() => {
        // Fine to stay on the fallback list — the eligibility check still
        // works, it just has fewer states to choose from.
      });
  }, []);
  // Format errors (garbled/out-of-range values) are flagged live from the
  // first keystroke — that's never okay regardless of whether the person has
  // tried to submit yet. Required-field nagging ("Age is required") only
  // kicks in after a first submit/send attempt, so a pristine empty form
  // doesn't greet the person with red boxes before they've done anything.
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [chatLog, setChatLog] = useState([
    { role: "assistant", text: "Hi! I'm your Welfare Copilot. Fill in your details, or just ask me a question below — e.g. 'What documents do I need for PM-KISAN?'" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const set = (key, value) => {
    const next = { ...profile, [key]: value };
    setProfile(next);
    setErrors(attemptedSubmit ? { ...formatErrors(next), ...requiredErrors(next) } : formatErrors(next));
  };

  // The form keeps age/annual_income as strings (including "" before the user
  // types anything) so the <input> stays controlled. The backend's
  // CitizenProfile expects a real int/float or null — sending "" there fails
  // validation with a 422. Both submit() and the chat box (which sends the
  // profile so far for context) must go through this before hitting the API.
  const buildProfilePayload = () => ({
    ...profile,
    age: profile.age !== "" && profile.age != null ? Number(profile.age) : null,
    annual_income:
      profile.annual_income !== "" && profile.annual_income != null
        ? Number(profile.annual_income)
        : null,
    family_members:
      profile.family_members !== "" && profile.family_members != null
        ? Number(profile.family_members)
        : null,
    gender: profile.gender || null,
    occupation: profile.occupation || null,
    state: profile.state || null,
    category: profile.category || null,
    marital_status: profile.marital_status || null,
    residence_type: profile.residence_type || null,
    education_level: profile.education_level || null,
  });

  const submit = async (e) => {
    e.preventDefault();
    setAttemptedSubmit(true);
    const errs = { ...formatErrors(profile), ...requiredErrors(profile) };
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const res = await checkEligibility(buildProfilePayload());
      setResults(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    // The chat doesn't require a profile at all — but if something in it is
    // actively malformed (not just blank), don't ship it silently; flag it
    // the same way the eligibility form does and let the person fix it.
    const errs = formatErrors(profile);
    if (Object.keys(errs).length) {
      setAttemptedSubmit(true);
      setErrors(errs);
      return;
    }
    const msg = chatInput.trim();
    setChatLog((log) => [...log, { role: "user", text: msg }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await welfareChat(msg, buildProfilePayload());
      setChatLog((log) => [...log, { role: "assistant", text: res.data.answer }]);
    } catch {
      setChatLog((log) => [...log, { role: "assistant", text: "Sorry, I couldn't reach the server just now." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const fieldClass = (name) =>
    `mt-1 w-full border rounded px-2 py-1.5 bg-transparent ${
      errors[name] ? "border-brick ring-1 ring-brick bg-brick/5" : "border-ink/30"
    }`;

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
      <p className="text-ink/70 max-w-2xl mb-3">
       Fill in what you're comfortable with — we'll match you to the right government schemes, and only an anonymous count is kept for state-level scheme-adoption tracking.
      </p>
      <Link
        to="/register?role=government"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 hover:underline mb-8"
      >
        <ShieldCheck size={13} /> Work for the government? Register for the official console here →
      </Link>

      <div className="grid lg:grid-cols-5 gap-8">
        <form onSubmit={submit} className="lg:col-span-2 ledger-card rounded-md p-6 space-y-4 h-fit">
          <p className="eyebrow">Your profile</p>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Age <span className="text-brick">*</span>
              <input
                type="number" min="0" max="120" value={profile.age}
                onChange={(e) => set("age", e.target.value)}
                aria-invalid={Boolean(errors.age)}
                className={fieldClass("age")}
              />
              {errors.age && <p className="text-xs text-brick mt-1">{errors.age}</p>}
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
              aria-invalid={Boolean(errors.annual_income)}
              className={fieldClass("annual_income")}
            />
            {errors.annual_income && <p className="text-xs text-brick mt-1">{errors.annual_income}</p>}
          </label>

          <label className="text-sm block">
            State <span className="text-brick">*</span>
            <select
              value={profile.state} onChange={(e) => set("state", e.target.value)}
              aria-invalid={Boolean(errors.state)}
              className={fieldClass("state")}
            >
              <option value="">Select…</option>
              {states.map((s) => (
                <option key={s.code || s.name} value={s.name}>{s.name}</option>
              ))}
            </select>
            {errors.state && <p className="text-xs text-brick mt-1">{errors.state}</p>}
          </label>

          <p className="eyebrow pt-2">A bit more about you</p>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Category
              <select
                value={profile.category} onChange={(e) => set("category", e.target.value)}
                className="mt-1 w-full border border-ink/30 rounded px-2 py-1.5 bg-transparent"
              >
                <option value="">Prefer not to say</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-sm">
              Marital status
              <select
                value={profile.marital_status} onChange={(e) => set("marital_status", e.target.value)}
                className="mt-1 w-full border border-ink/30 rounded px-2 py-1.5 bg-transparent"
              >
                <option value="">Prefer not to say</option>
                {MARITAL_STATUSES.map((m) => <option key={m} value={m.toLowerCase()}>{m}</option>)}
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
                <option value="">Prefer not to say</option>
                <option value="urban">Urban</option>
                <option value="rural">Rural</option>
              </select>
            </label>
            <label className="text-sm">
              Family members
              <input
                type="number" min="1" max="30" value={profile.family_members}
                onChange={(e) => set("family_members", e.target.value)}
                placeholder="e.g. 4"
                aria-invalid={Boolean(errors.family_members)}
                className={fieldClass("family_members")}
              />
              {errors.family_members && <p className="text-xs text-brick mt-1">{errors.family_members}</p>}
            </label>
          </div>

          <label className="text-sm block">
            Highest education level
            <select
              value={profile.education_level} onChange={(e) => set("education_level", e.target.value)}
              className="mt-1 w-full border border-ink/30 rounded px-2 py-1.5 bg-transparent"
            >
              <option value="">Prefer not to say</option>
              {EDUCATION_LEVELS.map((e2) => <option key={e2} value={e2}>{e2}</option>)}
            </select>
          </label>

          <div>
            <TriToggle label="Own agricultural land?" value={profile.owns_land} onChange={(v) => set("owns_land", v)} />
            <TriToggle label="Own a pucca (permanent) house?" value={profile.owns_pucca_house} onChange={(v) => set("owns_pucca_house", v)} />
            <TriToggle label="Girl child under 10 in family?" value={profile.has_girl_child_under_10} onChange={(v) => set("has_girl_child_under_10", v)} />
            <TriToggle label="BPL / SECC listed household?" value={profile.bpl_or_seci_listed} onChange={(v) => set("bpl_or_seci_listed", v)} />
            <TriToggle label="Certified disability (80%+)?" value={profile.has_disability} onChange={(v) => set("has_disability", v)} />
            <TriToggle label="Currently studying?" value={profile.currently_studying} onChange={(v) => set("currently_studying", v)} />
            <TriToggle label="Pregnant or lactating?" value={profile.is_pregnant_or_lactating} onChange={(v) => set("is_pregnant_or_lactating", v)} />
            <TriToggle label="Have a bank account?" value={profile.has_bank_account} onChange={(v) => set("has_bank_account", v)} />
          </div>

          {Object.keys(errors).length > 0 && (
            <p className="text-xs text-brick bg-brick/10 border border-brick/30 rounded px-3 py-2">
              Please fix the highlighted field{Object.keys(errors).length > 1 ? "s" : ""} above.
            </p>
          )}

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
        </div>
      </div>
    </div>
  );
}
