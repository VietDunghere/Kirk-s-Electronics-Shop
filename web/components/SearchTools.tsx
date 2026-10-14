"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";
import { fileToSmallDataUrl, IMAGE_SEARCH_KEY } from "@/lib/clientImage";

// The browser's speech recognition (Chrome / Edge). Not in the standard TypeScript lib, so typed minimally here.
type Recognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type RecognitionCtor = new () => Recognition;

function getRecognition(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERRORS: Record<string, string> = {
  "not-allowed": "Microphone is blocked. Allow it in the browser address bar.",
  "service-not-allowed": "Microphone is blocked. Allow it in the browser address bar.",
  "no-speech": "I did not hear anything. Please try again.",
  "audio-capture": "No microphone found.",
  network: "Speech recognition needs an internet connection."
};

const RECORD_SECONDS = 7; // a search phrase is short
const LANGS = [
  { code: "vi-VN", label: "Tiếng Việt" },
  { code: "en-US", label: "English" }
];
const LANG_KEY = "voice_search_lang";

type Mode = "idle" | "listening" | "recording" | "transcribing" | "done";

/** Two small buttons next to the search box (voice, image) and the "listening" panel shown while the customer speaks. */
export default function SearchTools({ onVoiceText }: { onVoiceText: (text: string) => void }) {
  const { toast } = useToast();
  const router = useRouter();
  // listening = browser speech recognition, recording = our own recorder (AI fallback),
  // transcribing = waiting for the AI, done = text recognised, about to search
  const [mode, setMode] = useState<Mode>("idle");
  const [heard, setHeard] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(RECORD_SECONDS);
  const [lang, setLang] = useState("vi-VN"); // language of the browser speech recognition
  const rec = useRef<Recognition | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const session = useRef(0); // every voice search gets a number; a cancelled one is ignored when its callbacks fire

  useEffect(() => {
    try { const saved = localStorage.getItem(LANG_KEY); if (saved === "vi-VN" || saved === "en-US") setLang(saved); } catch { /* no storage: default */ }
  }, []);

  const reset = () => { setMode("idle"); setHeard(""); };

  const cancel = () => {
    session.current++;
    rec.current?.abort();
    if (recorder.current?.state === "recording") recorder.current.stop();
    reset();
  };

  useEffect(() => () => { session.current++; rec.current?.abort(); if (recorder.current?.state === "recording") recorder.current.stop(); }, []);

  // Esc closes the panel
  useEffect(() => {
    if (mode === "idle") return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") cancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // The text is known: show it for a moment, then search.
  const finish = (id: number, text: string) => {
    if (id !== session.current) return;
    setHeard(text);
    setMode("done");
    setTimeout(() => {
      if (id !== session.current) return;
      reset();
      onVoiceText(text);
    }, 700);
  };

  // Fallback: record the voice and let the AI service (Groq Whisper) turn it into text. Works in any browser.
  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast("This browser cannot record audio.", "error");
      reset();
      return;
    }
    const id = ++session.current;
    setHeard("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (id !== session.current) { stream.getTracks().forEach((tr) => tr.stop()); return; }
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((m) => MediaRecorder.isTypeSupported(m));
      const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      r.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        clearInterval(tick);
        if (id !== session.current) return; // cancelled
        setMode("transcribing");
        const type = r.mimeType || mime || "audio/webm";
        const form = new FormData();
        form.append("audio", new Blob(chunks, { type }), type.includes("mp4") ? "voice.mp4" : "voice.webm");
        try {
          const res = await fetch("/api/speech", { method: "POST", body: form });
          const d = await res.json();
          if (id !== session.current) return;
          if (!res.ok) { toast(d.error || "Voice search failed.", "error"); reset(); }
          else if (d.text) finish(id, d.text);
          else reset();
        } catch {
          if (id === session.current) { toast("Voice search failed.", "error"); reset(); }
        }
      };
      recorder.current = r;
      r.start();
      setMode("recording");
      setSecondsLeft(RECORD_SECONDS);
      const tick = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) { clearInterval(tick); if (r.state === "recording") r.stop(); return 0; }
          return s - 1;
        });
      }, 1000);
    } catch {
      if (id === session.current) { toast("Microphone is blocked. Allow it in the browser address bar.", "error"); reset(); }
    }
  };

  const startVoice = (language: string = lang) => {
    if (mode !== "idle" && language === lang) return;
    const Ctor = getRecognition();
    if (!Ctor) { startRecording(); return; } // Firefox / Safari: no built-in speech recognition
    const id = ++session.current;
    setHeard("");
    const r = new Ctor();
    r.lang = language; // Vietnamese by default; English product names (iPhone, laptop...) are usually recognised too
    r.interimResults = true; // live text while speaking, like Google
    r.maxAlternatives = 1;
    let switchToAI = false;
    let latest = "";
    let finished = false;
    r.onresult = (e) => {
      if (id !== session.current) return;
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      latest = text.trim();
      setHeard(latest);
      if (e.results[e.results.length - 1].isFinal && latest) { finished = true; finish(id, latest); }
    };
    r.onerror = (e) => {
      if (id !== session.current) return;
      if (e.error === "network" || e.error === "service-not-allowed") { switchToAI = true; return; } // the browser's service is unreachable
      if (e.error !== "aborted") { toast(ERRORS[e.error] ?? "Voice search failed.", "error"); reset(); }
    };
    r.onend = () => {
      if (id !== session.current) return;
      if (switchToAI) { toast("Browser speech recognition is unavailable, using the AI service instead."); startRecording(); return; }
      if (finished) return;
      if (latest) finish(id, latest); // stopped by the customer: use what was heard so far
      else reset();
    };
    rec.current = r;
    try { r.start(); setMode("listening"); } catch { reset(); }
  };

  // Switch the spoken language: restart the browser recognition in the other language
  const changeLang = (code: string) => {
    if (code === lang) return;
    setLang(code);
    try { localStorage.setItem(LANG_KEY, code); } catch { /* ignore */ }
    session.current++;
    rec.current?.abort();
    setMode("idle");
    setTimeout(() => startVoice(code), 150);
  };

  // "Stop" button: finish now and use what has been heard / recorded
  const stop = () => {
    if (mode === "listening") rec.current?.stop();
    else if (mode === "recording" && recorder.current?.state === "recording") recorder.current.stop();
  };

  const pickImage = async (f: File | undefined) => {
    if (!f) return;
    try {
      const dataUrl = await fileToSmallDataUrl(f);
      sessionStorage.setItem(IMAGE_SEARCH_KEY, dataUrl);
      router.push("/search-image");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not read the image.", "error");
    }
    if (file.current) file.current.value = "";
  };

  const active = mode === "listening" || mode === "recording";
  const btn = "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-[#0A3161] hover:bg-gray-50";
  const title =
    mode === "listening" ? "Listening..." :
    mode === "recording" ? "Recording..." :
    mode === "transcribing" ? "Understanding..." :
    mode === "done" ? "Searching for" : "";
  const hint =
    mode === "listening" ? "Speak now, for example: laptop gaming under 30 million" :
    mode === "recording" ? `Speak now · stops in ${secondsLeft}s` :
    mode === "transcribing" ? "One moment" : "";

  return (
    <div className="ml-2 flex gap-1.5">
      <button type="button" onClick={() => startVoice()} title="Search by voice" aria-label="Search by voice" className={btn}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v4" />
        </svg>
      </button>
      <button type="button" onClick={() => file.current?.click()} title="Search by image" aria-label="Search by image" className={btn}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
      </button>
      <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pickImage(e.target.files?.[0])} />

      {mode !== "idle" && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/30 px-4 pt-24" onClick={cancel} role="dialog" aria-label="Voice search">
          <style>{`
            @keyframes kirkbar { 0%,100% { transform: scaleY(.25) } 50% { transform: scaleY(1) } }
            @keyframes kirkring { 0% { transform: scale(1); opacity: .45 } 100% { transform: scale(1.9); opacity: 0 } }
          `}</style>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-bold text-[#0A3161]">{title}</p>

            <div className="relative mx-auto mt-5 flex h-20 w-20 items-center justify-center">
              {active && (
                <>
                  <span className="absolute inset-0 rounded-full bg-red-400" style={{ animation: "kirkring 1.6s ease-out infinite" }} />
                  <span className="absolute inset-0 rounded-full bg-red-400" style={{ animation: "kirkring 1.6s ease-out .8s infinite" }} />
                </>
              )}
              <span className={`relative flex h-20 w-20 items-center justify-center rounded-full text-white ${mode === "done" ? "bg-green-600" : active ? "bg-red-600" : "bg-[#0A3161]"}`}>
                {mode === "done" ? (
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
                ) : (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="2" width="6" height="12" rx="3" />
                    <path d="M5 11a7 7 0 0 0 14 0M12 18v4" />
                  </svg>
                )}
              </span>
            </div>

            {/* sound bars while the microphone is open, dots while the AI is thinking */}
            <div className="mx-auto mt-4 flex h-8 items-end justify-center gap-1.5" aria-hidden>
              {mode === "transcribing" ? (
                [0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-[#0A3161]" style={{ animationDelay: `${i * 0.15}s` }} />)
              ) : (
                [0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className={`h-8 w-1.5 origin-bottom rounded-full ${active ? "bg-red-500" : "bg-gray-300"}`}
                    style={active ? { animation: `kirkbar ${0.7 + (i % 3) * 0.15}s ease-in-out ${i * 0.1}s infinite` } : { transform: "scaleY(.25)" }} />
                ))
              )}
            </div>

            <p className="mt-3 text-xs font-semibold text-[#B31942]">You can speak Vietnamese or English</p>
            {mode === "listening" && (
              <div className="mt-2 flex justify-center gap-1.5">
                {LANGS.map((l) => (
                  <button key={l.code} onClick={() => changeLang(l.code)}
                    className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${lang === l.code ? "border-[#0A3161] bg-[#0A3161] text-white" : "text-gray-600 hover:bg-gray-50"}`}>
                    {l.label}
                  </button>
                ))}
              </div>
            )}
            <p className="mt-2 min-h-[2.5rem] text-base font-semibold text-gray-800">{heard ? `“${heard}”` : <span className="text-sm font-normal text-gray-500">{hint}</span>}</p>
            {heard && hint && <p className="text-xs text-gray-400">{hint}</p>}

            <div className="mt-4 flex justify-center gap-2">
              {active && (
                <button onClick={stop} className="rounded-lg bg-[#0A3161] px-4 py-2 text-sm font-bold text-white hover:bg-[#B31942]">Done</button>
              )}
              {mode !== "done" && (
                <button onClick={cancel} className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50">Cancel</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
