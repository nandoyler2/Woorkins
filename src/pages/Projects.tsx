import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Briefcase, Calendar, DollarSign, MessageSquare, Heart, Clock, Filter, ChevronDown, AlertCircle, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

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

const BUDGET_RANGES = [
  { label: 'Até R$ 500', min: 0, max: 500 },
  { label: 'R$ 500 - R$ 1.000', min: 500, max: 1000 },
  { label: 'R$ 1.000 - R$ 3.000', min: 1000, max: 3000 },
  { label: 'R$ 3.000 - R$ 5.000', min: 3000, max: 5000 },
  { label: 'Acima de R$ 5.000', min: 5000, max: null },
];

export default function Projects() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'my'>('open');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportingProject, setReportingProject] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');

  useEffect(() => {
    loadProjects();
  }, [filter, user, selectedCategories, selectedBudget, sortBy, searchQuery]);

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
        `);

      // Filtro de status
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

      // Filtro de categorias
      if (selectedCategories.length > 0) {
        query = query.in('category', selectedCategories);
      }

      // Filtro de orçamento
      if (selectedBudget) {
        const budget = BUDGET_RANGES.find(b => b.label === selectedBudget);
        if (budget) {
          if (budget.max) {
            query = query.gte('budget_max', budget.min).lte('budget_min', budget.max);
          } else {
            query = query.gte('budget_max', budget.min);
          }
        }
      }

      // Ordenação
      if (sortBy === 'recent') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'budget_high') {
        query = query.order('budget_max', { ascending: false, nullsFirst: false });
      } else if (sortBy === 'budget_low') {
        query = query.order('budget_min', { ascending: true, nullsFirst: false });
      } else if (sortBy === 'proposals') {
        query = query.order('proposals_count', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Filtro de busca no frontend
      let filteredData = (data || []) as unknown as Project[];
      if (searchQuery) {
        filteredData = filteredData.filter(p => 
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      setProjects(filteredData);
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

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const created = new Date(date);
    const diffInHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Há poucos minutos';
    if (diffInHours < 24) return `Há ${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Há 1 dia';
    if (diffInDays < 30) return `Há ${diffInDays} dias`;
    const diffInMonths = Math.floor(diffInDays / 30);
    return `Há ${diffInMonths} ${diffInMonths === 1 ? 'mês' : 'meses'}`;
  };

  const getInitials = (fullName: string) => {
    const names = fullName.trim().split(' ').filter(n => n.length > 0);
    if (names.length === 0) return '';
    if (names.length === 1) return names[0];
    
    // Primeiro nome completo + iniciais dos sobrenomes (exceto preposições)
    const firstName = names[0];
    const lastNames = names.slice(1)
      .filter(name => name.length > 2) // Remove preposições (de, da, do, dos, das, etc)
      .map(name => name.charAt(0).toUpperCase() + '.')
      .join(' ');
    return lastNames ? `${firstName} ${lastNames}` : firstName;
  };

  const toggleFavorite = (projectId: string) => {
    setFavorites(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleReport = async () => {
    if (!user || !reportingProject) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para denunciar',
        variant: 'destructive',
      });
      return;
    }

    if (!reportReason.trim()) {
      toast({
        title: 'Erro',
        description: 'Selecione um motivo para a denúncia',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Get user profile ID
      const { data: profileData } = await supabase
        .from('profiles' as any)
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profileData) throw new Error('Profile not found');

      const { error } = await supabase
        .from('reports' as any)
        .insert({
          reporter_id: (profileData as any).id,
          content_type: 'project',
          content_id: reportingProject,
          reason: reportReason,
          description: reportDescription.trim() || null
        });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Conteúdo denunciado com sucesso. Nossa equipe irá analisar.',
      });

      setReportDialogOpen(false);
      setReportingProject(null);
      setReportReason('');
      setReportDescription('');
    } catch (error) {
      console.error('Error reporting project:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a denúncia',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      <Header />
      
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Encontre Trabalho
            </h1>
            <p className="text-muted-foreground mt-1">
              {projects.length} projeto{projects.length !== 1 ? 's' : ''} disponíve{projects.length !== 1 ? 'is' : 'l'}
            </p>
          </div>
          {user && (
            <Button asChild className="bg-gradient-primary hover:opacity-90 shadow-glow">
              <Link to="/projects/new">
                <Plus className="w-4 h-4 mr-2" />
                Criar Projeto
              </Link>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Filtros */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <CardTitle className="text-lg">Filtros</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Busca */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Buscar</Label>
                  <Input
                    placeholder="Buscar projetos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9"
                  />
                </div>

                <Separator />

                {/* Categorias */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Categoria</Label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {CATEGORIES.map((category) => (
                      <div key={category} className="flex items-center space-x-2">
                        <Checkbox
                          id={category}
                          checked={selectedCategories.includes(category)}
                          onCheckedChange={() => toggleCategory(category)}
                        />
                        <Label
                          htmlFor={category}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {category}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Orçamento */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Orçamento</Label>
                  <Select value={selectedBudget} onValueChange={setSelectedBudget}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {BUDGET_RANGES.map((range) => (
                        <SelectItem key={range.label} value={range.label}>
                          {range.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Limpar filtros */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSelectedCategories([]);
                    setSelectedBudget('');
                    setSearchQuery('');
                  }}
                >
                  Limpar Filtros
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-4">
            {/* Tabs e Ordenação */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex gap-2">
                <Button
                  variant={filter === 'all' ? 'default' : 'ghost'}
                  onClick={() => setFilter('all')}
                  size="sm"
                  className={filter === 'all' ? 'bg-gradient-primary' : ''}
                >
                  Todos
                </Button>
                <Button
                  variant={filter === 'open' ? 'default' : 'ghost'}
                  onClick={() => setFilter('open')}
                  size="sm"
                  className={filter === 'open' ? 'bg-gradient-primary' : ''}
                >
                  Abertos
                </Button>
                {user && (
                  <Button
                    variant={filter === 'my' ? 'default' : 'ghost'}
                    onClick={() => setFilter('my')}
                    size="sm"
                    className={filter === 'my' ? 'bg-gradient-primary' : ''}
                  >
                    Meus Projetos
                  </Button>
                )}
              </div>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Mais recentes</SelectItem>
                  <SelectItem value="budget_high">Maior orçamento</SelectItem>
                  <SelectItem value="budget_low">Menor orçamento</SelectItem>
                  <SelectItem value="proposals">Mais propostas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Projects List */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : projects.length === 0 ? (
              <Card className="p-12">
                <div className="text-center space-y-4">
                  <Briefcase className="w-16 h-16 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="text-xl font-bold mb-2">Nenhum projeto encontrado</h3>
                    <p className="text-muted-foreground">
                      {filter === 'my' 
                        ? 'Você ainda não criou nenhum projeto' 
                        : 'Tente ajustar os filtros ou volte mais tarde'}
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {projects.map((project) => (
                  <Card 
                    key={project.id} 
                    className="hover:shadow-elegant transition-all duration-300 hover:border-primary/50 bg-card/50 backdrop-blur-sm"
                  >
                    <CardContent className="p-6">
                      {/* Header Row: Title + Action Button */}
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <Link 
                            to={`/projects/${project.id}`}
                            className="text-xl font-bold hover:text-primary transition-colors block mb-2"
                          >
                            {project.title}
                          </Link>
                        </div>
                        <Button 
                          asChild 
                          size="sm" 
                          variant="outline"
                          className="border-primary text-primary hover:bg-primary hover:text-white flex-shrink-0"
                        >
                          <Link to={`/projects/${project.id}`}>
                            Fazer uma proposta
                          </Link>
                        </Button>
                      </div>

                      {/* Meta Info Row */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mb-4">
                        <span>Publicado: {getTimeAgo(project.created_at)}</span>
                        <span>Propostas: {project.proposals_count}</span>
                        {project.deadline && (
                          <span>Prazo: {formatDate(project.deadline)}</span>
                        )}
                        <div className="ml-auto flex items-center gap-2 text-primary font-semibold text-base">
                          <DollarSign className="w-4 h-4" />
                          {formatBudget(project.budget_min, project.budget_max)}
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-foreground mb-4 leading-relaxed line-clamp-3">
                        {project.description}
                      </p>

                      {/* Category */}
                      {project.category && (
                        <div className="mb-4">
                          <p className="text-sm mb-1">
                            <span className="font-semibold">Categoria:</span> {project.category}
                          </p>
                        </div>
                      )}

                      {/* Tags/Skills - Placeholder */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {project.category && (
                          <Badge variant="secondary" className="bg-muted">
                            {project.category}
                          </Badge>
                        )}
                      </div>

                      {/* Footer Row: Client Info + Report Button */}
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="flex items-center gap-4">
                          {/* Client Avatar + Info */}
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                              {project.profiles.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="text-sm">
                              <p className="font-medium">{getInitials(project.profiles.full_name)}</p>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <span>Última resposta: {getTimeAgo(project.created_at)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Star Rating - Placeholder */}
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                        </div>

                        {/* Report Button */}
                        <Dialog open={reportDialogOpen && reportingProject === project.id} onOpenChange={(open) => {
                          setReportDialogOpen(open);
                          if (!open) {
                            setReportingProject(null);
                            setReportReason('');
                            setReportDescription('');
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                setReportingProject(project.id);
                                setReportDialogOpen(true);
                              }}
                            >
                              <AlertCircle className="w-4 h-4 mr-2" />
                              Denunciar
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Denunciar Conteúdo Inadequado</DialogTitle>
                              <DialogDescription>
                                Ajude-nos a manter a comunidade segura. Sua denúncia será analisada pela nossa equipe.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="reason" className="text-sm font-semibold mb-2 block">
                                  Motivo *
                                </Label>
                                <Select value={reportReason} onValueChange={setReportReason}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o motivo" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="spam">Spam ou propaganda</SelectItem>
                                    <SelectItem value="inappropriate">Conteúdo inapropriado</SelectItem>
                                    <SelectItem value="fake">Projeto falso ou fraudulento</SelectItem>
                                    <SelectItem value="offensive">Linguagem ofensiva</SelectItem>
                                    <SelectItem value="violation">Viola termos de uso</SelectItem>
                                    <SelectItem value="other">Outro</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label htmlFor="description" className="text-sm font-semibold mb-2 block">
                                  Descrição (opcional)
                                </Label>
                                <Textarea
                                  id="description"
                                  value={reportDescription}
                                  onChange={(e) => setReportDescription(e.target.value)}
                                  placeholder="Adicione mais detalhes sobre o problema..."
                                  rows={4}
                                />
                              </div>

                              <div className="flex gap-2 pt-2">
                                <Button
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => {
                                    setReportDialogOpen(false);
                                    setReportingProject(null);
                                    setReportReason('');
                                    setReportDescription('');
                                  }}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  className="flex-1 bg-gradient-primary"
                                  onClick={handleReport}
                                  disabled={!reportReason}
                                >
                                  Enviar Denúncia
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}