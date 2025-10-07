import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Star, Shield, Users, TrendingUp, MessageSquare, Award, ChevronRight } from "lucide-react";
import logoWoorkins from "@/assets/logo-woorkins.png";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <img src={logoWoorkins} alt="Woorkins" className="h-10 md:h-12" />
          <nav className="hidden md:flex items-center gap-8">
            <a href="#como-funciona" className="text-sm font-medium hover:text-primary transition-colors">
              Como Funciona
            </a>
            <a href="#para-empresas" className="text-sm font-medium hover:text-primary transition-colors">
              Para Empresas
            </a>
            <a href="#planos" className="text-sm font-medium hover:text-primary transition-colors">
              Planos
            </a>
            <select className="text-sm font-medium bg-transparent border-none cursor-pointer">
              <option value="pt">🇧🇷 PT</option>
              <option value="en">🇺🇸 EN</option>
              <option value="es">🇪🇸 ES</option>
            </select>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm">Entrar</Button>
            <Button size="sm" className="bg-gradient-primary hover:opacity-90 transition-opacity">
              Cadastrar
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium">
              <Shield className="w-4 h-4" />
              Conecte. Trabalhe. Confie.
            </div>
            <h1 className="text-5xl md:text-7xl font-bold leading-tight">
              A plataforma que une
              <span className="block bg-gradient-primary bg-clip-text text-transparent">
                pessoas e negócios
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Avalie, contrate e trabalhe com confiança. Um ecossistema completo de credibilidade, 
              portfólios profissionais e negociações seguras.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button size="lg" className="bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow">
                Começar Gratuitamente
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
              <Button size="lg" variant="outline">
                Ver Como Funciona
              </Button>
            </div>
            <div className="pt-8 flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 border-2 border-background"></div>
                  <div className="w-8 h-8 rounded-full bg-secondary/20 border-2 border-background"></div>
                  <div className="w-8 h-8 rounded-full bg-accent/20 border-2 border-background"></div>
                </div>
                <span>+10k usuários</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-primary text-primary" />
                <Star className="w-4 h-4 fill-primary text-primary" />
                <Star className="w-4 h-4 fill-primary text-primary" />
                <Star className="w-4 h-4 fill-primary text-primary" />
                <Star className="w-4 h-4 fill-primary text-primary" />
                <span className="ml-1">4.9/5 avaliação</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Como Funciona */}
      <section id="como-funciona" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-4xl font-bold mb-4">Como Funciona</h2>
            <p className="text-lg text-muted-foreground">
              Simples, seguro e transparente. Conecte-se em 3 passos.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="p-8 text-center hover:shadow-card transition-shadow">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-primary rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">1. Crie seu Perfil</h3>
              <p className="text-muted-foreground">
                Cadastre-se gratuitamente e monte seu portfólio profissional com fotos, vídeos e informações.
              </p>
            </Card>
            <Card className="p-8 text-center hover:shadow-card transition-shadow">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-secondary rounded-full flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">2. Conecte e Negocie</h3>
              <p className="text-muted-foreground">
                Converse diretamente, envie propostas e negocie com segurança através do chat interno.
              </p>
            </Card>
            <Card className="p-8 text-center hover:shadow-card transition-shadow">
              <div className="w-16 h-16 mx-auto mb-6 bg-primary rounded-full flex items-center justify-center">
                <Award className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">3. Avalie e Construa Reputação</h3>
              <p className="text-muted-foreground">
                Deixe feedback, ganhe credibilidade e seja reconhecido pelo seu profissionalismo.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Para Empresas */}
      <section id="para-empresas" className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/10 rounded-full text-secondary text-sm font-medium mb-6">
                <TrendingUp className="w-4 h-4" />
                Para Empresas e Profissionais
              </div>
              <h2 className="text-4xl font-bold mb-6">
                Destaque seu negócio e atraia mais clientes
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Crie um portfólio profissional, responda avaliações, publique conteúdo e 
                construa uma reputação sólida na maior plataforma de credibilidade.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  "Perfil verificado com selo de confiança",
                  "Portfólio multimídia com fotos e vídeos",
                  "Sistema de reputação transparente",
                  "Chat seguro para negociações",
                  "Analytics e relatórios detalhados"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <ChevronRight className="w-4 h-4 text-primary" />
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Button className="bg-gradient-primary hover:opacity-90 transition-opacity">
                Criar Perfil Empresarial
              </Button>
            </div>
            <Card className="p-8 bg-gradient-to-br from-primary/5 to-secondary/5">
              <div className="space-y-6">
                <div className="bg-background p-6 rounded-lg shadow-sm">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-primary"></div>
                    <div>
                      <h4 className="font-bold">Tech Solutions Ltd.</h4>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                        ))}
                        <span className="text-sm text-muted-foreground ml-1">(4.9)</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    "Excelente profissionalismo e entrega rápida!"
                  </p>
                </div>
                <div className="bg-background p-6 rounded-lg shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium">Índice de Confiança</span>
                    <span className="text-2xl font-bold text-primary">98%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full w-[98%] bg-gradient-primary"></div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 bg-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center text-white space-y-6">
            <h2 className="text-4xl md:text-5xl font-bold">
              Pronto para começar?
            </h2>
            <p className="text-xl opacity-90">
              Junte-se a milhares de profissionais e empresas que já confiam na Woorkins.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
                Criar Conta Gratuita
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Falar com Vendas
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <img src={logoWoorkins} alt="Woorkins" className="h-10 mb-4 brightness-0 invert" />
              <p className="text-sm opacity-80">
                Conecte. Trabalhe. Confie.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Plataforma</h4>
              <ul className="space-y-2 text-sm opacity-80">
                <li><a href="#" className="hover:opacity-100">Como Funciona</a></li>
                <li><a href="#" className="hover:opacity-100">Para Empresas</a></li>
                <li><a href="#" className="hover:opacity-100">Para Usuários</a></li>
                <li><a href="#" className="hover:opacity-100">Planos</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Suporte</h4>
              <ul className="space-y-2 text-sm opacity-80">
                <li><a href="#" className="hover:opacity-100">Central de Ajuda</a></li>
                <li><a href="#" className="hover:opacity-100">Contato</a></li>
                <li><a href="#" className="hover:opacity-100">Termos de Uso</a></li>
                <li><a href="#" className="hover:opacity-100">Privacidade</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Redes Sociais</h4>
              <ul className="space-y-2 text-sm opacity-80">
                <li><a href="#" className="hover:opacity-100">LinkedIn</a></li>
                <li><a href="#" className="hover:opacity-100">Instagram</a></li>
                <li><a href="#" className="hover:opacity-100">Twitter</a></li>
                <li><a href="#" className="hover:opacity-100">Facebook</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/20 pt-8 text-center text-sm opacity-80">
            <p>© 2025 Woorkins. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
