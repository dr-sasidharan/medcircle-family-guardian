import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ElderlyModeProvider } from "@/contexts/ElderlyModeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Welcome from "./pages/Welcome";
import Auth from "./pages/Auth";
import PatientDashboard from "./pages/PatientDashboard";
import AddMedicine from "./pages/AddMedicine";
import CaretakerDashboard from "./pages/CaretakerDashboard";
import MedicineDetail from "./pages/MedicineDetail";
import Pricing from "./pages/Pricing";
import Paywall from "./pages/Paywall";
import ScanPrescription from "./pages/ScanPrescription";
import ScanTablet from "./pages/ScanTablet";
import Reminders from "./pages/Reminders";
import Profile from "./pages/Profile";
import DrugInteraction from "./pages/DrugInteraction";
import DoctorSummary from "./pages/DoctorSummary";
import Settings from "./pages/Settings";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const P = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>{children}</ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <ElderlyModeProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Welcome />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/patient" element={<P><PatientDashboard /></P>} />
              <Route path="/add-medicine" element={<P><AddMedicine /></P>} />
              <Route path="/caretaker" element={<P><CaretakerDashboard /></P>} />
              <Route path="/medicine-detail" element={<P><MedicineDetail /></P>} />
              <Route path="/pricing" element={<P><Pricing /></P>} />
              <Route path="/paywall" element={<P><Paywall /></P>} />
              <Route path="/scan" element={<P><ScanPrescription /></P>} />
              <Route path="/scan-tablet" element={<P><ScanTablet /></P>} />
              <Route path="/reminders" element={<P><Reminders /></P>} />
              <Route path="/profile" element={<P><Profile /></P>} />
              <Route path="/drug-interaction" element={<P><DrugInteraction /></P>} />
              <Route path="/doctor-summary" element={<P><DoctorSummary /></P>} />
              <Route path="/settings" element={<P><Settings /></P>} />
              <Route path="/admin" element={<P><AdminDashboard /></P>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ElderlyModeProvider>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
