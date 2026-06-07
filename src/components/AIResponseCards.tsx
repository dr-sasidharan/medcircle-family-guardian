import { Sparkles, AlertTriangle, CheckCircle2, Info, ChevronRight, ListChecks } from "lucide-react";

export type Tone = "info" | "success" | "warn" | "danger";
export type Severity = "low" | "moderate" | "high" | "critical";

export interface ChipAction {
  label: string;
  prompt: string;
}

export type AssistantCard =
  | { kind: "hero"; emoji?: string; title: string; subtitle?: string; badges?: string[] }
  | { kind: "summary"; title?: string; body: string; tone?: Tone }
  | { kind: "bullets"; title: string; items: string[]; tone?: Tone }
  | { kind: "severity"; title: string; severity: Severity; what_to_do: string }
  | { kind: "steps"; title: string; steps: string[]; tone?: Tone }
  | { kind: "metric"; label: string; value: string; hint?: string; tone?: Tone };

export interface AssistantResponse {
  greeting?: string;
  cards: AssistantCard[];
  followups?: ChipAction[];
  disclaimer?: string;
}

const toneRing: Record<Tone, string> = {
  info: "border-teal-200/70 bg-teal-50/70",
  success: "border-emerald-200/70 bg-emerald-50/70",
  warn: "border-amber-200/70 bg-amber-50/70",
  danger: "border-rose-200/70 bg-rose-50/70",
};

const toneAccent: Record<Tone, string> = {
  info: "text-teal-700",
  success: "text-emerald-700",
  warn: "text-amber-700",
  danger: "text-rose-700",
};

const severityMeta: Record<Severity, { label: string; color: string; bar: string; tone: Tone }> = {
  low: { label: "Low risk", color: "text-emerald-700", bar: "bg-emerald-500", tone: "success" },
  moderate: { label: "Moderate", color: "text-amber-700", bar: "bg-amber-500", tone: "warn" },
  high: { label: "High", color: "text-rose-700", bar: "bg-rose-500", tone: "danger" },
  critical: { label: "Critical", color: "text-rose-800", bar: "bg-rose-600", tone: "danger" },
};

interface Props {
  data: AssistantResponse | null | undefined;
  loading?: boolean;
  onFollowup?: (prompt: string, label: string) => void;
  compact?: boolean;
}

export default function AIResponseCards({ data, loading, onFollowup, compact }: Props) {
  if (loading) {
    return (
      <div className="rounded-[18px] border border-teal-100 bg-white/70 backdrop-blur-md p-5 flex items-center gap-3 animate-fade-in">
        <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse [animation-delay:120ms]" />
        <span className="w-2 h-2 rounded-full bg-teal-300 animate-pulse [animation-delay:240ms]" />
        <p className="text-sm text-slate-500">MedCircle is thinking…</p>
      </div>
    );
  }

  if (!data || !data.cards?.length) return null;

  return (
    <div className={`space-y-3 ${compact ? "" : "animate-fade-in"}`}>
      {data.greeting && (
        <div className="flex items-center gap-2 px-1">
          <Sparkles size={14} className="text-teal-600" />
          <p className="text-[13px] font-semibold text-slate-700">{data.greeting}</p>
        </div>
      )}

      {data.cards.map((card, i) => (
        <CardRenderer key={i} card={card} />
      ))}

      {data.followups && data.followups.length > 0 && onFollowup && (
        <div className="pt-1">
          <p className="text-[10px] font-bold text-slate-500 mb-2 pl-1">Ask a follow-up</p>
          <div className="flex flex-wrap gap-2">
            {data.followups.map((chip, i) => (
              <button
                key={i}
                onClick={() => onFollowup(chip.prompt, chip.label)}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full border border-teal-200 bg-white/80 text-teal-800 hover:bg-teal-50 hover:border-teal-300 transition-colors"
              >
                {chip.label}
                <ChevronRight size={12} />
              </button>
            ))}
          </div>
        </div>
      )}

      {data.disclaimer && (
        <p className="text-[10px] text-slate-400 italic px-1 pt-1">{data.disclaimer}</p>
      )}
    </div>
  );
}

