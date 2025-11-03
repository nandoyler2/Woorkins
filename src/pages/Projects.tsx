import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, SlidersHorizontal, Lightbulb } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProjectFilters } from '@/components/projects/ProjectFilters';
import { ProjectBanner } from '@/components/projects/ProjectBanner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface Project {
  id: string;
  title: string;
  description: string;
  category: string | null;
  categories?: string[];
  budget_min: number | null;
  budget_max: number | null;
  deadline: string | null;
  status: string;
  proposals_count: number;
  created_at: string;
  profile_id: string;
  profiles: {
    username: string;
    full_name: string;
    avatar_url?: string;
  };
  skills?: string[];
}

const CATEGORIES = [
  'Desenvolvimento Web',
  'Design Gráfico',
  'Marketing Digital',
  'Redação e Tradução',
  'Desenvolvimento Mobile',
  'Consultoria',
  'Vídeo e Animação',
  'Fotografia',
  'Arquitetura',
  'Outro'
];

export default function Projects() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<string>('all');
  const [selectedDeadline, setSelectedDeadline] = useState<string>('all');
  const [proposalsFilter, setProposalsFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [bannersMinimized, setBannersMinimized] = useState(() => {
    return localStorage.getItem('projectBannersMinimized') === 'true';
  });

  // Ouvir mudanças no localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      setBannersMinimized(localStorage.getItem('projectBannersMinimized') === 'true');
    };

    window.addEventListener('storage', handleStorageChange);
    // Também verificar mudanças locais
    const interval = setInterval(handleStorageChange, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    document.title = 'Projetos - Woorkins';
  }, []);

  useEffect(() => {
    loadProjects();
  }, [selectedCategories, selectedBudget, selectedDeadline, searchQuery, proposalsFilter]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('projects' as any)
        .select(`
          *,
          profiles:profile_id (
            id,
            user_id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      // Filtro de categoria (busca em ambas as colunas: category e categories)
      if (selectedCategories.length > 0) {
        // Busca projetos que tenham qualquer uma das categorias selecionadas
        // tanto na coluna antiga (category) quanto na nova (categories array)
        query = query.or(
          selectedCategories.map(cat => 
            `category.eq.${cat},categories.cs.{${cat}}`
          ).join(',')
        );
      }

      // Filtro de orçamento
      if (selectedBudget && selectedBudget !== 'all') {
        const [min, max] = selectedBudget.split('-').map(Number);
        if (min !== undefined) {
          query = query.gte('budget_min', min);
        }
        if (max) {
          query = query.lte('budget_max', max);
        }
      }

      // Filtro de prazo
      if (selectedDeadline && selectedDeadline !== 'all') {
        const now = new Date();
        let startDate = new Date();
        
        if (selectedDeadline === 'today') {
          startDate.setHours(0, 0, 0, 0);
        } else if (selectedDeadline === 'week') {
          startDate.setDate(now.getDate() - 7);
        } else if (selectedDeadline === 'month') {
          startDate.setMonth(now.getMonth() - 1);
        }
        
        query = query.gte('created_at', startDate.toISOString());
      }

      // Filtro de propostas
      if (proposalsFilter === '0-4') {
        query = query.lte('proposals_count', 4);
      } else if (proposalsFilter === '5+') {
        query = query.gte('proposals_count', 5);
      }

      // Busca por texto
      if (searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;

      setProjects((data || []) as any);
    } catch (error: any) {
      console.error('Error loading projects:', error);
      toast({
        title: 'Erro ao carregar projetos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (category: string, checked: boolean) => {
    setSelectedCategories(prev =>
      checked ? [...prev, category] : prev.filter(c => c !== category)
    );
  };

  const handleSaveSearch = () => {
    toast({
      title: 'Busca salva!',
      description: 'Você receberá notificações sobre novos projetos que correspondam aos seus critérios.',
    });
  };

  const filtersProps = {
    categories: CATEGORIES,
    selectedCategories,
    onCategoryChange: handleCategoryChange,
    selectedBudget,
    onBudgetChange: setSelectedBudget,
    selectedDeadline,
    onDeadlineChange: setSelectedDeadline,
    proposalsFilter,
    onProposalsFilterChange: setProposalsFilter,
    onSaveSearch: handleSaveSearch,
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-muted/30">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Sidebar - Desktop only */}
            <aside className="hidden md:block">
              <div className="sticky top-6">
                <ProjectFilters {...filtersProps} />
              </div>
            </aside>

            {/* Main content */}
            <div className="md:col-span-3">
              <ProjectBanner />

              {/* Search and Create Project */}
              <div className="mb-6 flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar projetos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Mobile filters button */}
                <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                  <SheetTrigger asChild className="md:hidden">
                    <Button variant="outline" size="icon">
                      <SlidersHorizontal className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>Filtros</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                      <ProjectFilters {...filtersProps} />
                    </div>
                  </SheetContent>
                </Sheet>

                {bannersMinimized && (
                  <Button
                    variant="outline"
                    className="whitespace-nowrap"
                    onClick={() => {
                      if ((window as any).expandProjectBanner) {
                        (window as any).expandProjectBanner();
                        setBannersMinimized(false);
                      }
                    }}
                  >
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Dicas
                  </Button>
                )}

                {user && (
                  <Link to="/projetos/novo">
                    <Button className="whitespace-nowrap animate-gradient text-white border-0 hover:shadow-lg">
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Projeto
                    </Button>
                  </Link>
                )}
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                  <p className="mt-4 text-muted-foreground">Carregando projetos...</p>
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Nenhum projeto encontrado</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Tente ajustar seus filtros de busca
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {projects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              )}

              {/* Results count */}
              {!loading && projects.length > 0 && (
                <div className="mt-6 text-center text-sm text-muted-foreground">
                  Mostrando {projects.length} projeto{projects.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
