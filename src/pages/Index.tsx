import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Star, Shield, Users, TrendingUp, MessageSquare, Award, ChevronRight, Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "react-router-dom";
import logoWoorkins from "@/assets/woorkins.png";
import { SafeImage } from "@/components/ui/safe-image";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SearchBar } from "@/components/SearchBar";
import { SectionDivider } from "@/components/SectionDivider";
const Index = () => {
  const {
    language,
    setLanguage,
    t
  } = useLanguage();
  return <div className="min-h-screen bg-background">
      {/* Top Bar - Only Language Selector */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="bg-white/10 backdrop-blur-sm hover:bg-white/20">
              <Globe className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setLanguage('pt')}>
              🇧🇷 Português
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage('en')}>
              🇺🇸 English
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage('es')}>
              🇪🇸 Español
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button variant="ghost" asChild className="bg-white/10 backdrop-blur-sm hover:bg-white/20">
          <Link to="/auth?mode=signin">Entrar</Link>
        </Button>
      </div>

       {/* Hero Section with Large Logo */}
       <section className="relative min-h-screen flex items-center justify-center overflow-visible bg-gradient-to-br from-background via-primary/5 to-secondary/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.1),transparent_50%),radial-gradient(circle_at_70%_80%,hsl(var(--secondary)/0.1),transparent_50%)]"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-5xl mx-auto text-center space-y-10 md:space-y-12 animate-fade-in py-20">
            {/* Large Logo */}
            <div className="flex justify-center mb-8">
              <SafeImage src={logoWoorkins} alt="Woorkins" className="h-20 md:h-24 w-auto drop-shadow-2xl hover:scale-105 transition-transform duration-500" />
            </div>

            {/* Main Title */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.15] md:leading-[1.2] relative z-20">
              A plataforma que une
              <span className="block bg-gradient-primary bg-clip-text text-transparent mt-2 px-1 pb-1 md:pb-2">
                pessoas e negócios
              </span>
            </h1>

            {/* Search Bar */}
            <div className="relative z-20 -mt-4 md:-mt-8">
              <SearchBar />
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
              <Button size="lg" className="bg-gradient-primary hover:opacity-90 transition-all shadow-glow hover:shadow-elegant text-base h-14 px-10" asChild>
                <Link to="/auth?mode=signup">
                  Comece Agora
                  <ChevronRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base h-14 px-10 border-2 border-foreground text-foreground hover:bg-foreground hover:text-background" asChild>
                <Link to="/auth?mode=signup">Sou Empresa</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Animated Background Elements */}
        <SectionDivider />
      </section>

      {/* Como Funciona */}
      <section id="como-funciona" className="py-24 bg-muted/30 relative">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold">Como Funciona</h2>
            <p className="text-lg md:text-xl text-muted-foreground">
              Simples, seguro e transparente. Conecte-se em 3 passos.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="p-10 text-center hover:shadow-elegant transition-all duration-300 hover:-translate-y-2 border-2 hover:border-primary/50">
              <div className="w-20 h-20 mx-auto mb-8 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow">
                <Users className="w-10 h-10 text-white" />
              </div>
              <div className="text-6xl font-bold text-primary/10 mb-4">1</div>
              <h3 className="text-2xl font-bold mb-4">Avalie</h3>
              <p className="text-muted-foreground text-base leading-relaxed">
                Compartilhe sua experiência e ajude outros a tomarem decisões informadas
              </p>
            </Card>
            <Card className="p-10 text-center hover:shadow-elegant transition-all duration-300 hover:-translate-y-2 border-2 hover:border-secondary/50">
              <div className="w-20 h-20 mx-auto mb-8 bg-gradient-secondary rounded-2xl flex items-center justify-center shadow-glow">
                <MessageSquare className="w-10 h-10 text-white" />
              </div>
              <div className="text-6xl font-bold text-secondary/10 mb-4">2</div>
              <h3 className="text-2xl font-bold mb-4">Conecte-se</h3>
              <p className="text-muted-foreground text-base leading-relaxed">
                Chat direto e seguro entre consumidores e empresas verificadas
              </p>
            </Card>
            <Card className="p-10 text-center hover:shadow-elegant transition-all duration-300 hover:-translate-y-2 border-2 hover:border-accent/50">
              <div className="w-20 h-20 mx-auto mb-8 bg-primary rounded-2xl flex items-center justify-center shadow-glow">
                <Award className="w-10 h-10 text-white" />
              </div>
              <div className="text-6xl font-bold text-primary/10 mb-4">3</div>
              <h3 className="text-2xl font-bold mb-4">Negocie</h3>
              <p className="text-muted-foreground text-base leading-relaxed">
                Feche negócios com confiança e transparência total
              </p>
            </Card>
          </div>
        </div>
        <SectionDivider />
      </section>

      {/* Para Empresas */}
      <section id="para-empresas" className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,hsl(var(--secondary)/0.1),transparent_70%)]"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid md:grid-cols-2 gap-16 items-center max-w-7xl mx-auto">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-secondary/10 rounded-full text-secondary text-sm font-medium">
                <TrendingUp className="w-4 h-4" />
                Para Empresas
              </div>
              <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                Destaque seu negócio e atraia mais clientes
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Construa uma reputação sólida, mostre seu trabalho e conecte-se com milhares de clientes em potencial.
              </p>
              <ul className="space-y-4">
                {["Perfil verificado com selo de confiança", "Portfólio multimídia com fotos e vídeos", "Sistema de reputação transparente", "Chat seguro para negociações", "Analytics e relatórios detalhados"].map((item, i) => <li key={i} className="flex items-start gap-4 text-base">
                    <div className="w-7 h-7 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                      <ChevronRight className="w-4 h-4 text-white" />
                    </div>
                    <span className="leading-relaxed">{item}</span>
                  </li>)}
              </ul>
              <Button className="bg-gradient-primary hover:opacity-90 transition-opacity text-base h-12 px-8 shadow-glow" asChild>
                <Link to="/auth?mode=signup">Criar Perfil Empresarial</Link>
              </Button>
            </div>
            <Card className="p-10 bg-gradient-to-br from-primary/5 to-secondary/5 border-2">
              <div className="space-y-6">
                <div className="bg-background p-8 rounded-2xl shadow-card hover:shadow-elegant transition-shadow">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-primary shadow-glow"></div>
                    <div>
                      <h4 className="font-bold text-lg">Tech Solutions Ltd.</h4>
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-primary text-primary" />)}
                        <span className="text-sm text-muted-foreground ml-2">(4.9)</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground italic leading-relaxed">
                    "Excelente profissionalismo e entrega rápida! Superou minhas expectativas."
                  </p>
                </div>
                <div className="bg-background p-8 rounded-2xl shadow-card">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-sm font-medium">Índice de Confiança</span>
                    <span className="text-3xl font-bold text-primary">98%</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className="h-full w-[98%] bg-gradient-primary shadow-glow"></div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
        <SectionDivider />
      </section>

      {/* CTA Final */}
      <section className="py-24 bg-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)]"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center text-white space-y-8">
            <h2 className="text-4xl md:text-6xl font-bold leading-tight">
              Pronto para começar?
            </h2>
            <p className="text-xl md:text-2xl opacity-90 leading-relaxed">
              Junte-se a milhares de profissionais e empresas que já confiam na Woorkins.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 text-base h-14 px-10 shadow-elegant" asChild>
                <Link to="/auth?mode=signup">Criar Conta Gratuita</Link>
              </Button>
              <Button size="lg" variant="hero" className="text-base h-14 px-10">
                Falar com Vendas
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <SafeImage src={logoWoorkins} alt="Woorkins" className="h-12 w-auto mb-6 brightness-0 invert" />
              <p className="text-sm opacity-80 leading-relaxed">
                Conecte. Trabalhe. Confie.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-lg">Plataforma</h4>
              <ul className="space-y-3 text-sm opacity-80">
                <li><a href="#" className="hover:opacity-100 transition-opacity">Como Funciona</a></li>
                <li><a href="#" className="hover:opacity-100 transition-opacity">Para Empresas</a></li>
                <li><a href="#" className="hover:opacity-100 transition-opacity">Para Usuários</a></li>
                <li><a href="#" className="hover:opacity-100 transition-opacity">Planos</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-lg">Suporte</h4>
              <ul className="space-y-3 text-sm opacity-80">
                <li><a href="#" className="hover:opacity-100 transition-opacity">Central de Ajuda</a></li>
                <li><a href="#" className="hover:opacity-100 transition-opacity">Contato</a></li>
                <li><a href="#" className="hover:opacity-100 transition-opacity">Termos de Uso</a></li>
                <li><a href="#" className="hover:opacity-100 transition-opacity">Privacidade</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-lg">Redes Sociais</h4>
              <ul className="space-y-3 text-sm opacity-80">
                <li><a href="#" className="hover:opacity-100 transition-opacity">LinkedIn</a></li>
                <li><a href="#" className="hover:opacity-100 transition-opacity">Instagram</a></li>
                <li><a href="#" className="hover:opacity-100 transition-opacity">Twitter</a></li>
                <li><a href="#" className="hover:opacity-100 transition-opacity">Facebook</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/20 pt-8 text-center text-sm opacity-80">
            <p>© 2025 Woorkins. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>;
};
export default Index;