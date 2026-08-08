import { useEffect, useMemo, useState } from "react";
import { MapPin, Loader2, ClipboardList } from "lucide-react";
import Stamp from "../components/Stamp";
import { listComplaints, updateComplaintStatus } from "../api";
import { useAuth } from "../context/AuthContext";

const CATEGORY_LABELS = {
  streetlight: "Street light", water_supply: "Water supply", drainage: "Drainage",
  garbage: "Garbage", road_pothole: "Road / pothole", electricity: "Electricity",
  illegal_construction: "Illegal construction", stray_animals: "Stray animals",
  noise_pollution: "Noise pollution", traffic: "Traffic", general: "General",
};

const STATUS_FILTERS = ["all", "submitted", "in_progress", "resolved", "escalated"];

export default function AdminComplaints() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listComplaints();
      setComplaints(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Couldn't load complaints.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return complaints;
    return complaints.filter((c) => c.status === statusFilter);
  }, [complaints, statusFilter]);

  const advance = async (id, status) => {
    setUpdatingId(id);
    try {
      await updateComplaintStatus(id, status, `Marked ${status} by ${user.name} (${user.department || "Government"}).`);
      await refresh();
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shrink-0">
          <ClipboardList className="text-white" size={18} />
        </div>
        <p className="eyebrow">Government Console · Complaint Management</p>
      </div>
      <h2 className="font-display text-3xl font-bold text-ink mb-2">
        All reported complaints
      </h2>
      <p className="text-ink/70 max-w-2xl mb-6">
        Signed in as <span className="font-semibold">{user?.name}</span>
        {user?.department ? ` · ${user.department}` : ""}. Only government accounts can update
        complaint status.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wide border ${
              statusFilter === s ? "bg-ink text-paper border-ink" : "border-ink/30 text-ink/60 hover:border-ink"
            }`}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-brick mb-4">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate2 font-mono">Loading…</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((c) => {
            const nextStatus = { submitted: "in_progress", in_progress: "resolved" }[c.status];
            return (
              <div key={c.id} className="ledger-card rounded-md p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs text-slate2">{c.id}</p>
                    <p className="text-sm text-ink mt-1">{c.description}</p>
                  </div>
                  <Stamp status={c.status} />
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-ink/60 font-mono">
                  <span>{CATEGORY_LABELS[c.category] || c.category}</span>
                  <span>·</span>
                  <span>{c.department}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><MapPin size={12} /> {c.area}</span>
                  <span>·</span>
                  <span className="uppercase">{c.priority} priority</span>
                </div>
                {nextStatus && (
                  <button
                    onClick={() => advance(c.id, nextStatus)}
                    disabled={updatingId === c.id}
                    className="btn-secondary self-start mt-1 px-3 py-1.5 rounded text-xs flex items-center gap-2"
                  >
                    {updatingId === c.id && <Loader2 className="animate-spin" size={12} />}
                    Mark as {nextStatus.replace("_", " ")}
                  </button>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-sm text-ink/60 col-span-2">No complaints match this filter.</p>
          )}
        </div>
      )}
    </div>
  );
}
