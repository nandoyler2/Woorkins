import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Briefcase, Calendar, DollarSign, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface Project {
  id: string;
  title: string;
  description: string;
  category: string | null;
  budget_min: number | null;
  budget_max: number | null;
  deadline: string | null;
  status: string;
  proposals_count: number;
  created_at: string;
  profiles: {
    username: string;
    full_name: string;
  };
}

export default function Projects() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'my'>('open');

  useEffect(() => {
    loadProjects();
  }, [filter, user]);

  const loadProjects = async () => {
    try {
      let query = supabase
        .from('projects' as any)
        .select(`
          *,
          profiles:profile_id (
            username,
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (filter === 'open') {
        query = query.eq('status', 'open');
      } else if (filter === 'my' && user) {
        const { data: profileData } = await supabase
          .from('profiles' as any)
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (profileData) {
          query = query.eq('profile_id', (profileData as any).id);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setProjects(data as any);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os projetos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatBudget = (min: number | null, max: number | null) => {
    if (!min && !max) return 'A combinar';
    if (min && max) return `R$ ${min} - R$ ${max}`;
    if (min) return `A partir de R$ ${min}`;
    return `Até R$ ${max}`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Sem prazo';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Encontre Trabalho
              </h1>
              <p className="text-muted-foreground mt-2">
                Envie propostas e encontre projetos incríveis
              </p>
            </div>
            <Button asChild className="bg-gradient-primary hover:shadow-glow transition-all">
              <Link to="/projects/new">
                <Plus className="w-4 h-4 mr-2" />
                Criar Projeto
              </Link>
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'bg-gradient-primary' : ''}
            >
              Todos
            </Button>
            <Button
              variant={filter === 'open' ? 'default' : 'outline'}
              onClick={() => setFilter('open')}
              className={filter === 'open' ? 'bg-gradient-primary' : ''}
            >
              Abertos
            </Button>
            {user && (
              <Button
                variant={filter === 'my' ? 'default' : 'outline'}
                onClick={() => setFilter('my')}
                className={filter === 'my' ? 'bg-gradient-primary' : ''}
              >
                Meus Projetos
              </Button>
            )}
          </div>

          {/* Projects Grid */}
          {projects.length === 0 ? (
            <Card className="p-12 bg-card/50 backdrop-blur-sm border-2">
              <div className="text-center space-y-4">
                <Briefcase className="w-16 h-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-xl font-bold mb-2">Nenhum projeto encontrado</h3>
                  <p className="text-muted-foreground">
                    {filter === 'my' 
                      ? 'Você ainda não criou nenhum projeto' 
                      : 'Não há projetos disponíveis no momento'}
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <div className="grid gap-6">
              {projects.map((project) => (
                <Card 
                  key={project.id} 
                  className="hover:shadow-elegant transition-all duration-300 bg-card/50 backdrop-blur-sm border-2 hover:border-primary/50"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-2xl">{project.title}</CardTitle>
                          {project.category && (
                            <Badge variant="secondary" className="bg-gradient-secondary">
                              {project.category}
                            </Badge>
                          )}
                          <Badge 
                            variant={project.status === 'open' ? 'default' : 'outline'}
                            className={project.status === 'open' ? 'bg-accent' : ''}
                          >
                            {project.status === 'open' ? 'Aberto' : 
                             project.status === 'in_progress' ? 'Em andamento' : 
                             project.status === 'completed' ? 'Concluído' : 'Cancelado'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Por {project.profiles.full_name} (@{project.profiles.username})
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-foreground leading-relaxed">
                      {project.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-primary" />
                        <span className="font-medium">{formatBudget(project.budget_min, project.budget_max)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span>{formatDate(project.deadline)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-primary" />
                        <span>{project.proposals_count} proposta{project.proposals_count !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    <Button asChild className="w-full bg-gradient-primary hover:shadow-glow transition-all">
                      <Link to={`/projects/${project.id}`}>
                        Ver Detalhes e Enviar Proposta
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
}