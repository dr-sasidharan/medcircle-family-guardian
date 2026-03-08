import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Droplets, AlertTriangle, Pill, Phone, Hospital, Clock, Shield } from "lucide-react";

interface EmergencyData {
  name: string;
  age: number;
  blood_group: string | null;
  allergies: string[] | null;
  chronic_conditions: string[] | null;
  emergency_contact: string | null;
  emergency_notes: string | null;
  caretakers: { name: string; relationship: string; phone: string }[];
  medicines: { name: string; dosage: string; timing: string; food_instruction: string; purpose: string | null }[];
  hospital_visits: { hospital_name: string; visit_date: string; doctor_name: string; diagnosis: string }[];
  last_updated: string;
}

const foodLabel = (f: string) => {
  if (f === "before_food") return "before food";
  if (f === "with_food") return "with food";
  return "after food";
};

const timingLabel = (t: string) => {
  const map: Record<string, string> = {
    morning: "Morning", afternoon: "Afternoon", night: "Night",
    "morning,night": "Morning & Night", "morning,afternoon,night": "Morning, Afternoon & Night",
    "morning,afternoon": "Morning & Afternoon", "afternoon,night": "Afternoon & Night",
  };
  return map[t] || t;
};

const EmergencyCard = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<EmergencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) return;
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    fetch(`https://${projectId}.supabase.co/functions/v1/emergency-profile?token=${token}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-red-600 mb-2">Profile Not Found</p>
          <p className="text-gray-500">This emergency card link is invalid or expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-red-600 text-white p-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Shield size={24} />
          <span className="text-sm font-bold tracking-widest uppercase">Emergency Health Card</span>
        </div>
        <h1 className="text-3xl font-extrabold">{data.name}</h1>
        <p className="text-red-100 mt-1">Age {data.age}</p>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Blood Group */}
        <div className="bg-white border-2 border-red-200 rounded-2xl p-6 text-center shadow-sm">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Droplets size={22} className="text-red-600" />
            <span className="text-sm font-bold text-gray-500 uppercase">Blood Group</span>
          </div>
          <p className="text-6xl font-extrabold text-red-600">{data.blood_group || "?"}</p>
        </div>

        {/* Allergies */}
        {data.allergies && data.allergies.length > 0 && (
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={20} className="text-red-600" />
              <h2 className="text-lg font-bold text-red-700">Known Allergies</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.allergies.map((a, i) => (
                <span key={i} className="bg-red-600 text-white px-4 py-2 rounded-xl text-base font-bold">{a}</span>
              ))}
            </div>
          </div>
        )}

        {/* Emergency Contacts */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Phone size={20} className="text-green-600" />
            <h2 className="text-lg font-bold text-gray-800">Emergency Contacts</h2>
          </div>
          {data.emergency_contact && (
            <a href={`tel:${data.emergency_contact}`} className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="font-semibold text-gray-800">Primary Contact</span>
              <span className="text-green-600 font-bold text-lg underline">{data.emergency_contact}</span>
            </a>
          )}
          {data.caretakers.map((ct, i) => (
            <a key={i} href={`tel:${ct.phone}`} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <div>
                <span className="font-semibold text-gray-800">{ct.name}</span>
                <span className="text-gray-400 text-sm ml-2">({ct.relationship})</span>
              </div>
              <span className="text-green-600 font-bold underline">{ct.phone}</span>
            </a>
          ))}
        </div>

        {/* Chronic Conditions */}
        {data.chronic_conditions && data.chronic_conditions.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-lg font-bold text-orange-700 mb-3">Chronic Conditions</h2>
            <div className="flex flex-wrap gap-2">
              {data.chronic_conditions.map((c, i) => (
                <span key={i} className="bg-orange-100 text-orange-800 px-3 py-1.5 rounded-lg text-sm font-semibold">{c}</span>
              ))}
            </div>
          </div>
        )}

        {/* Current Medicines */}
        {data.medicines.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Pill size={20} className="text-blue-600" />
              <h2 className="text-lg font-bold text-gray-800">Current Medicines</h2>
            </div>
            <div className="space-y-3">
              {data.medicines.map((m, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-gray-800">{m.name} {m.dosage}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {timingLabel(m.timing)} · {foodLabel(m.food_instruction)}
                  </p>
                  {m.purpose && <p className="text-xs text-blue-600 mt-1">{m.purpose}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Emergency Notes */}
        {data.emergency_notes && (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-5 shadow-sm">
            <p className="text-base font-semibold text-yellow-800">⚠️ {data.emergency_notes}</p>
          </div>
        )}

        {/* Hospital Visits */}
        {data.hospital_visits.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Hospital size={20} className="text-purple-600" />
              <h2 className="text-lg font-bold text-gray-800">Recent Hospital Visits</h2>
            </div>
            <div className="space-y-3">
              {data.hospital_visits.map((v, i) => (
                <div key={i} className="border-l-4 border-purple-400 pl-3 py-1">
                  <p className="font-semibold text-gray-800">{v.hospital_name}</p>
                  <p className="text-sm text-gray-500">{v.visit_date} — Dr. {v.doctor_name}</p>
                  <p className="text-sm text-gray-600">{v.diagnosis}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last Updated */}
        <div className="flex items-center justify-center gap-2 text-gray-400 text-sm py-2">
          <Clock size={14} />
          <span>Last updated: {new Date(data.last_updated).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
        </div>

        {/* Footer */}
        <div className="text-center py-6 border-t border-gray-200">
          <p className="text-sm font-semibold text-gray-400">This card is maintained by</p>
          <p className="text-lg font-extrabold text-teal-700">MedCircle Family Guardian</p>
        </div>
      </div>
    </div>
  );
};

export default EmergencyCard;
