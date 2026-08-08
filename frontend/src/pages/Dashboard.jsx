import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import { LayoutDashboard } from "lucide-react";
import { dashboardSummary } from "../api";
import { useAuth } from "../context/AuthContext";

const PIE_COLORS = ["#4F46E5", "#FF9933", "#16A34A", "#E11D48", "#0EA5E9", "#D97706", "#8B5CF6", "#64748B"];
const GRID_STROKE = "#E4E7F5";

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

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard label="Total complaints" value={data.total_complaints} />
        <StatCard label="Pending" value={data.pending_count} accent="text-gold" />
        <StatCard label="Resolved" value={data.resolved_count} accent="text-forest" />
        <StatCard label="Escalated" value={data.escalated_count} accent="text-brick" />
        <StatCard
          label="Avg. resolution"
          value={data.avg_resolution_hours != null ? `${data.avg_resolution_hours}h` : "—"}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <ChartFrame title="Top complaint hotspots (area × category)">
          <BarChart data={hotspotChartData} layout="vertical" margin={{ left: 10, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#4F46E5" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ChartFrame>

        <ChartFrame title="Complaint category distribution">
          <PieChart>
            <Pie
              data={data.category_distribution}
              dataKey="count"
              nameKey="category"
              cx="50%" cy="50%"
              outerRadius={85}
              label={({ category }) => category}
              labelLine={false}
            >
              {data.category_distribution.map((entry, i) => (
                <Cell key={entry.category} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ChartFrame>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <ChartFrame title="Resolution time trend (avg hours/day)">
          <LineChart data={data.resolution_trend}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="avg_hours" stroke="#E11D48" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ChartFrame>

        <ChartFrame title="New complaints per day">
          <LineChart data={data.volume_trend}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ChartFrame>
      </div>

      <ChartFrame title="Welfare scheme interest (from Welfare Copilot checks)">
        <BarChart data={data.scheme_adoption} margin={{ left: 10, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="scheme" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={70} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="interested_citizens" fill="#FF9933" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ChartFrame>
    </div>
  );
}
