import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { WalletProvider } from "@/hooks/useWallet";
import Navigation from "./components/Navigation";
import ProtectedRoute from "./components/ProtectedRoute";
import { useVisitorTracking } from "@/hooks/useVisitorTracking";
import AdminNotificationPopup from "@/components/AdminNotificationPopup";
import { useSiteSettings } from "@/hooks/useSiteSettings";
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
import Maintenance from "./pages/Maintenance";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import CustomerPortal from "./pages/CustomerPortal";

const OWNER_EMAIL = "contact@uplyze.ai";

const queryClient = new QueryClient();

const MaintenanceGuard = ({ children }: { children: React.ReactNode }) => {
  const { settings, loading: settingsLoading } = useSiteSettings();
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Don't block while loading
  if (settingsLoading || authLoading) return <>{children}</>;

  // Owner is immune
  const isOwner = user?.email === OWNER_EMAIL;
  if (isOwner) return <>{children}</>;

  // Allow maintenance page itself and ig-login popup
  if (location.pathname === "/maintenance" || location.pathname === "/ig-login") return <>{children}</>;

  // Redirect to maintenance if active
  if (settings.maintenance_mode) {
    return <Navigate to="/maintenance" replace />;
  }

  // Hide pricing page
  if (settings.hide_pricing && location.pathname === "/pricing") {
    return <Navigate to="/" replace />;
  }

  // Force password reset — redirect authenticated non-admin users to reset page
  if (settings.force_password_reset && user && location.pathname !== "/auth/reset-password" && location.pathname !== "/auth") {
    return <Navigate to="/auth/reset-password" replace />;
  }

  return <>{children}</>;
};

const AppContent = () => {
  useVisitorTracking();
  const location = useLocation();
  const isPopupRoute = location.pathname === "/ig-login";

  return (
    <MaintenanceGuard>
      {!isPopupRoute && <Navigation />}
      {!isPopupRoute && <AdminNotificationPopup />}
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/about" element={<About />} />
        <Route path="/services" element={<Services />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
        <Route path="/platform" element={<ProtectedRoute><CRM /></ProtectedRoute>} />
        <Route path="/crm" element={<Navigate to="/platform" replace />} />
        <Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
        <Route path="/admin-onboarding/:token" element={<ProtectedRoute><AdminOnboarding /></ProtectedRoute>} />
        <Route path="/link/:slug" element={<BioLink />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsAndConditions />} />
        <Route path="/social/u/:username" element={<SocialProfile />} />
        <Route path="/ig-login" element={<IGLoginPopup />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/customer-portal" element={<CustomerPortal />} />
        <Route path="/maintenance" element={<Maintenance />} />
      </Routes>
    </MaintenanceGuard>
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
