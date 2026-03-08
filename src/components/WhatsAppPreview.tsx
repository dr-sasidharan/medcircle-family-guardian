import { CheckCheck, Phone } from "lucide-react";

const mockMessages = [
  {
    type: "reminder",
    time: "8:00 AM",
    text: "⏰ *MedCircle Reminder*\n\nHi Rajesh, it's time to take your medicine:\n\n💊 *Metformin 500mg* — After food\n💊 *Amlodipine 5mg* — Before food\n💊 *Pantoprazole 40mg* — Before food\n\nReply ✅ when taken or ❌ if skipped.",
    from: "MedCircle",
    status: "read",
  },
  {
    type: "reply",
    time: "8:15 AM",
    text: "✅",
    from: "You",
    status: "sent",
  },
  {
    type: "confirmation",
    time: "8:15 AM",
    text: "Great! 🎉 All 3 morning medicines marked as taken.\n\nNext reminder: *2:00 PM* (Aspirin 75mg)",
    from: "MedCircle",
    status: "read",
  },
  {
    type: "missed",
    time: "2:30 PM",
    text: "⚠️ *Missed Dose Alert*\n\nRajesh hasn't taken:\n💊 *Aspirin 75mg* (scheduled 2:00 PM)\n\nWe'll remind again in 30 minutes.",
    from: "MedCircle",
    status: "read",
  },
  {
    type: "caretaker_alert",
    time: "3:00 PM",
    text: "🚨 *Caretaker Alert — MedCircle*\n\nHi Priya, your father *Rajesh Kumar* has missed:\n\n💊 Aspirin 75mg (2:00 PM)\n\nPlease check on him. Call: +91 98765 43210",
    from: "MedCircle → Priya",
    status: "delivered",
  },
];

const WhatsAppPreview = () => {
  return (
    <div className="rounded-2xl overflow-hidden border border-border shadow-lg">
      {/* WhatsApp Header */}
      <div className="bg-[#075e54] text-white px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
          M
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold">MedCircle</p>
          <p className="text-xs text-white/60">online</p>
        </div>
        <Phone size={18} className="text-white/70" />
      </div>

      {/* Chat Background */}
      <div
        className="p-3 space-y-2 max-h-[420px] overflow-y-auto"
        style={{ background: "#ece5dd" }}
      >
        {/* Date chip */}
        <div className="text-center">
          <span className="bg-white/80 text-[#54656f] text-[10px] px-3 py-1 rounded-lg shadow-sm font-semibold">
            TODAY
          </span>
        </div>

        {mockMessages.map((msg, i) => {
          const isOutgoing = msg.from === "You";
          return (
            <div
              key={i}
              className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 shadow-sm relative ${
                  isOutgoing
                    ? "bg-[#dcf8c6] rounded-tr-none"
                    : "bg-white rounded-tl-none"
                }`}
              >
                {!isOutgoing && msg.from !== "MedCircle" && (
                  <p className="text-[10px] font-bold text-[#075e54] mb-0.5">{msg.from}</p>
                )}
                <p className="text-[13px] text-[#303030] whitespace-pre-line leading-[1.4]">
                  {msg.text.split(/(\*[^*]+\*)/).map((part, j) =>
                    part.startsWith("*") && part.endsWith("*") ? (
                      <strong key={j}>{part.slice(1, -1)}</strong>
                    ) : (
                      <span key={j}>{part}</span>
                    )
                  )}
                </p>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <span className="text-[10px] text-[#8696a0]">{msg.time}</span>
                  {isOutgoing && (
                    <CheckCheck
                      size={14}
                      className={msg.status === "read" ? "text-[#53bdeb]" : "text-[#8696a0]"}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input bar */}
      <div className="bg-[#f0f0f0] px-3 py-2 flex items-center gap-2">
        <div className="flex-1 bg-white rounded-full px-4 py-2 text-[13px] text-[#8696a0]">
          Type ✅ or ❌ to respond...
        </div>
        <div className="w-9 h-9 rounded-full bg-[#075e54] flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppPreview;
