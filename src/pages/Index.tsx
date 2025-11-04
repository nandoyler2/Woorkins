import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { LoginPromptDialog } from "@/components/projects/LoginPromptDialog";
import { 
  CreditCard, 
  Percent, 
  ListChecks, 
  ClipboardList, 
  Shield,
  FileText,
  Users,
  CheckCircle2,
  MessageSquare,
  Sparkles,
  ChevronRight,
  Menu,
  X
} from "lucide-react";

// Import mockup images
import heroMockup from "@/assets/landing/hero-mockup.jpg";
import milestonesMockup from "@/assets/landing/milestones-mockup.jpg";
import dashboardMockup from "@/assets/landing/dashboard-mockup.jpg";
import chatMockup from "@/assets/landing/chat-mockup.jpg";
import storiesMockup from "@/assets/landing/stories-mockup.jpg";
import logo from "@/assets/woorkins-logo-transparent.png";

// Import testimonial images
import mariaSilva from "@/assets/testimonials/maria-silva.jpg";
import joaoSantos from "@/assets/testimonials/joao-santos.jpg";
import anaCosta from "@/assets/testimonials/ana-costa.jpg";

// Import background
import corporateBackground from "@/assets/landing/corporate-background.jpg";
import benefitsBg from "@/assets/landing/benefits-bg.jpg";
import freelancersBg from "@/assets/landing/freelancers-bg.jpg";
import workflowBg from "@/assets/landing/workflow-bg.jpg";
import progressBg from "@/assets/landing/progress-bg.jpg";
import analyticsBg from "@/assets/landing/analytics-bg.jpg";
import communicationBg from "@/assets/landing/communication-bg.jpg";
import socialBg from "@/assets/landing/social-bg.jpg";
import communityBg from "@/assets/landing/community-bg.jpg";

interface Project {
  id: string;
  title: string;
  category: string | null;
  budget_min: number | null;
  budget_max: number | null;
  created_at: string;
}

