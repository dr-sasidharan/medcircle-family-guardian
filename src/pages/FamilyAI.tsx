import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AIResponseCards from "@/components/AIResponseCards";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft, Send, Sparkles } from "lucide-react";

interface Msg {
  role: "user" | "assistant";
  content: string;        // for user: text; for assistant: JSON-string of cards
}

const SUGGESTED = [
  "Who needs attention today?",
  "Which medicines need refill?",
  "Who missed doses this week?",
  "How is everyone doing?",
];

export default function FamilyAI() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || loading) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: msg }];
    setMessages(next);
    setLoading(true);
    try {
      const history = next.slice(0, -1).map((m) => ({
        role: m.role,
        content: m.role === "assistant"
          ? (safeParse(m.content)?.cards?.map((c: any) => c.body || c.title || c.what_to_do).filter(Boolean).join(" ") || "")
          : m.content,
      }));
      const { data, error } = await supabase.functions.invoke("family-ai", {
        body: { message: msg, history, language },
      });
      if (error) throw error;
      setMessages([...next, { role: "assistant", content: JSON.stringify(data) }]);
    } catch (e: any) {
      setMessages([...next, {
        role: "assistant",
        content: JSON.stringify({
          cards: [{ kind: "summary", body: e?.message || "Something went wrong.", tone: "warn" }],
        }),
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-white/10">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <p className="text-white/70 text-[11px]">Family AI Companion</p>
          <h1 className="text-base font-semibold flex items-center gap-1.5">
            <Sparkles size={14} /> Healthcare Navigator
          </h1>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-32">
        {messages.length === 0 && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-sm text-foreground font-medium">
              👋 I know your family's medicines, adherence, refills and alerts.
            </p>
            <p className="text-xs text-muted-foreground mt-1">Try a quick question:</p>
            <div className="grid grid-cols-1 gap-2 mt-3">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-sm px-3 py-2 rounded-lg bg-primary/5 hover:bg-primary/10 border border-primary/20 text-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i}>
            {m.role === "user" ? (
              <div className="flex justify-end">
                <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2 max-w-[85%] text-sm">
                  {m.content}
                </div>
              </div>
            ) : (
              <AssistantBubble json={m.content} onChip={send} />
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:120ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:240ms]" />
            </div>
            Thinking…
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-3">
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex items-end gap-2 max-w-2xl mx-auto"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
            }}
            rows={1}
            placeholder="Ask about anyone's health…"
            className="flex-1 resize-none bg-muted/40 rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 max-h-32"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2.5 rounded-full bg-primary text-primary-foreground disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}

function AssistantBubble({ json, onChip }: { json: string; onChip: (s: string) => void }) {
  const parsed = safeParse(json);
  if (!parsed) {
    return <div className="text-sm text-muted-foreground">…</div>;
  }
  return <AIResponseCards response={parsed} onFollowup={onChip} />;
}

function safeParse(s: string): any | null {
  try { return JSON.parse(s); } catch { return null; }
}
