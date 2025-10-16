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
import BusinessProfile from "./pages/BusinessProfile";
import BusinessFinances from "./pages/BusinessFinances";
import UserProfile from "./pages/UserProfile";
import Projects from "./pages/Projects";
import ProjectCreate from "./pages/ProjectCreate";
import ProjectDetails from "./pages/ProjectDetails";
import MyProjects from "./pages/MyProjects";
import NotFound from "./pages/NotFound";
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
import Account from "./pages/Account";
import Financeiro from "./pages/Financeiro";
import Woorkoins from "./pages/Woorkoins";
import Messages from "./pages/Messages";

const queryClient = new QueryClient();

function AppContent() {
  const { user } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setProfileId(null);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (data) setProfileId(data.id);
    };

    loadProfile();
  }, [user]);

  const { systemBlock } = useSystemBlock(profileId);

  return (
    <>
      {systemBlock && (
        <SystemBlockAlert
          blockType={systemBlock.block_type}
          reason={systemBlock.reason}
          blockedUntil={systemBlock.blocked_until ? new Date(systemBlock.blocked_until) : null}
          isPermanent={systemBlock.is_permanent}
        />
      )}
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/autenticacao" element={<Auth />} />
        <Route path="/painel" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/conta" element={<ProtectedRoute><Account /></ProtectedRoute>} />
        <Route path="/financeiro" element={<ProtectedRoute><Financeiro /></ProtectedRoute>} />
        <Route path="/woorkoins" element={<ProtectedRoute><Woorkoins /></ProtectedRoute>} />
        <Route path="/empresa/:slug/editar" element={<ProtectedRoute><BusinessEdit /></ProtectedRoute>} />
        <Route path="/empresa/financas" element={<ProtectedRoute><BusinessFinances /></ProtectedRoute>} />
        <Route path="/mensagens" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
        <Route path="/projetos" element={<Projects />} />
        <Route path="/projetos/novo" element={<ProtectedRoute><ProjectCreate /></ProtectedRoute>} />
        <Route path="/projetos/:id" element={<ProjectDetails />} />
        <Route path="/meus-projetos" element={<ProtectedRoute><MyProjects /></ProtectedRoute>} />
        <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Admin />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="users/:userId/messages" element={<UserMessages />} />
          <Route path="moderation" element={<AdminModeration />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="businesses" element={<AdminBusinesses />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="payment-gateway" element={<AdminPaymentGateway />} />
          <Route path="document-verifications" element={<AdminDocumentVerifications />} />
          <Route path="support" element={<AdminSupport />} />
        </Route>
        <Route path="/perfil/:username" element={<UserProfile />} />
        <Route path="/:slug" element={<BusinessProfile />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <AIAssistant />
    </>
  );
}

const App = () => (
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

export default App;
