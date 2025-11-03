import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AuthActionProvider } from "@/contexts/AuthActionContext";
import { AIAssistantProvider } from "@/contexts/AIAssistantContext";
import { UploadProvider } from "@/contexts/UploadContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AIAssistant } from "@/components/AIAssistant";
import { AuthDialog } from "@/components/AuthDialog";
import { UploadIndicator } from "@/components/UploadIndicator";
import { SystemBlockAlert } from "@/components/SystemBlockAlert";
import { useSystemBlock } from "@/hooks/useSystemBlock";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ScrollToTop from "@/components/ScrollToTop";

// Importações síncronas para rotas críticas
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import PendingConfirmation from "./pages/PendingConfirmation";
import Welcome from "./pages/Welcome";
import Feed from "./pages/Feed";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectDetails from "./pages/ProjectDetails";
import Hub from "./pages/Hub";
import HubArticle from "./pages/HubArticle";
import NotFound from "./pages/NotFound";
import Plans from "./pages/Plans";
import FAQ from "./pages/FAQ";
import TermosDeUso from "./pages/TermosDeUso";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade";
import PublicLinktree from "./pages/PublicLinktree";

// Lazy loading para rotas não críticas
const ProfileEdit = lazy(() => import("./pages/ProfileEdit"));
const ProfileRouter = lazy(() => import("./pages/ProfileRouter"));
const BusinessFinances = lazy(() => import("./pages/BusinessFinances"));
const ProjectCreate = lazy(() => import("./pages/ProjectCreate"));
const MyProjects = lazy(() => import("./pages/MyProjects"));
const Account = lazy(() => import("./pages/Account"));
const Financeiro = lazy(() => import("./pages/Financeiro"));
const Woorkoins = lazy(() => import("./pages/Woorkoins"));
const Messages = lazy(() => import("./pages/Messages"));
const PaymentSettings = lazy(() => import("./pages/PaymentSettings"));
const AdminInvites = lazy(() => import("./pages/AdminInvites"));
const ProfileEvaluate = lazy(() => import("./pages/ProfileEvaluate"));
const BusinessAppointments = lazy(() => import("./pages/BusinessAppointments"));
const UserAppointmentBooking = lazy(() => import("./pages/UserAppointmentBooking"));

// Lazy loading para páginas admin
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const Admin = lazy(() => import("./pages/Admin"));
const UsersManagement = lazy(() => import("./pages/admin/UsersManagement"));
const ModerationManagement = lazy(() => import("./pages/admin/ModerationManagement"));
const ContentManagement = lazy(() => import("./pages/admin/ContentManagement"));
const FinancialManagement = lazy(() => import("./pages/admin/FinancialManagement"));
const WithdrawalRequests = lazy(() => import("./pages/admin/WithdrawalRequests"));
const AdminSupport = lazy(() => import("./pages/admin/Support"));
const SettingsManagement = lazy(() => import("./pages/admin/SettingsManagement"));
const UserMessages = lazy(() => import("./pages/admin/UserMessages"));
const AdminBusinesses = lazy(() => import("./pages/admin/Businesses"));
const PlansSettings = lazy(() => import("./pages/admin/PlansSettings"));
const AdminAnalytics = lazy(() => import("./pages/admin/Analytics"));
const AdminReports = lazy(() => import("./pages/admin/Reports"));
const HubArticles = lazy(() => import("./pages/admin/HubArticles"));
const LegalPages = lazy(() => import("./pages/admin/LegalPages"));
const AISettings = lazy(() => import("./pages/admin/AISettings"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      gcTime: 1000 * 60 * 30, // 30 minutos (anteriormente cacheTime)
      refetchOnWindowFocus: false,
    },
  },
});

// Loading fallback mínimo
const PageLoader = () => <div className="min-h-screen" />;

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
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/pending-confirmation" element={<PendingConfirmation />} />
          <Route path="/welcome" element={<ProtectedRoute><Welcome /></ProtectedRoute>} />
          <Route path="/projetos" element={<Projects />} />
          <Route path="/projetos/:id" element={<ProjectDetails />} />
          <Route path="/projetos/novo" element={<ProtectedRoute><ProjectCreate /></ProtectedRoute>} />
          <Route path="/hub" element={<Hub />} />
          <Route path="/hub/:slug" element={<HubArticle />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/planos" element={<Plans />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/termos-de-uso" element={<TermosDeUso />} />
          <Route path="/politica-de-privacidade" element={<PoliticaPrivacidade />} />
          
          {/* Rota pública do LinkTree */}
          <Route path="/l/:slug" element={<PublicLinktree />} />
          
          <Route path="/painel" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/perfil/editar" element={<ProtectedRoute><ProfileEdit /></ProtectedRoute>} />
          <Route path="/settings/profile/:profileId" element={<ProtectedRoute><ProfileEdit /></ProtectedRoute>} />
          <Route path="/conta" element={<ProtectedRoute><Account /></ProtectedRoute>} />
          <Route path="/mensagens" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/meus-projetos" element={<ProtectedRoute><MyProjects /></ProtectedRoute>} />
          <Route path="/financeiro" element={<ProtectedRoute><Financeiro /></ProtectedRoute>} />
          <Route path="/woorkoins" element={<ProtectedRoute><Woorkoins /></ProtectedRoute>} />
          <Route path="/payment-settings" element={<ProtectedRoute><PaymentSettings /></ProtectedRoute>} />
          <Route path="/admin-invites" element={<ProtectedRoute><AdminInvites /></ProtectedRoute>} />
          <Route path="/empresa/financeiro" element={<ProtectedRoute><BusinessFinances /></ProtectedRoute>} />
          
          {/* Rotas dinâmicas devem vir por último */}
          <Route path="/:slug/avaliar" element={<ProtectedRoute><ProfileEvaluate /></ProtectedRoute>} />
          <Route path="/:slug/agendamentos" element={<ProtectedRoute><BusinessAppointments /></ProtectedRoute>} />
          <Route path="/:slug/agendamento" element={<ProtectedRoute><UserAppointmentBooking /></ProtectedRoute>} />
          <Route path="/:slug/*" element={<ProfileRouter />} />

          <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Admin />} />
            <Route path="users" element={<UsersManagement />} />
            <Route path="moderation" element={<ModerationManagement />} />
            <Route path="businesses" element={<AdminBusinesses />} />
            <Route path="content" element={<ContentManagement />} />
            <Route path="financial" element={<FinancialManagement />} />
            <Route path="withdrawals" element={<WithdrawalRequests />} />
            <Route path="support" element={<AdminSupport />} />
            <Route path="plans" element={<PlansSettings />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="hub-articles" element={<HubArticles />} />
            <Route path="legal-pages" element={<LegalPages />} />
            <Route path="settings" element={<SettingsManagement />} />
            <Route path="ai" element={<AISettings />} />
            <Route path="user-messages" element={<UserMessages />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <AuthDialog />
      <AIAssistant />
      <UploadIndicator />
    </>
  );
}

function App() {
  useEffect(() => {
    const isPreview = window.location.hostname.includes('localhost') || 
                      window.location.hostname.includes('127.0.0.1') ||
                      window.location.port === '8080';
    
    if (!isPreview && window.location.hostname.includes('lovable.app')) {
      const newUrl = `https://woorkins.com${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.location.href = newUrl;
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
              <AuthActionProvider>
                <AIAssistantProvider>
                  <UploadProvider>
                    <AppContent />
                  </UploadProvider>
                </AIAssistantProvider>
              </AuthActionProvider>
            </AuthProvider>
          </LanguageProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

