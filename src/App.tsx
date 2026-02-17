import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { WalletProvider } from "@/hooks/useWallet";
import Navigation from "./components/Navigation";
import ProtectedRoute from "./components/ProtectedRoute";
import { useVisitorTracking } from "@/hooks/useVisitorTracking";
import AdminNotificationPopup from "@/components/AdminNotificationPopup";
import Index from "./pages/Index";
import About from "./pages/About";
import Services from "./pages/Services";
import FAQ from "./pages/FAQ";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import CRM from "./pages/CRM";
import BioLink from "./pages/BioLink";
import ResetPassword from "./pages/ResetPassword";
import UserProfile from "./pages/UserProfile";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";
import SocialProfile from "./pages/SocialProfile";
import Pricing from "./pages/Pricing";
import AdminOnboarding from "./pages/AdminOnboarding";
import IGLoginPopup from "./pages/IGLoginPopup";

const queryClient = new QueryClient();

const AppContent = () => {
  useVisitorTracking();
  return (
    <>
      <Navigation />
      <AdminNotificationPopup />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/services" element={<Services />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
        <Route path="/crm" element={<ProtectedRoute><CRM /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
        <Route path="/admin-onboarding/:token" element={<ProtectedRoute><AdminOnboarding /></ProtectedRoute>} />
        <Route path="/link/:slug" element={<BioLink />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsAndConditions />} />
        <Route path="/social/u/:username" element={<SocialProfile />} />
        <Route path="/ig-login" element={<IGLoginPopup />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <WalletProvider>
            <AppContent />
          </WalletProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
