import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AIAssistant } from "@/components/AIAssistant";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Feed from "./pages/Feed";
import Admin from "./pages/Admin";
import Dashboard from "./pages/Dashboard";
import BusinessEdit from "./pages/BusinessEdit";
import BusinessProfile from "./pages/BusinessProfile";
import BusinessFinances from "./pages/BusinessFinances";
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
import Account from "./pages/Account";
import Financeiro from "./pages/Financeiro";
import Woorkoins from "./pages/Woorkoins";
import Messages from "./pages/Messages";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <LanguageProvider>
          <AuthProvider>
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
              <Route path="/:slug" element={<BusinessProfile />} />
              <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminLayout /></ProtectedRoute>}>
                <Route index element={<Admin />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="moderation" element={<AdminModeration />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="businesses" element={<AdminBusinesses />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="payment-gateway" element={<AdminPaymentGateway />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            <AIAssistant />
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
