import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    document.title = 'Página não encontrada - Woorkins';
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-2xl mx-auto space-y-6">
          <div className="space-y-2">
            <h1 className="text-8xl md:text-9xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              404
            </h1>
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
              Página não encontrada
            </h2>
            <p className="text-muted-foreground text-lg">
              Desculpe, não conseguimos encontrar a página que você está procurando.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button asChild size="lg">
              <Link to="/">
                <Home className="mr-2 h-5 w-5" />
                Voltar ao Início
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/projects">
                <Search className="mr-2 h-5 w-5" />
                Explorar Projetos
              </Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
