import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Loader2, CheckCircle2, LocateFixed, LogIn, MapPinned } from "lucide-react";
import VoiceInput from "../components/VoiceInput";
import Stamp from "../components/Stamp";
import { createComplaint, myComplaints } from "../api";
import { useAuth } from "../context/AuthContext";

const CATEGORY_LABELS = {
  streetlight: "Street light", water_supply: "Water supply", drainage: "Drainage",
  garbage: "Garbage", road_pothole: "Road / pothole", electricity: "Electricity",
  illegal_construction: "Illegal construction", stray_animals: "Stray animals",
  noise_pollution: "Noise pollution", traffic: "Traffic", general: "General",
};

export default function CivicWatch() {
  const { user } = useAuth();
  const [description, setDescription] = useState("");
  const [area, setArea] = useState("");
  const [coords, setCoords] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle"); // idle | requesting | granted | denied | unsupported
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [myList, setMyList] = useState([]);
  const [loadingMine, setLoadingMine] = useState(false);

  // Auto-request the browser's location as soon as this page loads, instead
  // of waiting for the user to remember to click a button — this is the main
  // fix for complaints showing "Unspecified" after using voice input, since
  // people speaking their complaint were never clicking "use my location" first.
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("unsupported");
      return;
    }
    setLocationStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus("granted");
      },
      () => setLocationStatus("denied"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  const refreshMine = async () => {
    if (!user) return;
    setLoadingMine(true);
    try {
      const res = await myComplaints();
      setMyList(res.data);
    } finally {
      setLoadingMine(false);
    }
  };

  useEffect(() => {
    refreshMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const submitComplaint = async (payload) => {
    setSubmitting(true);
    setLastResult(null);
    try {
      const res = await createComplaint({
        ...payload,
        area: area || payload.area,
        latitude: coords?.lat,
        longitude: coords?.lng,
      });
      setLastResult(res.data);
      setDescription("");
      await refreshMine();
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoiceResult = async (transcript, lang) => {
    await submitComplaint({ transcript, language: lang });
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;
    await submitComplaint({ description, language: "en" });
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center shadow-lg shrink-0">
          <MapPinned className="text-white" size={18} />
        </div>
        <p className="eyebrow">CivicWatch</p>
      </div>
      <h2 className="font-display text-3xl font-bold text-ink mb-2">
        Report a problem. Track it. Make sure it gets resolved.
      </h2>
      <p className="text-ink/70 max-w-2xl mb-6">Speak or type your complaint, HindCivicAi classifies it and routes it to the responsible authority. you can always check progress here. </p>

      <div className="flex items-center gap-2 text-xs font-mono mb-6">
        <LocateFixed size={14} className={locationStatus === "granted" ? "text-forest" : "text-slate2"} />
        {locationStatus === "requesting" && <span className="text-slate2">Detecting your location…</span>}
        {locationStatus === "granted" && <span className="text-forest">Location detected — it'll be attached automatically.</span>}
        {locationStatus === "denied" && (
          <span className="text-gold">Location access denied — please type your area below so we can still route this correctly.</span>
        )}
        {locationStatus === "unsupported" && (
          <span className="text-slate2">Location isn't available in this browser — please type your area below.</span>
        )}
      </div>

      <div className="grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2 space-y-5">
          <VoiceInput onResult={handleVoiceResult} disabled={submitting} />

          <div className="ledger-card rounded-md p-5">
            <p className="eyebrow mb-3">Or type it out</p>
            <form onSubmit={handleTextSubmit} className="space-y-3">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. There's a large pothole outside the market causing accidents."
                rows={4}
                className="w-full border border-ink/30 rounded px-3 py-2 text-sm bg-transparent"
              />
              <input
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="Area / locality (optional — auto-filled if you share location)"
                className="w-full border border-ink/30 rounded px-3 py-2 text-sm bg-transparent"
              />
              <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5 rounded flex items-center justify-center gap-2">
                {submitting ? <Loader2 className="animate-spin" size={16} /> : null}
                {submitting ? "Classifying…" : "Submit complaint"}
              </button>
            </form>
          </div>

          {lastResult && (
            <div className="ledger-card rounded-md p-5 border-forest/50">
              <p className="eyebrow mb-2 flex items-center gap-1 text-forest">
                <CheckCircle2 size={14} /> Filed as {lastResult.id}
              </p>
              <p className="text-sm text-ink">{lastResult.description}</p>
              <p className="text-xs text-ink/60 font-mono mt-2">
                Routed to {lastResult.department} · {lastResult.priority} priority · {lastResult.area}
              </p>
            </div>
          )}
        </div>

        <div className="lg:col-span-3">
          <p className="eyebrow mb-3">Your complaints</p>
          {!user ? (
            <div className="ledger-card rounded-md p-6 text-sm text-ink/70 flex items-start gap-3">
              <LogIn size={18} className="text-gold shrink-0 mt-0.5" />
              <span>
                You can file a complaint as a guest, but{" "}
                <Link to="/login" className="text-gold underline">log in</Link> or{" "}
                <Link to="/register" className="text-gold underline">create an account</Link>{" "}
                to see all your past complaints and their status in one place.
              </span>
            </div>
          ) : loadingMine ? (
            <p className="text-sm text-slate2 font-mono">Loading…</p>
          ) : myList.length === 0 ? (
            <p className="text-sm text-ink/60 ledger-card rounded-md p-6">
              You haven't filed any complaints yet — submit one on the left and it'll show up here.
            </p>
          ) : (
            <div className="space-y-3 max-h-[36rem] overflow-y-auto pr-1">
              {myList.map((c) => (
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
