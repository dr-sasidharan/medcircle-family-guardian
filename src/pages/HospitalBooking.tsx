import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, CalendarIcon, Clock, MapPin, Stethoscope, CheckCircle2, User } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  hospital_name: string;
  phone: string | null;
}

interface Slot {
  id: string;
  slot_time: string;
  is_booked: boolean;
}

interface Booking {
  id: string;
  status: string;
  notes: string | null;
  created_at: string;
  caretaker_notified: boolean;
  doctors: Doctor;
  doctor_slots: { slot_date: string; slot_time: string };
}

const SPECIALTY_ICONS: Record<string, string> = {
  "General Medicine": "🩺",
  "Cardiology": "❤️",
  "Orthopedics": "🦴",
  "Diabetology": "🩸",
  "Neurology": "🧠",
};

const HospitalBooking = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [notes, setNotes] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [booking, setBooking] = useState(false);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [tab, setTab] = useState<"book" | "upcoming">("book");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDoctors = async () => {
      const { data } = await supabase
        .from("doctors")
        .select("*")
        .eq("is_active", true);
      setDoctors((data as Doctor[]) || []);
      setLoading(false);
    };
    fetchDoctors();
    fetchMyBookings();
  }, []);

  const fetchMyBookings = async () => {
    const { data } = await supabase
      .from("bookings")
      .select("*, doctors(*), doctor_slots(slot_date, slot_time)")
      .order("created_at", { ascending: false });
    setMyBookings((data as unknown as Booking[]) || []);
  };

  useEffect(() => {
    if (!selectedDoctor || !selectedDate) {
      setSlots([]);
      return;
    }
    const fetchSlots = async () => {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const { data } = await supabase
        .from("doctor_slots")
        .select("id, slot_time, is_booked")
        .eq("doctor_id", selectedDoctor.id)
        .eq("slot_date", dateStr)
        .order("slot_time");
      setSlots((data as Slot[]) || []);
    };
    fetchSlots();
  }, [selectedDoctor, selectedDate]);

  const handleBook = async () => {
    if (!selectedDoctor || !selectedSlot) return;
    setBooking(true);
    try {
      const { data: profile } = await supabase
        .from("patient_profiles")
        .select("id")
        .single();
      if (!profile) throw new Error("Profile not found");

      // Insert booking
      const { error: bookErr } = await supabase.from("bookings").insert({
        patient_profile_id: profile.id,
        doctor_slot_id: selectedSlot.id,
        doctor_id: selectedDoctor.id,
        notes: notes || null,
      });
      if (bookErr) throw bookErr;

      // Mark slot as booked
      await supabase
        .from("doctor_slots")
        .update({ is_booked: true })
        .eq("id", selectedSlot.id);

      // Notify caretakers
      try {
        await supabase.functions.invoke("caretaker-alert", {
          body: {
            type: "booking",
            details: {
              doctor_name: selectedDoctor.name,
              hospital: selectedDoctor.hospital_name,
              specialty: selectedDoctor.specialty,
              date: format(selectedDate!, "dd MMM yyyy"),
              time: selectedSlot.slot_time,
            },
          },
        });
      } catch (e) {
        console.log("Caretaker notification failed (non-critical):", e);
      }

      toast.success("Appointment booked successfully! 🏥");
      setConfirmOpen(false);
      setSelectedDoctor(null);
      setSelectedDate(undefined);
      setSelectedSlot(null);
      setNotes("");
      setTab("upcoming");
      fetchMyBookings();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to book appointment");
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div
        className="text-white p-5 rounded-b-[28px] relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f766e 0%, #134e4a 60%, #0c3532 100%)" }}
      >
        <div className="absolute top-[-40px] right-[-40px] w-[140px] h-[140px] rounded-full bg-white/5 animate-float" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white/10 hover:bg-white/20">
                <ArrowLeft size={18} />
              </button>
              <h1 className="text-xl font-heading font-bold">Hospital Booking</h1>
            </div>
          </div>
          <p className="text-white/60 text-sm ml-11">Book checkups & manage appointments</p>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="px-4 mt-4">
        <div className="flex bg-muted rounded-xl p-1">
          <button
            onClick={() => setTab("book")}
            className={cn(
              "flex-1 py-2.5 rounded-lg text-sm font-bold transition-all",
              tab === "book" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            🏥 Book Appointment
          </button>
          <button
            onClick={() => setTab("upcoming")}
            className={cn(
              "flex-1 py-2.5 rounded-lg text-sm font-bold transition-all",
              tab === "upcoming" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            📋 My Bookings ({myBookings.length})
          </button>
        </div>
      </div>

      {tab === "book" ? (
        <div className="px-4 mt-4 space-y-5">
          {/* Step 1: Select Doctor */}
          <div>
            <h2 className="font-heading font-bold text-foreground mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</span>
              Choose Doctor
            </h2>
            <ScrollArea className="h-auto">
              <div className="space-y-2">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading doctors...</div>
                ) : (
                  doctors.map((doc) => (
                    <Card
                      key={doc.id}
                      className={cn(
                        "cursor-pointer transition-all border-2",
                        selectedDoctor?.id === doc.id ? "border-primary bg-primary/5" : "border-transparent hover:border-primary/30"
                      )}
                      onClick={() => {
                        setSelectedDoctor(doc);
                        setSelectedDate(undefined);
                        setSelectedSlot(null);
                      }}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
                          {SPECIALTY_ICONS[doc.specialty] || "🩺"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-foreground">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">{doc.specialty}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin size={10} /> {doc.hospital_name}
                          </p>
                        </div>
                        {selectedDoctor?.id === doc.id && (
                          <CheckCircle2 size={20} className="text-primary flex-shrink-0" />
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Step 2: Select Date */}
          {selectedDoctor && (
            <div className="animate-fade-in">
              <h2 className="font-heading font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">2</span>
                Pick Date
              </h2>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Select a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => {
                      setSelectedDate(d);
                      setSelectedSlot(null);
                    }}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Step 3: Select Time Slot */}
          {selectedDoctor && selectedDate && (
            <div className="animate-fade-in">
              <h2 className="font-heading font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">3</span>
                Choose Time Slot
              </h2>
              {slots.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No slots available for this date</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot.id}
                      disabled={slot.is_booked}
                      onClick={() => setSelectedSlot(slot)}
                      className={cn(
                        "py-3 rounded-xl text-sm font-bold transition-all border-2",
                        slot.is_booked
                          ? "bg-muted text-muted-foreground border-transparent opacity-50 cursor-not-allowed line-through"
                          : selectedSlot?.id === slot.id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-foreground border-border hover:border-primary/50"
                      )}
                    >
                      <Clock size={12} className="inline mr-1" />
                      {slot.slot_time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Confirm button */}
          {selectedSlot && (
            <div className="animate-fade-in">
              <Textarea
                placeholder="Any notes for the doctor? (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mb-3"
              />
              <Button
                onClick={() => setConfirmOpen(true)}
                className="w-full h-12 text-base font-bold rounded-xl"
              >
                🏥 Confirm Booking
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* Upcoming bookings tab */
        <div className="px-4 mt-4">
          {myBookings.length === 0 ? (
            <div className="text-center py-16 animate-fade-in">
              <div className="w-20 h-20 mx-auto bg-secondary rounded-full flex items-center justify-center mb-4">
                <Stethoscope size={40} className="text-primary" />
              </div>
              <p className="font-heading font-bold text-foreground">No bookings yet</p>
              <p className="text-sm text-muted-foreground mt-1">Book an appointment to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myBookings.map((b) => (
                <Card key={b.id} className="border-primary/10">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold text-foreground">{b.doctors?.name}</p>
                        <p className="text-xs text-muted-foreground">{b.doctors?.specialty}</p>
                      </div>
                      <Badge variant={b.status === "confirmed" ? "default" : "secondary"}>
                        {b.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} /> {b.doctors?.hospital_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarIcon size={12} /> {b.doctor_slots?.slot_date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {b.doctor_slots?.slot_time}
                      </span>
                    </div>
                    {b.notes && (
                      <p className="text-xs text-muted-foreground mt-2 bg-muted rounded-lg p-2">📝 {b.notes}</p>
                    )}
                    {b.caretaker_notified && (
                      <p className="text-[11px] text-primary font-medium mt-2">✅ Caretaker notified</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="bg-muted rounded-xl p-4 space-y-2 text-sm">
              <p className="flex items-center gap-2">
                <User size={14} className="text-primary" />
                <span className="font-bold">{selectedDoctor?.name}</span>
              </p>
              <p className="flex items-center gap-2">
                <Stethoscope size={14} className="text-primary" />
                {selectedDoctor?.specialty}
              </p>
              <p className="flex items-center gap-2">
                <MapPin size={14} className="text-primary" />
                {selectedDoctor?.hospital_name}
              </p>
              <p className="flex items-center gap-2">
                <CalendarIcon size={14} className="text-primary" />
                {selectedDate && format(selectedDate, "PPP")}
              </p>
              <p className="flex items-center gap-2">
                <Clock size={14} className="text-primary" />
                {selectedSlot?.slot_time}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              📲 Your caretakers will be notified about this appointment
            </p>
            <Button
              onClick={handleBook}
              disabled={booking}
              className="w-full"
            >
              {booking ? "Booking..." : "✅ Confirm & Notify Caretaker"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default HospitalBooking;
