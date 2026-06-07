import { Outlet, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import SiteLayout from "@/components/layout/SiteLayout";
import Home from "./pages/Home";
import HowItWorks from "./pages/HowItWorks";
import Services from "./pages/Services";
import CpaPartners from "./pages/CpaPartners";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Onboard from "./pages/Onboard";
import NotFound from "./pages/NotFound";

// EA Portal (Component 3) — standalone, auth-gated, separate from SiteLayout.
import { EAAuthProvider } from "@/hooks/useEAAuth";
import RequireAuth from "@/components/ea/RequireAuth";
import EALayout from "@/components/layout/EALayout";
import EALogin from "./pages/ea/EALogin";
import EASignup from "./pages/ea/EASignup";
import EAHome from "./pages/ea/EAHome";
import EAClient from "./pages/ea/EAClient";
import ResetPassword from "./pages/auth/ResetPassword";

// Client Portal (Component 4) — standalone, auth-gated, mobile-first.
import { ClientAuthProvider } from "@/hooks/useClientAuth";
import RequireClientAuth from "@/components/client/RequireClientAuth";
import ClientLayout from "@/components/layout/ClientLayout";
import AppLogin from "./pages/app/AppLogin";
import AppDashboard from "./pages/app/AppDashboard";
import AppExpenses from "./pages/app/AppExpenses";
import AppReports from "./pages/app/AppReports";
import AppTax from "./pages/app/AppTax";
import AppChat from "./pages/app/AppChat";
import AppMessages from "./pages/app/AppMessages";
import AdminPanel from "./pages/admin/AdminPanel";

const queryClient = new QueryClient();

// Provides the EA auth context to every /ea route (login + guarded) via Outlet.
const EAAuthGate = () => (
  <EAAuthProvider>
    <Outlet />
  </EAAuthProvider>
);

// Provides the client auth context to every /app route via Outlet.
const ClientAuthGate = () => (
  <ClientAuthProvider>
    <Outlet />
  </ClientAuthProvider>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/services" element={<Services />} />
            <Route path="/cpa-partners" element={<CpaPartners />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
          </Route>
          {/* Onboarding portal — standalone chrome, outside the marketing SiteLayout. */}
          <Route path="/onboard/:token" element={<Onboard />} />

          {/* Password-reset landing — outside all auth gates, needs no session. */}
          <Route path="/auth/reset-password" element={<ResetPassword />} />

          {/* EA Portal — auth context wraps login + protected routes. */}
          <Route element={<EAAuthGate />}>
            <Route path="/ea/login" element={<EALogin />} />
            <Route path="/ea/signup" element={<EASignup />} />
            <Route element={<RequireAuth />}>
              <Route element={<EALayout />}>
                <Route path="/ea" element={<EAHome />} />
                <Route path="/ea/clients/:schema" element={<EAClient />} />
              </Route>
            </Route>
          </Route>

          {/* Client Portal — auth context wraps login + protected routes. */}
          <Route element={<ClientAuthGate />}>
            <Route path="/app/login" element={<AppLogin />} />
            <Route element={<RequireClientAuth />}>
              <Route element={<ClientLayout />}>
                <Route path="/app"          element={<AppDashboard />} />
                <Route path="/app/expenses" element={<AppExpenses />} />
                <Route path="/app/reports"  element={<AppReports />} />
                <Route path="/app/tax"      element={<AppTax />} />
                <Route path="/app/messages" element={<AppMessages />} />
                <Route path="/app/chat"     element={<AppChat />} />
              </Route>
            </Route>
          </Route>

          {/* Admin panel — standalone, key-gated (no Supabase auth required). */}
          <Route path="/admin" element={<AdminPanel />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
