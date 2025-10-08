import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Feed from "./pages/Feed";
import Admin from "./pages/Admin";
import Dashboard from "./pages/Dashboard";
import BusinessEdit from "./pages/BusinessEdit";
import BusinessProfile from "./pages/BusinessProfile";
import BusinessFinances from "./pages/BusinessFinances";
import UserOrders from "./pages/UserOrders";
import Projects from "./pages/Projects";
import ProjectCreate from "./pages/ProjectCreate";
import ProjectDetails from "./pages/ProjectDetails";
import MyProjects from "./pages/MyProjects";
import NotFound from "./pages/NotFound";

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
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/business/:slug/edit" element={<ProtectedRoute><BusinessEdit /></ProtectedRoute>} />
              <Route path="/business/finances" element={<ProtectedRoute><BusinessFinances /></ProtectedRoute>} />
              <Route path="/user/orders" element={<ProtectedRoute><UserOrders /></ProtectedRoute>} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/new" element={<ProtectedRoute><ProjectCreate /></ProtectedRoute>} />
              <Route path="/projects/:id" element={<ProjectDetails />} />
              <Route path="/my-projects" element={<ProtectedRoute><MyProjects /></ProtectedRoute>} />
              <Route path="/:slug" element={<BusinessProfile />} />
              <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
