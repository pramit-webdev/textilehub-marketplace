import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatINR, productImage } from "../lib/format";

const SUGGESTIONS = [
  "Find lightweight summer fabrics",
  "Compare cotton vs linen",
  "Silk under ₹500 for sarees",
  "What's the MOQ for denim?",
];

const FALLBACK_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%23e5e7eb'/%3E%3Ctext x='200' y='210' font-size='80' text-anchor='middle'%3E🧵%3C/text%3E%3C/svg%3E";

function renderRich(text) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (line.trim().startsWith("-")) {
      return (
        <div key={i} className="flex gap-1.5 pl-1">
          <span className="text-brand-500">•</span>
          <span>{line.replace(/^-\s*/, "")}</span>
        </div>
      );
    }
    if (line.startsWith("**") && line.endsWith("**")) {
      return <div key={i} className="font-semibold">{line.slice(2, -2)}</div>;
    }
    return <div key={i}>{line || "\u00A0"}</div>;
  });
}

export default function AIChatWidget({ context = "" }) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi, I'm Loom — your AI fabric assistant. Ask me to find fabrics, compare products, or answer questions about orders and MOQs. You can even use your voice!",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const scrollRef = useRef(null);
  const recRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, searchResults, busy]);

  useEffect(() => {
    return () => {
      if (recRef.current) recRef.current.stop();
    };
  }, []);

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  async function send(text) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setSearchResults(null);
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setBusy(true);
    try {
      const res = await api.post("/api/ai/chat", {
        messages: [...messages.map(({ role, content }) => ({ role, content })), { role: "user", content: trimmed }],
        ...(context ? { context } : {}),
      });
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I hit a snag. Please try again in a moment." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function naturalSearch(query) {
    setSearchResults(null);
    setMessages((prev) => [...prev, { role: "user", content: `🔍 ${query}` }]);
    setBusy(true);
    try {
      const ids = await api.post("/api/ai/nl-search", {
        messages: [{ role: "user", content: query }],
      });
      const products = await api.get("/api/products?page_size=60");
      const matched = products.items.filter((p) => ids.includes(p.id));
      setSearchResults(matched);
    } catch {
      toast("Could not search. Try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  function startVoice() {
    if (!SpeechRecognition) {
      toast("Voice input is not supported in this browser — try Chrome.", "error");
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      if (e.results[0].isFinal) {
        const q = transcript.trim();
        if (q.startsWith("search")) naturalSearch(q.replace(/^search/i, ""));
        else send(q);
      }
    };
    recRef.current = rec;
    rec.start();
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-700 text-white shadow-xl shadow-brand-900/30 transition hover:scale-105 hover:bg-brand-800"
        aria-label="AI assistant"
      >
        {open ? (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        ) : (
          <span className="text-2xl">✨</span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-24 right-4 z-50 flex h-[min(600px,calc(100vh-120px))] w-[min(400px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl animate-fade-up">
          <div className="flex items-center gap-3 border-b border-stone-100 bg-gradient-to-r from-brand-800 to-brand-600 px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-lg">✨</span>
            <div className="flex-1">
              <div className="text-sm font-bold text-white">Loom — AI Assistant</div>
              <div className="flex items-center gap-1.5 text-[11px] text-brand-100">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse-soft" />
                Online · uses marketplace data
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div ref={scrollRef} className="scroll-thin flex-1 space-y-3 overflow-y-auto bg-stone-50 p-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    m.role === "user"
                      ? "rounded-br-sm bg-brand-700 text-white"
                      : "rounded-bl-sm bg-white text-stone-700 ring-1 ring-stone-200"
                  }`}
                >
                  <div className="prose-chat">{renderRich(m.content)}</div>
                </div>
              </div>
            ))}

            {busy && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-white px-4 py-3 ring-1 ring-stone-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-pulse-soft" />
                  <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-pulse-soft" style={{ animationDelay: "0.2s" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-pulse-soft" style={{ animationDelay: "0.4s" }} />
                </div>
              </div>
            )}

            {searchResults && (
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wide text-stone-400">
                  {searchResults.length} matches
                </div>
                {searchResults.map((p) => (
                  <Link
                    key={p.id}
                    to={`/products/${p.id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl bg-white p-2.5 ring-1 ring-stone-200 hover:ring-brand-400"
                  >
                    <img
                      src={productImage(p, FALLBACK_IMG)}
                      alt=""
                      className="h-12 w-12 rounded-lg object-cover"
                      onError={(e) => (e.currentTarget.src = FALLBACK_IMG)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-stone-900">{p.name}</div>
                      <div className="text-[11px] text-stone-500">{p.fabric_type} · MOQ {p.moq}</div>
                    </div>
                    <span className="text-sm font-bold text-brand-700">{formatINR(p.price)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-stone-100 bg-white p-3">
            <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1 scroll-thin">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="whitespace-nowrap rounded-full border border-stone-200 px-2.5 py-1 text-[11px] font-medium text-stone-600 hover:border-brand-400 hover:text-brand-700"
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send(input)}
                placeholder="Ask Loom about fabrics…"
                className="flex-1 rounded-full border border-stone-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
              />
              <button
                onClick={startVoice}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${
                  listening
                    ? "animate-pulse-soft bg-red-500 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
                aria-label="Voice input"
                title="Speak your query"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                </svg>
              </button>
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || busy}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white transition hover:bg-brand-800 disabled:bg-stone-300"
                aria-label="Send"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </svg>
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] text-stone-400">
              Say "search …" or tap the mic — Loom understands natural language & voice.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
