import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import SiteLayout from "@/components/layout/SiteLayout";

// EA Portal (Component 3) — standalone, auth-gated, separate from SiteLayout.
import { EAAuthProvider } from "@/hooks/useEAAuth";
import RequireAuth from "@/components/ea/RequireAuth";
import EALayout from "@/components/layout/EALayout";

// Client Portal (Component 4) — standalone, auth-gated, mobile-first.
import { ClientAuthProvider } from "@/hooks/useClientAuth";
import RequireClientAuth from "@/components/client/RequireClientAuth";
import ClientLayout from "@/components/layout/ClientLayout";

// ── Lazy page imports ────────────────────────────────────────────────────────
// Marketing
const Home        = lazy(() => import("./pages/Home"));
const HowItWorks  = lazy(() => import("./pages/HowItWorks"));
const Services    = lazy(() => import("./pages/Services"));
const CpaPartners = lazy(() => import("./pages/CpaPartners"));
const About       = lazy(() => import("./pages/About"));
const Contact     = lazy(() => import("./pages/Contact"));
const Privacy     = lazy(() => import("./pages/Privacy"));
const Onboard     = lazy(() => import("./pages/Onboard"));
const NotFound    = lazy(() => import("./pages/NotFound"));

// Auth
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));

// EA Portal pages
const EALogin  = lazy(() => import("./pages/ea/EALogin"));
const EASignup = lazy(() => import("./pages/ea/EASignup"));
const EAHome   = lazy(() => import("./pages/ea/EAHome"));
const EAClient = lazy(() => import("./pages/ea/EAClient"));
const EAProfile = lazy(() => import("./pages/ea/EAProfile"));

// Client Portal pages
const AppLogin     = lazy(() => import("./pages/app/AppLogin"));
const AppDashboard = lazy(() => import("./pages/app/AppDashboard"));
const AppExpenses  = lazy(() => import("./pages/app/AppExpenses"));
const AppReceipts  = lazy(() => import("./pages/app/AppReceipts"));
const AppReports   = lazy(() => import("./pages/app/AppReports"));
const AppTax       = lazy(() => import("./pages/app/AppTax"));
const AppChat      = lazy(() => import("./pages/app/AppChat"));
const AppMessages  = lazy(() => import("./pages/app/AppMessages"));

// Admin
const AdminPanel = lazy(() => import("./pages/admin/AdminPanel"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

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
        <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route element={<SiteLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/services" element={<Services />} />
              <Route path="/pricing" element={<Navigate to="/services" replace />} />
              <Route path="/cpa-partners" element={<CpaPartners />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy" element={<Privacy />} />
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
                  <Route path="/ea/profile" element={<EAProfile />} />
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
                  <Route path="/app/receipts" element={<AppReceipts />} />
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
        </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
