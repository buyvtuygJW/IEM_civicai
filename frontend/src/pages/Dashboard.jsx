import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";
import {
  LayoutDashboard, FileStack, Clock, CheckCircle2, AlertTriangle, Timer,
} from "lucide-react";
import { dashboardSummary } from "../api";
import { useAuth } from "../context/AuthContext";

const CATEGORY_COLORS = ["#4F46E5", "#FF9933", "#16A34A", "#E11D48", "#0EA5E9", "#D97706", "#8B5CF6", "#64748B"];
const GRID_STROKE = "#E4E7F5";
const PRIORITY_STYLE = {
  critical: { label: "Critical", color: "#E11D48", bg: "rgba(225,29,72,0.1)" },
  high: { label: "High", color: "#D97706", bg: "rgba(217,119,6,0.1)" },
  medium: { label: "Medium", color: "#2563EB", bg: "rgba(37,99,235,0.1)" },
  low: { label: "Low", color: "#16A34A", bg: "rgba(22,163,74,0.1)" },
};

function StatCard({ label, value, icon: Icon, from, to }) {
  return (
    <div className="ledger-card rounded-md p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${from} ${to} flex items-center justify-center shrink-0 shadow-md`}>
        <Icon className="text-white" size={20} />
      </div>
      <div>
        <p className="eyebrow mb-1">{label}</p>
        <p className="font-display text-2xl font-bold text-ink">{value}</p>
      </div>
    </div>
  );
}

function ChartFrame({ title, children }) {
  return (
    <div className="ledger-card rounded-md p-6">
      <p className="eyebrow mb-5">{title}</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CategoryLegend({ data, colors }) {
  return (
    <div className="flex flex-col justify-center gap-1.5 text-xs pl-2 h-64 w-32 shrink-0">
      {data.map((entry, i) => (
        <div key={entry.category} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: colors[i % colors.length] }} />
          <span className="text-ink/70 truncate">{entry.category}</span>
          <span className="text-ink/40 ml-auto">{entry.count}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    dashboardSummary().then((res) => setData(res.data));
    const interval = setInterval(() => {
      dashboardSummary().then((res) => setData(res.data));
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  if (!data) {
    return <div className="max-w-6xl mx-auto px-6 py-10 text-sm text-slate2">Loading dashboard…</div>;
  }

  const hotspotChartData = data.hotspots.map((h) => ({ name: `${h.area} · ${h.category}`, count: h.count }));
  const totalPriority = data.priority_breakdown.reduce((sum, p) => sum + p.count, 0) || 1;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shrink-0">
          <LayoutDashboard className="text-white" size={18} />
        </div>
        <p className="eyebrow">Government Console · Dashboard</p>
      </div>
      <h2 className="font-display text-3xl font-bold text-ink mb-2">
        Real-time civic operations overview
      </h2>
      <p className="text-ink/70 max-w-2xl mb-8">
        Signed in as <span className="font-semibold">{user?.name}</span>. Auto-refreshes every 15
        seconds.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total complaints" value={data.total_complaints} icon={FileStack} from="from-indigo-500" to="to-blue-500" />
        <StatCard label="Pending" value={data.pending_count} icon={Clock} from="from-amber-400" to="to-orange-500" />
        <StatCard label="Resolved" value={data.resolved_count} icon={CheckCircle2} from="from-green-500" to="to-emerald-600" />
        <StatCard label="Escalated" value={data.escalated_count} icon={AlertTriangle} from="from-rose-500" to="to-red-600" />
      </div>

      {/* Priority breakdown as a compact strip instead of another chart, to keep things uncluttered */}
      <div className="ledger-card rounded-md p-5 mb-6 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2 shrink-0">
          <Timer size={16} className="text-slate2" />
          <p className="eyebrow">
            Avg. resolution:{" "}
            <span className="text-ink normal-case font-semibold">
              {data.avg_resolution_hours != null ? `${data.avg_resolution_hours}h` : "—"}
            </span>
          </p>
        </div>
        <div className="flex-1 min-w-[200px] h-2.5 rounded-full overflow-hidden flex bg-slate-100">
          {data.priority_breakdown.map((p) => (
            <div
              key={p.priority}
              style={{ width: `${(p.count / totalPriority) * 100}%`, background: PRIORITY_STYLE[p.priority]?.color || "#94A3B8" }}
              title={`${p.priority}: ${p.count}`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          {data.priority_breakdown.map((p) => (
            <span
              key={p.priority}
              className="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5"
              style={{ color: PRIORITY_STYLE[p.priority]?.color, background: PRIORITY_STYLE[p.priority]?.bg }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: PRIORITY_STYLE[p.priority]?.color }} />
              {PRIORITY_STYLE[p.priority]?.label || p.priority} · {p.count}
            </span>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <ChartFrame title="Top complaint hotspots">
          <BarChart data={hotspotChartData} layout="vertical" margin={{ left: 10, right: 16 }}>
            <defs>
              <linearGradient id="hotspotGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#4F46E5" />
                <stop offset="100%" stopColor="#818CF8" />
              </linearGradient>
            </defs>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: "rgba(79,70,229,0.06)" }} />
            <Bar dataKey="count" fill="url(#hotspotGradient)" radius={[0, 8, 8, 0]} barSize={18} />
          </BarChart>
        </ChartFrame>

        <div className="ledger-card rounded-md p-6">
          <p className="eyebrow mb-5">Complaint category distribution</p>
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie
                  data={data.category_distribution}
                  dataKey="count"
                  nameKey="category"
                  cx="50%" cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  stroke="none"
                >
                  {data.category_distribution.map((entry, i) => (
                    <Cell key={entry.category} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <text x="50%" y="47%" textAnchor="middle" className="fill-ink font-display font-bold" style={{ fontSize: 22 }}>
                  {data.total_complaints}
                </text>
                <text x="50%" y="58%" textAnchor="middle" className="fill-slate-400" style={{ fontSize: 10, letterSpacing: 1 }}>
                  TOTAL
                </text>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <CategoryLegend data={data.category_distribution} colors={CATEGORY_COLORS} />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ChartFrame title="Resolution time trend (avg hours/day)">
          <AreaChart data={data.resolution_trend}>
            <defs>
              <linearGradient id="resolutionGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E11D48" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#E11D48" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip />
            <Area type="monotone" dataKey="avg_hours" stroke="#E11D48" strokeWidth={2.5} fill="url(#resolutionGradient)" />
          </AreaChart>
        </ChartFrame>

        <ChartFrame title="New complaints per day">
          <AreaChart data={data.volume_trend}>
            <defs>
              <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip />
            <Area type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2.5} fill="url(#volumeGradient)" />
          </AreaChart>
        </ChartFrame>
      </div>
    </div>
  );
}
