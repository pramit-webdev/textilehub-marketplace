import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Spinner } from "../components/Spinner";

const BUYER_FIELDS = [
  { key: "business_type", label: "Business type" },
  { key: "industry", label: "Industry" },
  { key: "interested_categories", label: "Interested categories", list: true },
  { key: "preferred_fabrics", label: "Preferred fabrics", list: true },
  { key: "typical_order_qty", label: "Typical order quantity" },
  { key: "budget_range", label: "Budget range" },
];

const SUPPLIER_FIELDS = [
  { key: "business_name", label: "Business name" },
  { key: "business_type", label: "Business type" },
  { key: "contact_phone", label: "Contact phone" },
  { key: "business_address", label: "Business address" },
  { key: "operating_hours", label: "Operating hours" },
  { key: "product_categories", label: "Product categories", list: true },
  { key: "fabric_types", label: "Fabric types", list: true },
  { key: "min_order_qty", label: "Minimum order quantity" },
];

const STARTERS = {
  buyer:
    "Tell me about your business — your type, industry, the fabrics you're interested in, typical order size and budget. I'll fill your profile as we talk. For example:\n\n“I'm a garment manufacturer in the fashion industry. I'm interested in cotton and silk for sarees, order around 500–2000 meters, budget under ₹800 per meter.”",
  supplier:
    "Tell me about your business — your company name, type, contact details, address, operating hours, and the fabrics you supply. I'll set up your supplier profile as we talk. For example:\n\n“We are Prakriti Weaves, a handloom weaver in Chennai. Call me at +91 98220 11223. We work Mon to Sat, 9am to 6pm, and supply cotton, silk and linen with a MOQ of 100 meters.”",
};

export default function Onboarding() {
  const { role: roleParam } = useParams();
  const role = roleParam === "supplier" ? "supplier" : "buyer";
  const navigate = useNavigate();
  const { user, token, refresh } = useAuth();
  const { toast } = useToast();

  const fields = role === "buyer" ? BUYER_FIELDS : SUPPLIER_FIELDS;
  const [profile, setProfile] = useState({});
  const [messages, setMessages] = useState([{ role: "assistant", content: STARTERS[role] }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [manual, setManual] = useState(false);
  const scrollRef = useRef(null);
  const recRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy, profile]);

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  function mergeStructured(data) {
    setProfile((prev) => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(data || {})) {
        if (v !== null && v !== "" && v !== undefined) {
          if (Array.isArray(v)) next[k] = v;
          else next[k] = typeof v === "string" ? v : String(v);
        }
      }
      return next;
    });
  }

  async function send(text) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setBusy(true);
    try {
      const res = await api.post("/api/ai/onboarding", {
        role,
        messages: [...messages.map((m) => ({ role: m.role, content: m.content })), { role: "user", content: trimmed }],
      }, token);
      mergeStructured(res.structured);
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "I had trouble understanding that — could you try again, or fill the form on the right?" }]);
    } finally {
      setBusy(false);
    }
  }

  function startVoice() {
    if (!SpeechRecognition) {
      toast("Voice input needs Chrome or Edge.", "error");
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      if (e.results[0].isFinal) send(transcript);
      else setInput(transcript);
    };
    recRef.current = rec;
    rec.start();
  }

  useEffect(() => () => recRef.current?.stop(), []);

  function setField(key, value) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  async function finish(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const endpoint = role === "buyer" ? "/api/buyer/me/profile" : "/api/supplier/me/profile";
      await api.post(endpoint, profile, token);
      const me = await api.get("/api/auth/me", token);
      refresh(me);
      toast(role === "buyer" ? "Profile saved — happy sourcing!" : "Business profile live!");
      navigate(role === "buyer" ? "/products" : "/supplier");
    } catch (err) {
      toast(err.message || "Could not save profile", "error");
    } finally {
      setSaving(false);
    }
  }

  const fillCount = fields.filter((f) => {
    const v = profile[f.key];
    return Array.isArray(v) ? v.length > 0 : Boolean(v);
  }).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-stone-900">
          {role === "buyer" ? "Set up your buyer profile" : "Set up your supplier business"}
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-stone-500">
          Describe your business below in plain language — or just talk. Loom extracts the
          details into your profile in real time. You can also switch to the form and fill it manually.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Chat side */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-stone-100 bg-gradient-to-r from-brand-800 to-brand-600 px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 animate-pulse-soft" />
            <span className="text-sm font-bold text-white">Loom · AI onboarding</span>
            <span className="ml-auto text-[11px] text-brand-100">{fillCount}/{fields.length} fields captured</span>
          </div>
          <div ref={scrollRef} className="scroll-thin flex-1 space-y-3 overflow-y-auto bg-stone-50 p-4" style={{ maxHeight: 420 }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    m.role === "user"
                      ? "rounded-br-sm bg-brand-700 text-white"
                      : "rounded-bl-sm bg-white text-stone-700 ring-1 ring-stone-200"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="flex gap-1 rounded-2xl rounded-bl-sm bg-white px-4 py-3 ring-1 ring-stone-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-pulse-soft" />
                  <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-pulse-soft" style={{ animationDelay: "0.2s" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-pulse-soft" style={{ animationDelay: "0.4s" }} />
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 border-t border-stone-100 p-3">
            <button
              onClick={startVoice}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${listening ? "animate-pulse-soft bg-red-500 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}
              aria-label="Speak"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
              </svg>
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder={listening ? "Listening…" : "Describe your business…"}
              className="flex-1 rounded-full border border-stone-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || busy}
              className="rounded-full bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:bg-stone-300"
            >
              Send
            </button>
          </div>
        </div>

        {/* Profile side */}
        <form onSubmit={finish} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-stone-900">Your {role} profile</h2>
            <button
              type="button"
              onClick={() => setManual(!manual)}
              className="text-xs font-semibold text-brand-700 hover:text-brand-800"
            >
              {manual ? "✨ Back to AI chat" : "✏️ Fill form manually"}
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {fields.map((f) => (
              <div key={f.key}>
                <label className="mb-1 block text-xs font-medium text-stone-600">{f.label}</label>
                {f.list ? (
                  <input
                    value={(profile[f.key] || []).join(", ")}
                    onChange={(e) =>
                      setField(
                        f.key,
                        e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                      )
                    }
                    placeholder="comma-separated values"
                    className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                  />
                ) : (
                  <input
                    value={profile[f.key] || ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                  />
                )}
              </div>
            ))}
          </div>

          {!manual && (
            <p className="mt-4 rounded-xl bg-brand-50 px-3 py-2 text-xs leading-relaxed text-brand-800">
              ✨ Fields update automatically as you chat. Anything left blank stays unfilled.
            </p>
          )}

          <button
            disabled={saving}
            className="mt-5 w-full rounded-full bg-brand-700 py-3 text-sm font-bold text-white shadow-lg shadow-brand-700/20 hover:bg-brand-800 disabled:opacity-60"
          >
            {saving ? "Saving…" : role === "buyer" ? "Start sourcing fabrics →" : "Go to my supplier dashboard →"}
          </button>
        </form>
      </div>
    </div>
  );
}
