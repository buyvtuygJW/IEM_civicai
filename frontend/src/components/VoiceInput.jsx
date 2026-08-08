import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Loader2, AlertTriangle } from "lucide-react";

const LANGUAGES = [
  { code: "en-IN", label: "English" },
  { code: "hi-IN", label: "हिंदी (Hindi)" },
  { code: "bn-IN", label: "বাংলা (Bengali)" },
  { code: "ta-IN", label: "தமிழ் (Tamil)" },
  { code: "te-IN", label: "తెలుగు (Telugu)" },
  { code: "mr-IN", label: "मराठी (Marathi)" },
  { code: "gu-IN", label: "ગુજરાતી (Gujarati)" },
  { code: "kn-IN", label: "ಕನ್ನಡ (Kannada)" },
  { code: "ml-IN", label: "മലയാളം (Malayalam)" },
  { code: "pa-IN", label: "ਪੰਜਾਬੀ (Punjabi)" },
];

// Friendly explanations for the error codes the Web Speech API can raise.
// See: https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognitionErrorEvent/error
const ERROR_MESSAGES = {
  "not-allowed": "Microphone access is blocked. Click the padlock/camera icon in your address bar, allow the microphone for this site, then try again.",
  "permission-denied": "Microphone access is blocked. Click the padlock/camera icon in your address bar, allow the microphone for this site, then try again.",
  "service-not-allowed": "Your browser blocked speech recognition. Try Chrome or Edge, and make sure you're on http://localhost (not a plain IP address).",
  "audio-capture": "No microphone was found. Check that one is connected and not already in use by another app.",
  "network": "Speech recognition needs an active internet connection to transcribe your voice (this runs through your browser, not this app's server). Check your connection and try again.",
  "no-speech": "Didn't catch anything. Try again and speak right after the mic turns red.",
  "aborted": null, // user-initiated stop, not a real error
};

export default function VoiceInput({ onResult, disabled }) {
  const [listening, setListening] = useState(false);
  const [lang, setLang] = useState("hi-IN");
  const [transcript, setTranscript] = useState("");
  const [processing, setProcessing] = useState(false);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const transcriptRef = useRef(""); // avoids stale-closure issues inside onend
  const langRef = useRef(lang);
  const submittingRef = useRef(false); // guards against double-submit (onerror + onend both firing)

  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }
    if (!window.isSecureContext) {
      // Mic access is blocked entirely outside secure contexts (https or localhost).
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      transcriptRef.current = text;
      setTranscript(text);
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") {
        // onend will fire right after this and handle cleanup/submission.
        if (event.error === "no-speech") setError(ERROR_MESSAGES["no-speech"]);
        return;
      }
      setError(ERROR_MESSAGES[event.error] || `Speech recognition error: ${event.error}. Try again, or type your complaint below.`);
      submittingRef.current = true; // prevent onend from also trying to submit a partial result
      setListening(false);
    };

    // onend fires BOTH when the browser auto-stops after you finish speaking
    // AND when you manually click the mic to stop — this is the single place
    // that submits whatever was captured, so neither path gets silently dropped.
    recognition.onend = async () => {
      setListening(false);
      const finalText = transcriptRef.current.trim();
      if (finalText && !submittingRef.current) {
        submittingRef.current = true;
        setProcessing(true);
        try {
          await onResult(finalText, langRef.current.split("-")[0]);
          setTranscript("");
          transcriptRef.current = "";
        } catch {
          setError("Couldn't reach the server to process that. Check the complaint was submitted below, or try again.");
        } finally {
          setProcessing(false);
          submittingRef.current = false;
        }
      }
    };

    recognitionRef.current = recognition;
    return () => recognition.stop();
  }, [onResult]);

  const start = () => {
    if (!recognitionRef.current || listening) return;
    setError(null);
    setTranscript("");
    transcriptRef.current = "";
    submittingRef.current = false;
    recognitionRef.current.lang = lang;
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {
      // start() throws if called while already running (e.g. rapid double-click) — ignore.
    }
  };

  const stop = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop(); // triggers onend above, which handles submission
  };

  if (!supported) {
    return (
      <div className="text-sm text-slate2 font-mono border border-dashed border-slate2/50 rounded-md p-3">
        {window.isSecureContext === false
          ? "Voice input needs a secure connection (https:// or http://localhost). You're viewing this over a plain IP or non-secure address, so the browser blocks the microphone. Open the app via http://localhost:5173 instead, or type your complaint below."
          : "Voice input isn't supported in this browser. Try Chrome or Edge, or type your complaint below."}
      </div>
    );
  }

  return (
    <div className="ledger-card rounded-md p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="eyebrow">Speak your complaint</p>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          disabled={listening || disabled}
          className="text-xs font-mono border border-slate2/40 rounded px-2 py-1 bg-transparent"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={listening ? stop : start}
          disabled={disabled || processing}
          className={`flex items-center justify-center w-14 h-14 rounded-full border-2 border-ink text-ink shrink-0 transition-colors ${
            listening ? "bg-brick text-paper border-brick mic-listening" : "hover:bg-ink hover:text-paper"
          }`}
          aria-label={listening ? "Stop recording" : "Start recording"}
        >
          {processing ? (
            <Loader2 className="animate-spin" size={22} />
          ) : listening ? (
            <MicOff size={22} />
          ) : (
            <Mic size={22} />
          )}
        </button>
        <div className="flex-1 min-h-[3rem] text-sm italic text-ink/80">
          {processing
            ? "Understanding what you said…"
            : transcript
            ? `"${transcript}"`
            : listening
            ? "Listening… speak now."
            : `Try: "Mere area mein street light kharab hai, Sector 12 Rohini mein"`}
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 text-sm text-brick bg-brick/10 border border-brick/30 rounded p-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

