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
import EAHome from "./pages/ea/EAHome";
import EAClient from "./pages/ea/EAClient";

const queryClient = new QueryClient();

// Provides the EA auth context to every /ea route (login + guarded) via Outlet.
const EAAuthGate = () => (
  <EAAuthProvider>
    <Outlet />
  </EAAuthProvider>
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

          {/* EA Portal — auth context wraps login + protected routes. */}
          <Route element={<EAAuthGate />}>
            <Route path="/ea/login" element={<EALogin />} />
            <Route element={<RequireAuth />}>
              <Route element={<EALayout />}>
                <Route path="/ea" element={<EAHome />} />
                <Route path="/ea/clients/:schema" element={<EAClient />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
