import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Calendar, Clock, Stethoscope } from "lucide-react";
import { format, addDays } from "date-fns";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  hospital_name: string;
}

interface Slot {
  id: string;
  slot_date: string;
  slot_time: string;
  is_booked: boolean;
}

const DoctorPortal = () => {
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDate, setNewDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [newTime, setNewTime] = useState("09:00");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchDoctor();
  }, []);

  useEffect(() => {
    if (doctor) fetchSlots();
  }, [doctor]);

  const fetchDoctor = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    const { data, error } = await supabase
      .from("doctors")
      .select("id, name, specialty, hospital_name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !data) {
      toast.error("Your account is not linked to a doctor profile. Contact admin.");
      setLoading(false);
      return;
    }
    setDoctor(data);
    setLoading(false);
  };

  const fetchSlots = async () => {
    if (!doctor) return;
    const { data, error } = await supabase
      .from("doctor_slots")
      .select("id, slot_date, slot_time, is_booked")
      .eq("doctor_id", doctor.id)
      .gte("slot_date", format(new Date(), "yyyy-MM-dd"))
      .order("slot_date", { ascending: true })
      .order("slot_time", { ascending: true });

    if (!error && data) setSlots(data);
  };

  const addSlot = async () => {
    if (!doctor) return;
    setAdding(true);

    // Check duplicate
    const exists = slots.find(s => s.slot_date === newDate && s.slot_time === newTime);
    if (exists) {
      toast.error("This slot already exists");
      setAdding(false);
      return;
    }

    const { error } = await supabase.from("doctor_slots").insert({
      doctor_id: doctor.id,
      slot_date: newDate,
      slot_time: newTime,
    });

    if (error) {
      toast.error("Failed to add slot");
    } else {
      toast.success("Slot added successfully");
      fetchSlots();
    }
    setAdding(false);
  };

  const deleteSlot = async (slotId: string) => {
    const { error } = await supabase
      .from("doctor_slots")
      .delete()
      .eq("id", slotId);

    if (error) {
      toast.error("Cannot delete a booked slot");
    } else {
      toast.success("Slot removed");
      setSlots(prev => prev.filter(s => s.id !== slotId));
    }
  };

  const addBulkSlots = async () => {
    if (!doctor) return;
    setAdding(true);

    const times = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];
    const slotsToInsert = times
      .filter(t => !slots.find(s => s.slot_date === newDate && s.slot_time === t))
      .map(t => ({
        doctor_id: doctor.id,
        slot_date: newDate,
        slot_time: t,
      }));

    if (slotsToInsert.length === 0) {
      toast.info("All standard slots already exist for this date");
      setAdding(false);
      return;
    }

    const { error } = await supabase.from("doctor_slots").insert(slotsToInsert);
    if (error) {
      toast.error("Failed to add slots");
    } else {
      toast.success(`${slotsToInsert.length} slots added`);
      fetchSlots();
    }
    setAdding(false);
  };

  // Group slots by date
  const groupedSlots = slots.reduce<Record<string, Slot[]>>((acc, slot) => {
    if (!acc[slot.slot_date]) acc[slot.slot_date] = [];
    acc[slot.slot_date].push(slot);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft size={20} className="mr-2" /> Back
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <Stethoscope size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-heading font-bold text-foreground mb-2">Not a Doctor Account</h2>
            <p className="text-muted-foreground">Your account is not linked to any doctor profile. Please contact the admin to link your account.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-primary-foreground/80 hover:text-primary-foreground mb-2 -ml-2">
            <ArrowLeft size={18} className="mr-1" /> Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Stethoscope size={24} />
            </div>
            <div>
              <h1 className="text-xl font-heading font-bold">Dr. {doctor.name}</h1>
              <p className="text-primary-foreground/70 text-sm">{doctor.specialty} · {doctor.hospital_name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-6 space-y-6">
        {/* Add Slot */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Plus size={20} /> Add Time Slots
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={newDate}
                  min={format(new Date(), "yyyy-MM-dd")}
                  max={format(addDays(new Date(), 30), "yyyy-MM-dd")}
                  onChange={e => setNewDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Time</Label>
                <Input
                  type="time"
                  value={newTime}
                  onChange={e => setNewTime(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={addSlot} disabled={adding} className="flex-1">
                <Plus size={16} className="mr-1" /> Add Slot
              </Button>
              <Button variant="outline" onClick={addBulkSlots} disabled={adding} className="flex-1">
                <Calendar size={16} className="mr-1" /> Add Full Day
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">"Add Full Day" creates slots at 9, 10, 11 AM & 2, 3, 4 PM</p>
          </CardContent>
        </Card>

        {/* Existing Slots */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Clock size={20} /> Your Upcoming Slots
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(groupedSlots).length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No upcoming slots. Add some above!</p>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedSlots).map(([date, dateSlots]) => (
                  <div key={date}>
                    <h3 className="font-heading font-bold text-sm text-foreground mb-3 flex items-center gap-2">
                      <Calendar size={14} />
                      {format(new Date(date + "T00:00:00"), "EEE, dd MMM yyyy")}
                      <span className="text-muted-foreground font-normal">({dateSlots.length} slots)</span>
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {dateSlots.map(slot => (
                        <div
                          key={slot.id}
                          className={`flex items-center justify-between rounded-xl px-3 py-2 border ${
                            slot.is_booked
                              ? "bg-destructive/10 border-destructive/20"
                              : "bg-card border-border"
                          }`}
                        >
                          <div>
                            <span className="text-sm font-bold text-foreground">{slot.slot_time}</span>
                            {slot.is_booked && (
                              <span className="block text-xs text-destructive">Booked</span>
                            )}
                          </div>
                          {!slot.is_booked && (
                            <button
                              onClick={() => deleteSlot(slot.id)}
                              className="text-muted-foreground hover:text-destructive transition-colors p-1"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DoctorPortal;
