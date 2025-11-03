import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Loader2, Lightbulb, Target, Shield, Lock, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RichTextEditor } from '@/components/RichTextEditor';
import { cn } from '@/lib/utils';

export default function ProjectEdit() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budgetRange, setBudgetRange] = useState('');
  const [deadline, setDeadline] = useState('');
  const [profileId, setProfileId] = useState('');
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  const tips = [
    {
      icon: Lightbulb,
      title: "Seja específico no título",
      description: "Use palavras-chave que descrevam exatamente o que você precisa.",
      color: "text-amber-600"
    },
    {
      icon: Target,
      title: "Defina objetivos claros",
      description: "Explique o que você espera receber ao final do projeto.",
      color: "text-blue-600"
    },
    {
      icon: Shield,
      title: "Pagamento 100% seguro",
      description: "O valor só é liberado para o freelancer após você confirmar a conclusão.",
      color: "text-green-600"
    },
    {
      icon: Lock,
      title: "Proteção garantida",
      description: "Seu dinheiro fica retido com segurança na plataforma.",
      color: "text-purple-600"
    },
    {
      icon: MessageCircle,
      title: "Mantenha comunicação clara",
      description: "Responda rapidamente às dúvidas dos freelancers.",
      color: "text-cyan-600"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tips.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [tips.length]);

  useEffect(() => {
    loadProject();
  }, [id, user]);

  const loadProject = async () => {
    if (!user || !id) {
      toast({
        title: 'Erro',
        description: 'Usuário não autenticado',
        variant: 'destructive',
      });
      navigate('/projetos');
      return;
    }

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        toast({
          title: 'Erro',
          description: 'Perfil não encontrado',
          variant: 'destructive',
        });
        navigate('/projetos');
        return;
      }

      setProfileId(profile.id);

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (projectError) throw projectError;

      if (project.profile_id !== profile.id) {
        toast({
          title: 'Acesso negado',
          description: 'Você não tem permissão para editar este projeto',
          variant: 'destructive',
        });
        navigate('/projetos');
        return;
      }

      setTitle(project.title || '');
      setDescription(project.description || '');
      
      // Converter budget_min/max para budgetRange
      if (project.budget_min !== null && project.budget_max !== null) {
        if (project.budget_max <= 300) {
          setBudgetRange('low');
        } else if (project.budget_max <= 800) {
          setBudgetRange('medium');
        } else if (project.budget_max <= 2000) {
          setBudgetRange('high');
        } else {
          setBudgetRange('premium');
        }
      }
      
      // Converter deadline de data para dias
      if (project.deadline) {
        const deadlineDate = new Date(project.deadline);
        const today = new Date();
        const diffTime = deadlineDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setDeadline(diffDays > 0 ? diffDays.toString() : '7');
      }
    } catch (error: any) {
      console.error('Error loading project:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o projeto',
        variant: 'destructive',
      });
      navigate('/projetos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    
    try {
      let budgetMin = null;
      let budgetMax = null;
      
      if (budgetRange === 'low') {
        budgetMin = 0;
        budgetMax = 300;
      } else if (budgetRange === 'medium') {
        budgetMin = 300;
        budgetMax = 800;
      } else if (budgetRange === 'high') {
        budgetMin = 800;
        budgetMax = 2000;
      } else if (budgetRange === 'premium') {
        budgetMin = 2000;
        budgetMax = null;
      }

      let deadlineDate = null;
      if (deadline) {
        const days = parseInt(deadline);
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);
        deadlineDate = futureDate.toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('projects')
        .update({
          title: title.trim(),
          description: description.trim(),
          budget_min: budgetMin,
          budget_max: budgetMax,
          deadline: deadlineDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso!',
        description: 'Projeto atualizado com sucesso',
      });
      
      navigate(`/projetos/${id}`);
    } catch (error: any) {
      console.error('Error updating project:', error);
      toast({
        title: 'Erro ao atualizar projeto',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center max-w-woorkins">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Carregando projeto...</p>
        </div>
      </div>
    );
  }

  const currentTip = tips[currentTipIndex];
  const TipIcon = currentTip.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/projetos/${id}`}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
        </div>

        <div className="grid lg:grid-cols-[1fr,320px] gap-6">
          {/* Card principal */}
          <div className="bg-card/50 backdrop-blur-sm border-2 rounded-lg shadow-xl overflow-hidden">
            {/* Header com gradiente azul/teal */}
            <div className="bg-gradient-to-r from-blue-900 via-teal-700 to-blue-900 p-6 border-b">
              <h1 className="text-2xl font-bold text-white mb-2">Editar Projeto</h1>
              <p className="text-blue-100 text-sm">
                Atualize as informações do seu projeto
              </p>
            </div>

            {/* Conteúdo */}
            <div className="p-6 bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-background">
              <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
                {/* Título */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-base font-semibold">
                    Título do Projeto *
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Preciso de um designer gráfico"
                    required
                    maxLength={100}
                    className="text-base"
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Use palavras-chave claras e objetivas
                    </span>
                    <span className={cn(
                      "font-medium",
                      title.length > 80 && "text-amber-600",
                      title.length === 100 && "text-red-600"
                    )}>
                      {title.length}/100
                    </span>
                  </div>
                </div>

                {/* Descrição */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-base font-semibold">
                    Descrição do Projeto *
                  </Label>
                  <RichTextEditor
                    value={description}
                    onChange={setDescription}
                    placeholder="Descreva detalhadamente o que você precisa. Inclua:&#10;• Objetivos do projeto&#10;• Requisitos específicos&#10;• Entregáveis esperados&#10;• Qualquer informação relevante"
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Quanto mais detalhes, melhores propostas você receberá
                    </span>
                    <span className={cn(
                      "font-medium",
                      description.length > 4500 && "text-amber-600",
                      description.length === 5000 && "text-red-600"
                    )}>
                      {description.length}/5000
                    </span>
                  </div>
                </div>

                {/* Orçamento */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Faixa de Orçamento</Label>
                  <RadioGroup value={budgetRange} onValueChange={setBudgetRange}>
                    <div className="grid gap-3">
                      <div className="flex items-center space-x-3 bg-muted/30 p-4 rounded-lg border-2 border-transparent hover:border-primary/30 transition-colors">
                        <RadioGroupItem value="low" id="low" />
                        <Label htmlFor="low" className="flex-1 cursor-pointer font-normal">
                          <div className="font-semibold">Até R$300</div>
                          <div className="text-xs text-muted-foreground">Projetos pequenos e rápidos</div>
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-3 bg-muted/30 p-4 rounded-lg border-2 border-transparent hover:border-primary/30 transition-colors">
                        <RadioGroupItem value="medium" id="medium" />
                        <Label htmlFor="medium" className="flex-1 cursor-pointer font-normal">
                          <div className="font-semibold">R$300 a R$800</div>
                          <div className="text-xs text-muted-foreground">Projetos de médio porte</div>
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-3 bg-muted/30 p-4 rounded-lg border-2 border-transparent hover:border-primary/30 transition-colors">
                        <RadioGroupItem value="high" id="high" />
                        <Label htmlFor="high" className="flex-1 cursor-pointer font-normal">
                          <div className="font-semibold">R$800 a R$2.000</div>
                          <div className="text-xs text-muted-foreground">Projetos complexos</div>
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-3 bg-muted/30 p-4 rounded-lg border-2 border-transparent hover:border-primary/30 transition-colors">
                        <RadioGroupItem value="premium" id="premium" />
                        <Label htmlFor="premium" className="flex-1 cursor-pointer font-normal">
                          <div className="font-semibold">Acima de R$2.000</div>
                          <div className="text-xs text-muted-foreground">Projetos premium e de longa duração</div>
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {/* Prazo */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Prazo de Entrega</Label>
                  <RadioGroup value={deadline} onValueChange={setDeadline}>
                    <div className="grid gap-3">
                      <div className="flex items-center space-x-3 bg-muted/30 p-3 rounded-lg border-2 border-transparent hover:border-primary/30 transition-colors">
                        <RadioGroupItem value="7" id="7days" />
                        <Label htmlFor="7days" className="flex-1 cursor-pointer font-normal">
                          7 dias
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-3 bg-muted/30 p-3 rounded-lg border-2 border-transparent hover:border-primary/30 transition-colors">
                        <RadioGroupItem value="15" id="15days" />
                        <Label htmlFor="15days" className="flex-1 cursor-pointer font-normal">
                          15 dias
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-3 bg-muted/30 p-3 rounded-lg border-2 border-transparent hover:border-primary/30 transition-colors">
                        <RadioGroupItem value="30" id="30days" />
                        <Label htmlFor="30days" className="flex-1 cursor-pointer font-normal">
                          30 dias
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-3 bg-muted/30 p-3 rounded-lg border-2 border-transparent hover:border-primary/30 transition-colors">
                        <RadioGroupItem value="60" id="60days" />
                        <Label htmlFor="60days" className="flex-1 cursor-pointer font-normal">
                          60 dias ou mais
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {/* Botões */}
                <div className="flex gap-4 pt-4">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-semibold py-6"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5 mr-2" />
                        Salvar Alterações
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(`/projetos/${id}`)}
                    className="px-8"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar com dicas */}
          <div className="space-y-4">
            {/* Dica rotativa */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 p-6 rounded-lg border-2 border-amber-200/50 dark:border-amber-800/50 shadow-lg">
              <div className="flex items-start gap-3 mb-3">
                <div className={cn(
                  "p-2 rounded-lg bg-white dark:bg-slate-900 shadow-sm",
                  currentTip.color
                )}>
                  <TipIcon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-sm mb-1">{currentTip.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {currentTip.description}
                  </p>
                </div>
              </div>
              <div className="flex gap-1 justify-center mt-4">
                {tips.map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      "h-1 rounded-full transition-all",
                      index === currentTipIndex 
                        ? "w-8 bg-amber-600" 
                        : "w-1 bg-amber-300"
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Card de segurança */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 p-6 rounded-lg border-2 border-green-200/50 dark:border-green-800/50">
              <div className="flex items-start gap-3 mb-3">
                <Shield className="w-6 h-6 text-green-600 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-sm mb-2 text-green-900 dark:text-green-100">
                    Proteção Total
                  </h3>
                  <ul className="space-y-2 text-xs text-green-800 dark:text-green-200">
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-green-600 mt-1.5 flex-shrink-0"></div>
                      <span>Pagamento retido com segurança</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-green-600 mt-1.5 flex-shrink-0"></div>
                      <span>Liberado só após conclusão</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-green-600 mt-1.5 flex-shrink-0"></div>
                      <span>Suporte disponível 24/7</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
