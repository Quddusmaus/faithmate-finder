import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { CurrentUserProvider } from "@/contexts/CurrentUserContext";
import Index from "./pages/Index";
import Profiles from "./pages/Profiles";
import Auth from "./pages/Auth";
import ProfileSetup from "./pages/ProfileSetup";
import Messages from "./pages/Messages";
import Admin from "./pages/Admin";
import BanAppeal from "./pages/BanAppeal";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Contact from "./pages/Contact";
import Install from "./pages/Install";
import SafetyTips from "./pages/SafetyTips";
import Subscription from "./pages/Subscription";
import Writings from "./pages/Writings";
import NotFound from "./pages/NotFound";
import CookieConsent from "./components/CookieConsent";
import InstallPromptBanner from "./components/InstallPromptBanner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CurrentUserProvider>
      <SubscriptionProvider>
        <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/profiles" element={<Profiles />} />
              <Route path="/profile-setup" element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />
              <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
              <Route path="/appeal" element={<ProtectedRoute><BanAppeal /></ProtectedRoute>} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/install" element={<Install />} />
              <Route path="/safety" element={<SafetyTips />} />
              <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
              <Route path="/writings" element={<ProtectedRoute><Writings /></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <CookieConsent />
            <InstallPromptBanner />
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
      </SubscriptionProvider>
    </CurrentUserProvider>
  </QueryClientProvider>
);

export default App;