function CardRenderer({ card }: { card: AssistantCard }) {
  switch (card.kind) {
    case "hero":
      return (
        <div className="relative rounded-[18px] border border-white/70 bg-gradient-to-br from-white/90 to-teal-50/70 backdrop-blur-md p-4 shadow-sm">
          <div className="flex items-start gap-3">
            {card.emoji && <span className="text-2xl leading-none mt-0.5">{card.emoji}</span>}
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-base text-slate-900 leading-tight">{card.title}</h3>
              {card.subtitle && (
                <p className="text-sm text-slate-600 mt-1 leading-snug">{card.subtitle}</p>
              )}
              {card.badges && card.badges.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {card.badges.map((b, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900/90 text-white"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      );

    case "summary": {
      const tone = card.tone || "info";
      return (
        <div className={`rounded-[18px] border ${toneRing[tone]} backdrop-blur-md p-4`}>
          {card.title && (
            <p className={`text-[11px] font-bold mb-1 ${toneAccent[tone]}`}>{card.title}</p>
          )}
          <p className="text-sm text-slate-800 leading-relaxed">{card.body}</p>
        </div>
      );
    }

    case "bullets": {
      const tone = card.tone || "info";
      return (
        <div className={`rounded-[18px] border ${toneRing[tone]} backdrop-blur-md p-4`}>
          <div className="flex items-center gap-2 mb-2">
            <ListChecks size={14} className={toneAccent[tone]} />
            <p className={`text-[11px] font-bold ${toneAccent[tone]}`}>{card.title}</p>
          </div>
          <ul className="space-y-1.5">
            {card.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-800">
                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${tone === "danger" ? "bg-rose-500" : tone === "warn" ? "bg-amber-500" : tone === "success" ? "bg-emerald-500" : "bg-teal-500"}`} />
                <span className="leading-snug">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    case "severity": {
      const meta = severityMeta[card.severity] || severityMeta.low;
      return (
        <div className={`rounded-[18px] border ${toneRing[meta.tone]} backdrop-blur-md p-4`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className={meta.color} />
              <p className={`text-[11px] font-bold ${meta.color}`}>{card.title}</p>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${meta.bar}`}>
              {meta.label}
            </span>
          </div>
          <div className="flex items-center gap-1 mb-2.5">
            {(["low", "moderate", "high", "critical"] as Severity[]).map((s) => {
              const active =
                (card.severity === "critical" && true) ||
                (card.severity === "high" && s !== "critical") ||
                (card.severity === "moderate" && (s === "low" || s === "moderate")) ||
                (card.severity === "low" && s === "low");
              return (
                <div
                  key={s}
                  className={`flex-1 h-1.5 rounded-full ${active ? severityMeta[s].bar : "bg-slate-200"}`}
                />
              );
            })}
          </div>
          <p className="text-sm text-slate-800 leading-snug">
            <span className="font-semibold">What to do:</span> {card.what_to_do}
          </p>
        </div>
      );
    }

    case "steps": {
      const tone = card.tone || "info";
      return (
        <div className={`rounded-[18px] border ${toneRing[tone]} backdrop-blur-md p-4`}>
          <div className="flex items-center gap-2 mb-2.5">
            <CheckCircle2 size={14} className={toneAccent[tone]} />
            <p className={`text-[11px] font-bold ${toneAccent[tone]}`}>{card.title}</p>
          </div>
          <ol className="space-y-2">
            {card.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${tone === "danger" ? "bg-rose-500 text-white" : tone === "warn" ? "bg-amber-500 text-white" : tone === "success" ? "bg-emerald-500 text-white" : "bg-teal-500 text-white"}`}>
                  {i + 1}
                </span>
                <p className="text-sm text-slate-800 leading-snug">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      );
    }

    case "metric": {
      const tone = card.tone || "info";
      return (
        <div className={`rounded-[18px] border ${toneRing[tone]} backdrop-blur-md p-4 flex items-center justify-between`}>
          <div>
            <p className={`text-[11px] font-bold ${toneAccent[tone]}`}>{card.label}</p>
            {card.hint && <p className="text-[11px] text-slate-500 mt-0.5">{card.hint}</p>}
          </div>
          <p className="font-display font-bold text-2xl text-slate-900">{card.value}</p>
        </div>
      );
    }

    default:
      return null;
  }
}
