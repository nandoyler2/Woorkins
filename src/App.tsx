import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AIAssistantProvider } from "@/contexts/AIAssistantContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AIAssistant } from "@/components/AIAssistant";
import { SystemBlockAlert } from "@/components/SystemBlockAlert";
import { useSystemBlock } from "@/hooks/useSystemBlock";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Feed from "./pages/Feed";
import Admin from "./pages/Admin";
import Dashboard from "./pages/Dashboard";
import BusinessEdit from "./pages/BusinessEdit";
import ProfileRouter from "./pages/ProfileRouter";
import BusinessFinances from "./pages/BusinessFinances";
import Projects from "./pages/Projects";
import ProjectCreate from "./pages/ProjectCreate";
import ProjectDetails from "./pages/ProjectDetails";
import MyProjects from "./pages/MyProjects";
import NotFound from "./pages/NotFound";
import Plans from "./pages/Plans";
import FAQ from "./pages/FAQ";
import TermosDeUso from "./pages/TermosDeUso";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade";
import { AdminLayout } from "./pages/admin/AdminLayout";
import AdminUsers from "./pages/admin/Users";
import AdminModeration from "./pages/admin/Moderation";
import AdminReports from "./pages/admin/Reports";
import AdminBusinesses from "./pages/admin/Businesses";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminSettings from "./pages/admin/Settings";
import AdminPaymentGateway from "./pages/admin/PaymentGateway";
import AdminDocumentVerifications from "./pages/admin/DocumentVerifications";
import AdminSupport from "./pages/admin/Support";
import UserMessages from "./pages/admin/UserMessages";
import AISettings from "./pages/admin/AISettings";
import PlansSettings from "./pages/admin/PlansSettings";
import LegalPages from "./pages/admin/LegalPages";
import Account from "./pages/Account";
import Financeiro from "./pages/Financeiro";
import Woorkoins from "./pages/Woorkoins";
import Messages from "./pages/Messages";
import PaymentSettings from "./pages/PaymentSettings";
import BusinessProfile from "./pages/BusinessProfile";

const queryClient = new QueryClient();

function AppContent() {
  const { user } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfileId(data.id);
        });
    }
  }, [user]);

  const { isBlocked } = useSystemBlock(profileId);

  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/profile/:username" element={<ProfileRouter />} />
        <Route path="/projetos" element={<Projects />} />
        <Route path="/projetos/:id" element={<ProjectDetails />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/empresa/:slug" element={<BusinessProfile />} />
        <Route path="/planos" element={<Plans />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/termos-de-uso" element={<TermosDeUso />} />
          <Route path="/politica-de-privacidade" element={<PoliticaPrivacidade />} />
        
        <Route path="/painel" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/conta" element={<ProtectedRoute><Account /></ProtectedRoute>} />
        <Route path="/mensagens" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
        <Route path="/projetos/novo" element={<ProtectedRoute><ProjectCreate /></ProtectedRoute>} />
        <Route path="/meus-projetos" element={<ProtectedRoute><MyProjects /></ProtectedRoute>} />
        <Route path="/financeiro" element={<ProtectedRoute><Financeiro /></ProtectedRoute>} />
        <Route path="/woorkoins" element={<ProtectedRoute><Woorkoins /></ProtectedRoute>} />
        <Route path="/payment-settings" element={<ProtectedRoute><PaymentSettings /></ProtectedRoute>} />
        <Route path="/empresa/:slug/editar" element={<ProtectedRoute><BusinessEdit /></ProtectedRoute>} />
        <Route path="/empresa/financeiro" element={<ProtectedRoute><BusinessFinances /></ProtectedRoute>} />

        <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Admin />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="businesses" element={<AdminBusinesses />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="support" element={<AdminSupport />} />
          <Route path="document-verifications" element={<AdminDocumentVerifications />} />
          <Route path="moderation" element={<AdminModeration />} />
          <Route path="user-messages" element={<UserMessages />} />
          <Route path="payment-gateway" element={<AdminPaymentGateway />} />
          <Route path="ai-settings" element={<AISettings />} />
          <Route path="plans-settings" element={<PlansSettings />} />
          <Route path="legal-pages" element={<LegalPages />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
      <AIAssistant />
    </>
  );
}

function App() {
  useEffect(() => {
    if (window.location.hostname.includes('lovable.app')) {
      window.location.href = window.location.href.replace('lovable.app', 'woorkins.com');
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <LanguageProvider>
            <AuthProvider>
              <AIAssistantProvider>
                <AppContent />
              </AIAssistantProvider>
            </AuthProvider>
          </LanguageProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

