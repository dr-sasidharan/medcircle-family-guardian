import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ElderlyModeProvider } from "@/contexts/ElderlyModeContext";
import Welcome from "./pages/Welcome";
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
              <Route path="/patient" element={<PatientDashboard />} />
              <Route path="/add-medicine" element={<AddMedicine />} />
              <Route path="/caretaker" element={<CaretakerDashboard />} />
              <Route path="/medicine-detail" element={<MedicineDetail />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/paywall" element={<Paywall />} />
              <Route path="/scan" element={<ScanPrescription />} />
              <Route path="/scan-tablet" element={<ScanTablet />} />
              <Route path="/reminders" element={<Reminders />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/drug-interaction" element={<DrugInteraction />} />
              <Route path="/doctor-summary" element={<DoctorSummary />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ElderlyModeProvider>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
