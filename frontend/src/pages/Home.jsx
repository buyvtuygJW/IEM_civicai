import { Link } from "react-router-dom";
import { HandCoins, MapPinned, LayoutDashboard, Mic, ArrowRight } from "lucide-react";
import ChakraIcon from "../components/ChakraIcon";

const modules = [
  {
    icon: HandCoins,
    title: "Welfare Copilot",
    desc: "Tell us about yourself and we'll match you against government welfare schemes — with a document checklist and application guidance for each one.",
    to: "/welfare",
    cta: "Check my eligibility",
    from: "from-orange-400", toColor: "to-amber-500", ring: "hover:shadow-orange-200",
  },
  {
    icon: MapPinned,
    title: "CivicWatch",
    desc: "Report a civic problem — a broken street light, a pothole, an overflowing drain. AI classifies it, assigns the right authority, and tracks it to resolution.",
    to: "/civicwatch",
    cta: "Report a problem",
    from: "from-indigo-500", toColor: "to-blue-500", ring: "hover:shadow-indigo-200",
  },
  {
    icon: LayoutDashboard,
    title: "Government Console",
    desc: "Real-time complaint hotspots, resolution times, pending cases, and scheme adoption — plus the tools to mark cases in progress and resolved.",
    to: "/dashboard",
    cta: "Government sign in",
    from: "from-green-500", toColor: "to-emerald-600", ring: "hover:shadow-green-200",
    badge: "Government accounts only",
    secondaryTo: "/register?role=government",
    secondaryLabel: "New official? Register here →",
  },
];

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-14">
      <div className="grid lg:grid-cols-5 gap-10 items-center mb-14">
        <div className="lg:col-span-3">
          <p className="eyebrow mb-4">Digital Public Services</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-ink leading-[1.1] mb-5">
            One front door to{" "}
            <span className="bg-gradient-to-r from-orange-500 via-indigo-600 to-green-600 bg-clip-text text-transparent">
              government services
            </span>{" "}
            and local governance.
          </h2>
          <p className="text-ink/70 leading-relaxed mb-8 max-w-xl">
            Two problems, one system: citizens don't always know what they're owed, and
            complaints can disappear into silence. IndiCivicAI fixes both — find out what you're
            eligible for, and make sure what you report actually gets fixed.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/welfare" className="btn-primary px-6 py-3">
              Check my eligibility <ArrowRight size={16} className="ml-1.5" />
            </Link>
            <Link to="/civicwatch" className="btn-secondary px-6 py-3">
              Report a problem
            </Link>
          </div>
        </div>

        <div className="lg:col-span-2 flex justify-center">
          <ChakraIcon size={260} id="chakraHero" spin className="opacity-90 drop-shadow-xl" />
        </div>
      </div>

      <div className="flex items-center gap-3 ledger-card rounded-md p-4 max-w-2xl mb-12">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center shrink-0">
          <Mic className="text-white" size={16} />
        </div>
        <p className="text-sm text-ink/80">
          <span className="font-semibold">No typing required.</span> Say something like{" "}
          <span className="italic">"Mere area mein street light kharab hai"</span> and CivicWatch
          turns it into a structured, routed complaint automatically.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {modules.map(({ icon: Icon, title, desc, to, cta, from, toColor, ring, badge, secondaryTo, secondaryLabel }) => (
          <div
            key={title}
            className={`ledger-card rounded-md p-6 flex flex-col hover:-translate-y-1 transition-transform ${ring}`}
          >
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${from} ${toColor} flex items-center justify-center mb-4 shadow-lg`}>
              <Icon className="text-white" size={22} strokeWidth={1.8} />
            </div>
            <h3 className="font-display text-xl font-semibold text-ink mb-2">{title}</h3>
            <p className="text-sm text-ink/70 leading-relaxed flex-1">{desc}</p>
            {badge && (
              <span className="mt-3 inline-block w-fit text-[0.65rem] font-semibold uppercase tracking-wide text-green-700 bg-green-100 px-2 py-1 rounded-full">
                {badge}
              </span>
            )}
            <Link to={to} className="mt-4 text-sm font-semibold text-ink flex items-center gap-1 hover:text-indigo-600">
              {cta} <ArrowRight size={14} />
            </Link>
            {secondaryTo && (
              <Link to={secondaryTo} className="mt-1.5 text-xs font-medium text-green-700 hover:underline w-fit">
                {secondaryLabel}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