export default function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.title = "Woorkins - Conecte. Trabalhe. Confie.";
    
    if (user) {
      navigate("/painel");
    }

    // Fetch recent projects
    const fetchRecentProjects = async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, title, category, budget_min, budget_max, created_at")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(3);
      
      if (data) setRecentProjects(data);
    };

    fetchRecentProjects();
  }, [user, navigate]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setMobileMenuOpen(false);
  };

  const getCategoryIcon = (category: string | null) => {
    if (!category) return "📁";
    const icons: Record<string, string> = {
      design: "🎨",
      tecnologia: "💻",
      marketing: "📈",
      redacao: "✍️",
      video: "🎥",
    };
    return icons[category.toLowerCase()] || "📁";
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInHours = Math.floor((now.getTime() - past.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Há poucos minutos";
    if (diffInHours < 24) return `Há ${diffInHours}h`;
    const days = Math.floor(diffInHours / 24);
    return `Há ${days} dia${days > 1 ? 's' : ''}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 bg-gradient-to-r from-background via-primary/5 to-background backdrop-blur-md shadow-lg z-50 border-b border-primary/20">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <img src={logo} alt="Woorkins" className="h-12 drop-shadow-lg hover:scale-105 transition-transform cursor-pointer" onClick={() => navigate("/")} />
            
            {/* Desktop Menu */}
            <nav className="hidden md:flex items-center gap-8">
              <button onClick={() => navigate("/projetos")} className="text-foreground hover:text-primary transition-all font-medium hover:scale-105 relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all hover:after:w-full">
                Projetos
              </button>
              <button onClick={() => scrollToSection("como-funciona")} className="text-foreground hover:text-primary transition-all font-medium hover:scale-105 relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all hover:after:w-full">
                Como funciona
              </button>
              <button onClick={() => scrollToSection("diferenciais")} className="text-foreground hover:text-primary transition-all font-medium hover:scale-105 relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all hover:after:w-full">
                Empresas
              </button>
              <button onClick={() => scrollToSection("contato")} className="text-foreground hover:text-primary transition-all font-medium hover:scale-105 relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all hover:after:w-full">
                Contato
              </button>
            </nav>

            <div className="hidden md:flex items-center gap-4">
              <Button variant="ghost" className="hover:bg-primary/10 font-semibold" onClick={() => navigate("/auth")}>
                Entrar
              </Button>
              <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg hover:shadow-xl transition-all hover:scale-105 font-semibold" onClick={() => navigate("/auth")}>
                Comece agora grátis
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 space-y-4 animate-fade-in">
              <button onClick={() => navigate("/projetos")} className="block w-full text-left py-2 text-foreground hover:text-primary">
                Projetos
              </button>
              <button onClick={() => scrollToSection("como-funciona")} className="block w-full text-left py-2 text-foreground hover:text-primary">
                Como funciona
              </button>
              <button onClick={() => scrollToSection("diferenciais")} className="block w-full text-left py-2 text-foreground hover:text-primary">
                Empresas
              </button>
              <button onClick={() => scrollToSection("contato")} className="block w-full text-left py-2 text-foreground hover:text-primary">
                Contato
              </button>
              <Button variant="ghost" onClick={() => navigate("/auth")} className="w-full">
                Entrar
              </Button>
              <Button className="w-full bg-gradient-to-r from-primary to-accent" onClick={() => navigate("/auth")}>
                Comece agora grátis
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-20" />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary via-primary to-accent py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img src={corporateBackground} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-white space-y-6 animate-fade-in">
              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                Conecte. Trabalhe. Confie.
              </h1>
              <p className="text-xl md:text-2xl text-white/90">
                A plataforma que une freelancers e empresas de forma simples, segura e transparente.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button 
                  size="lg" 
                  variant="secondary"
                  className="bg-white text-primary hover:bg-white/90"
                  onClick={() => navigate("/projetos")}
                >
                  Ver projetos abertos
                  <ChevronRight className="ml-2" size={20} />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="border-2 border-white text-white hover:bg-white/10"
                  onClick={() => navigate("/auth")}
                >
                  Comece agora grátis
                </Button>
              </div>
            </div>
            <div className="animate-scale-in">
              <img 
                src={heroMockup} 
                alt="Interface Woorkins" 
                className="w-full rounded-lg shadow-2xl transform hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Diferenciais Section */}
      <section id="diferenciais" className="py-20 bg-gradient-to-b from-muted/50 to-background relative">
        <div className="absolute inset-0 opacity-10">
          <img src={benefitsBg} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl font-bold mb-4">Por que escolher o Woorkins?</h2>
            <p className="text-xl text-muted-foreground">Diferenciais que fazem a diferença no seu trabalho</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <CreditCard className="w-12 h-12 text-primary" />,
                title: "Parcele projetos em até 12x",
                description: "Mais flexibilidade para fechar e escalar seus jobs."
              },
              {
                icon: <Percent className="w-12 h-12 text-accent" />,
                title: "Menor taxa do mercado (12%)",
                description: "Receba mais pelo seu trabalho, com transparência total."
              },
              {
                icon: <ListChecks className="w-12 h-12 text-primary" />,
                title: "Projetos por etapas (milestones)",
                description: "Entregas organizadas e aprovadas fase por fase."
              },
              {
                icon: <ClipboardList className="w-12 h-12 text-accent" />,
                title: "Página de acompanhamento",
                description: "Veja prazos, arquivos e aprovações em tempo real."
              },
              {
                icon: <Shield className="w-12 h-12 text-primary" />,
                title: "Pagamentos garantidos",
                description: "Segurança total para quem contrata e para quem entrega."
              },
            ].map((item, index) => (
              <Card 
                key={index} 
                className="p-8 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-fade-in cursor-pointer"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="mb-4">{item.icon}</div>
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Projects Section */}
      <section className="py-20 bg-gradient-to-b from-background to-primary/5 relative">
        <div className="absolute inset-0">
          <img src={freelancersBg} alt="" className="w-full h-full object-cover opacity-15 blur-sm" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Projetos que acabaram de chegar</h2>
            <p className="text-xl text-muted-foreground">Oportunidades reais esperando por você</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {recentProjects.map((project, index) => (
              <Card 
                key={project.id} 
                className="group p-0 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer border-2 hover:border-primary/50"
                onClick={() => setShowLoginDialog(true)}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-6 group-hover:from-primary/20 group-hover:to-accent/20 transition-colors">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-md mb-4">
                    <span className="text-4xl">{getCategoryIcon(project.category)}</span>
                  </div>
                  <h3 className="font-bold text-xl mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {project.title}
                  </h3>
                  <div className="inline-block px-3 py-1 rounded-full bg-white/80 text-sm font-medium capitalize mb-4">
                    {project.category}
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      R$ {(project.budget_min || 0).toLocaleString('pt-BR')}
                    </span>
                    <span className="text-muted-foreground">a</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      R$ {(project.budget_max || 0).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <ChevronRight size={16} className="text-primary" />
                      {getTimeAgo(project.created_at)}
                    </span>
                    <span className="text-primary font-semibold group-hover:underline">
                      Ver detalhes →
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button size="lg" onClick={() => navigate("/projetos")}>
              Ver todos os projetos
              <ChevronRight className="ml-2" size={20} />
            </Button>
          </div>
        </div>
      </section>

      {/* Como Funciona Section */}
      <section id="como-funciona" className="py-20 bg-gradient-to-br from-primary/10 via-accent/5 to-muted/30 relative">
        <div className="absolute inset-0 opacity-10">
          <img src={workflowBg} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Como funciona</h2>
            <p className="text-xl text-muted-foreground">Simples, rápido e seguro</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {[
              {
                icon: <FileText className="w-16 h-16 text-primary" />,
                title: "Publique um projeto",
                description: "Descreva o que precisa e aguarde propostas de profissionais qualificados."
              },
              {
                icon: <Users className="w-16 h-16 text-accent" />,
                title: "Receba propostas",
                description: "Analise perfis, portfólios e valores dos freelancers interessados."
              },
              {
                icon: <CheckCircle2 className="w-16 h-16 text-primary" />,
                title: "Aprove e pague com segurança",
                description: "Acompanhe as etapas, aprove entregas e libere pagamentos."
              },
            ].map((item, index) => (
              <div 
                key={index} 
                className="text-center space-y-4 animate-fade-in"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="flex justify-center">{item.icon}</div>
                <h3 className="text-2xl font-semibold">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Button size="lg" className="bg-gradient-to-r from-primary to-accent" onClick={() => navigate("/auth")}>
              Comece agora grátis
            </Button>
          </div>
        </div>
      </section>

      {/* Milestones Section */}
      <section className="py-20 bg-gradient-to-b from-background via-muted/20 to-background relative">
        <div className="absolute inset-0 opacity-10">
          <img src={progressBg} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 animate-fade-in">
              <img 
                src={milestonesMockup} 
                alt="Sistema de Etapas" 
                className="w-full rounded-lg shadow-xl"
              />
            </div>
            <div className="order-1 md:order-2 space-y-6">
              <h2 className="text-4xl font-bold">Gerencie tudo por etapas (milestones)</h2>
              <p className="text-xl text-muted-foreground">
                Organize, aprove e pague cada fase com transparência total.
              </p>
              <div className="space-y-4">
                {[
                  { icon: <CheckCircle2 className="w-6 h-6 text-primary" />, text: "Transparência total nas entregas" },
                  { icon: <CheckCircle2 className="w-6 h-6 text-primary" />, text: "Pagamentos liberados a cada aprovação" },
                  { icon: <CheckCircle2 className="w-6 h-6 text-primary" />, text: "Mais controle e segurança para todos" },
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    {item.icon}
                    <span className="text-lg">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Section */}
      <section className="py-20 bg-gradient-to-br from-accent/10 via-primary/5 to-muted/30 relative">
        <div className="absolute inset-0">
          <img src={analyticsBg} alt="" className="w-full h-full object-cover opacity-10 blur-sm" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl font-bold">Um painel completo pra você gerenciar tudo</h2>
              <p className="text-xl text-muted-foreground">
                Acompanhe mensagens, propostas, pagamentos e notificações num só lugar.
              </p>
            </div>
            <div className="animate-fade-in">
              <img 
                src={dashboardMockup} 
                alt="Painel de Controle" 
                className="w-full rounded-lg shadow-xl transform hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Chat Section */}
      <section className="py-20 bg-gradient-to-b from-background to-primary/10 relative">
        <div className="absolute inset-0 opacity-10">
          <img src={communicationBg} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 animate-fade-in">
              <img 
                src={chatMockup} 
                alt="Sistema de Mensagens" 
                className="w-full rounded-lg shadow-xl"
              />
            </div>
            <div className="order-1 md:order-2 space-y-6">
              <h2 className="text-4xl font-bold">Converse de um jeito diferente</h2>
              <p className="text-xl text-muted-foreground">
                Mensagens rápidas, seguras e com histórico de etapas e arquivos. Um sistema de chat pensado pra trabalho.
              </p>
              <div className="flex items-center gap-2 text-primary">
                <MessageSquare className="w-6 h-6" />
                <span className="font-semibold">Chat integrado ao projeto</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stories Section */}
      <section className="py-20 bg-gradient-to-br from-muted/40 via-accent/10 to-primary/10 relative">
        <div className="absolute inset-0 opacity-15">
          <img src={socialBg} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl font-bold">Mostre o que você faz de um jeito novo</h2>
              <p className="text-xl text-muted-foreground">
                Publique stories profissionais, compartilhe conquistas e conecte-se com empresas e freelancers.
              </p>
              <div className="flex items-center gap-2 text-accent">
                <Sparkles className="w-6 h-6" />
                <span className="font-semibold">Stories profissionais</span>
              </div>
            </div>
            <div className="animate-fade-in flex justify-center">
              <img 
                src={storiesMockup} 
                alt="Stories Profissionais" 
                className="h-[600px] w-auto rounded-lg shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-20 bg-gradient-to-b from-background via-muted/30 to-background relative">
        <div className="absolute inset-0">
          <img src={communityBg} alt="" className="w-full h-full object-cover opacity-10" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {[
              { number: "+10.000", label: "freelancers cadastrados" },
              { number: "+500", label: "projetos por dia" },
              { number: "100%", label: "de pagamentos seguros" },
            ].map((stat, index) => (
              <div 
                key={index} 
                className="text-center space-y-2 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="text-5xl font-bold text-primary">{stat.number}</div>
                <div className="text-xl text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              {
                name: "Maria Silva",
                role: "Designer",
                text: "O Woorkins mudou a forma como trabalho. Projetos organizados e pagamentos em dia!",
                image: mariaSilva
              },
              {
                name: "João Santos",
                role: "Desenvolvedor",
                text: "Sistema de etapas é perfeito. Consigo entregar com qualidade e receber de forma justa.",
                image: joaoSantos
              },
              {
                name: "Ana Costa",
                role: "Redatora",
                text: "Melhor plataforma para freelancers. Interface limpa e suporte excelente.",
                image: anaCosta
              },
            ].map((testimonial, index) => (
              <Card 
                key={index} 
                className="p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-fade-in border-2 hover:border-primary/30"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.name}
                    className="w-16 h-16 rounded-full object-cover ring-4 ring-primary/20"
                  />
                  <div>
                    <div className="font-bold text-lg">{testimonial.name}</div>
                    <div className="text-sm text-primary font-medium">{testimonial.role}</div>
                  </div>
                </div>
                <p className="text-foreground/80 leading-relaxed italic">"{testimonial.text}"</p>
                <div className="flex gap-1 mt-4">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-yellow-500 text-lg">★</span>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          <div id="contato" className="text-center">
            <Button size="lg" className="bg-gradient-to-r from-primary to-accent" onClick={() => navigate("/auth")}>
              Comece agora grátis
            </Button>
          </div>
        </div>
      </section>

      <Footer />

      <LoginPromptDialog 
        open={showLoginDialog}
        onOpenChange={setShowLoginDialog}
      />
    </div>
  );
}
