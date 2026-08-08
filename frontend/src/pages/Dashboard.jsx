import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import { LayoutDashboard } from "lucide-react";
import { dashboardSummary } from "../api";
import { useAuth } from "../context/AuthContext";

// Fixed categorical order — colors are assigned by position, never re-cycled,
// so a category keeps its color across refreshes even as counts change.
const PIE_COLORS = ["#4F46E5", "#FF9933", "#16A34A", "#0EA5E9", "#8B5CF6", "#D97706", "#0D9488", "#64748B"];
const GRID_STROKE = "#EEF0FA";

// Status palette — reserved for priority/state, never reused for series identity.
const PRIORITY_ORDER = ["critical", "high", "medium", "low"];
const PRIORITY_COLORS = { critical: "#E11D48", high: "#F97316", medium: "#D97706", low: "#16A34A" };

function StatCard({ label, value, accent }) {
  return (
    <div className="ledger-card rounded-md p-5">
      <p className="eyebrow mb-2">{label}</p>
      <p className={`font-display text-3xl font-bold ${accent || "text-ink"}`}>{value}</p>
    </div>
  );
}

function ChartFrame({ title, children }) {
  return (
    <div className="ledger-card rounded-md p-5">
      <p className="eyebrow mb-4">{title}</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function PriorityMix({ data }) {
  const sorted = PRIORITY_ORDER.map((p) => data.find((d) => d.priority === p)).filter(Boolean);
  const total = sorted.reduce((sum, d) => sum + d.count, 0) || 1;

  return (
    <div className="ledger-card rounded-md p-5">
      <p className="eyebrow mb-4">Priority mix</p>
      <div className="flex h-3 rounded-full overflow-hidden bg-slate-100 mb-3">
        {sorted.map((d, i) => (
          <div
            key={d.priority}
            title={`${d.priority}: ${d.count} (${Math.round((d.count / total) * 100)}%)`}
            style={{
              width: `${(d.count / total) * 100}%`,
              backgroundColor: PRIORITY_COLORS[d.priority],
              borderRight: i < sorted.length - 1 ? "2px solid white" : "none",
            }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {sorted.map((d) => (
          <div key={d.priority} className="flex items-center gap-1.5 text-xs">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PRIORITY_COLORS[d.priority] }} />
            <span className="capitalize font-medium text-ink/80">{d.priority}</span>
            <span className="text-slate2">{d.count}</span>
          </div>
        ))}
      </div>
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

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shrink-0">
          <LayoutDashboard className="text-white" size={18} />
        </div>
        <p className="eyebrow">Government Console · Authority Dashboard</p>
      </div>
      <h2 className="font-display text-3xl font-bold text-ink mb-2">
        Real-time civic operations overview
      </h2>
      <p className="text-ink/70 max-w-2xl mb-8">
        Signed in as <span className="font-semibold">{user?.name}</span>. Auto-refreshes every 15
        seconds. Escalated cases have breached their SLA and need immediate attention.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard label="Total complaints" value={data.total_complaints} />
        <StatCard label="Pending" value={data.pending_count} accent="text-gold" />
        <StatCard label="Resolved" value={data.resolved_count} accent="text-forest" />
        <StatCard label="Escalated" value={data.escalated_count} accent="text-brick" />
        <StatCard
          label="Avg. resolution"
          value={data.avg_resolution_hours != null ? `${data.avg_resolution_hours}h` : "—"}
        />
      </div>

      <div className="mb-6">
        <PriorityMix data={data.priority_breakdown} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <ChartFrame title="Top complaint hotspots (area × category)">
          <BarChart data={hotspotChartData} layout="vertical" margin={{ left: 10, right: 16 }}>
            <defs>
              <linearGradient id="hotspotGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#A5B4FC" />
              </linearGradient>
            </defs>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: "rgba(79,70,229,0.06)" }} />
            <Bar dataKey="count" fill="url(#hotspotGradient)" radius={[0, 8, 8, 0]} barSize={16} />
          </BarChart>
        </ChartFrame>

        <ChartFrame title="Complaint category distribution">
          <PieChart>
            <Pie
              data={data.category_distribution}
              dataKey="count"
              nameKey="category"
              cx="50%" cy="50%"
              innerRadius={48}
              outerRadius={82}
              paddingAngle={2}
              cornerRadius={4}
            >
              {data.category_distribution.map((entry, i) => (
                <Cell key={entry.category} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="white" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
          </PieChart>
        </ChartFrame>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <ChartFrame title="Resolution time trend (avg hours/day)">
          <LineChart data={data.resolution_trend} margin={{ left: 0, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip />
            <Line type="monotone" dataKey="avg_hours" stroke="#E11D48" strokeWidth={2.5} strokeLinecap="round" dot={false} />
          </LineChart>
        </ChartFrame>

        <ChartFrame title="New complaints per day">
          <LineChart data={data.volume_trend} margin={{ left: 0, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2.5} strokeLinecap="round" dot={false} />
          </LineChart>
        </ChartFrame>
      </div>
    </div>
  );
}
