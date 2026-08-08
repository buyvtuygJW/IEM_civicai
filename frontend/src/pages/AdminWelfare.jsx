import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { HandCoins, Users, MapPin } from "lucide-react";
import { welfareAdminOverview } from "../api";

const GRID_STROKE = "#E4E7F5";

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
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function AdminWelfare() {
  const [data, setData] = useState(null);

  useEffect(() => {
    welfareAdminOverview().then((res) => setData(res.data));
  }, []);

  if (!data) {
    return <div className="max-w-6xl mx-auto px-6 py-10 text-sm text-slate2">Loading welfare overview…</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg shrink-0">
          <HandCoins className="text-white" size={18} />
        </div>
        <p className="eyebrow">Government Console · Welfare</p>
      </div>
      <h2 className="font-display text-3xl font-bold text-ink mb-2">
        Welfare scheme analytics
      </h2>
      <p className="text-ink/70 max-w-2xl mb-8">
        Which schemes citizens are checking eligibility for, where they're coming from, and the
        full scheme catalog for reference.
      </p>

      <div className="grid grid-cols-2 gap-4 mb-6 max-w-md">
        <StatCard label="Eligibility checks run" value={data.total_eligibility_checks} icon={Users} from="from-orange-400" to="to-amber-500" />
        <StatCard label="States represented" value={data.state_breakdown.length} icon={MapPin} from="from-indigo-500" to="to-blue-500" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <ChartFrame title="Most in-demand schemes">
          <BarChart data={data.scheme_adoption} layout="vertical" margin={{ left: 10, right: 16 }}>
            <defs>
              <linearGradient id="schemeGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#FF9933" />
                <stop offset="100%" stopColor="#FFC078" />
              </linearGradient>
            </defs>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="scheme" width={190} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: "rgba(255,153,51,0.08)" }} />
            <Bar dataKey="interested_citizens" fill="url(#schemeGradient)" radius={[0, 8, 8, 0]} barSize={16} />
          </BarChart>
        </ChartFrame>

        <ChartFrame title="Eligibility checks by state">
          <BarChart data={data.state_breakdown} margin={{ left: 0, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="state" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={60} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#16A34A" radius={[6, 6, 0, 0]} barSize={22} />
          </BarChart>
        </ChartFrame>
      </div>

      <div>
        <p className="eyebrow mb-4">Scheme catalog ({data.schemes.length})</p>
        <div className="grid md:grid-cols-2 gap-4">
          {data.schemes.map((s) => (
            <div key={s.id} className="ledger-card rounded-md p-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-slate2 mb-1">{s.category}</p>
                <p className="text-sm font-semibold text-ink">{s.name}</p>
                <p className="text-xs text-ink/60 mt-1">{s.benefit}</p>
              </div>
              <span className="text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-1 rounded-full shrink-0">
                {s.interested_citizens} interested
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
