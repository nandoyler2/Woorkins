import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ChevronRight, ChevronLeft, CheckCircle2, FileText, DollarSign, Calendar as CalendarIcon, Eye, X, Shield, Lock, Lightbulb, Target, MessageCircle, Clock, Bold, Italic } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useDocumentVerification } from '@/hooks/useDocumentVerification';
import { RequireDocumentVerificationDialog } from '@/components/RequireDocumentVerificationDialog';
import { RequireProfilePhotoDialog } from '@/components/RequireProfilePhotoDialog';
import { analyzeProject } from '@/lib/projectAnalyzer';
import { validateProject } from '@/lib/projectValidation';
import { MarkdownText } from '@/lib/markdownUtils';
import { RichTextEditor } from '@/components/RichTextEditor';

export default function ProjectCreate() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [creating, setCreating] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budgetRange, setBudgetRange] = useState('');
  const [deadline, setDeadline] = useState('');
  
  // Estados para categoria e tags detectadas automaticamente
  const [detectedCategory, setDetectedCategory] = useState('');
  const [detectedTags, setDetectedTags] = useState<string[]>([]);
  const [profileId, setProfileId] = useState<string>('');
  const [registeredName, setRegisteredName] = useState('');
  const [registeredCPF, setRegisteredCPF] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [isCheckingRequirements, setIsCheckingRequirements] = useState(true);

  // Estados para validação visual
  const [titleError, setTitleError] = useState(false);
  const [descriptionError, setDescriptionError] = useState(false);
  const [budgetError, setBudgetError] = useState(false);
  
  // Estados para validação do projeto
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  
  // Estado para dicas rotativas
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  
  // Ref para scroll até a seção de erros
  const errorSectionRef = useRef<HTMLDivElement>(null);

  const tips = [
    {
      icon: Lightbulb,
      title: "Seja específico no título",
      description: "Use palavras-chave que descrevam exatamente o que você precisa. Isso ajuda os freelancers certos a encontrarem seu projeto.",
      color: "text-amber-600"
    },
    {
      icon: Target,
      title: "Defina objetivos claros",
      description: "Explique o que você espera receber ao final do projeto. Quanto mais claro, melhor será o resultado.",
      color: "text-blue-600"
    },
    {
      icon: Shield,
      title: "Pagamento 100% seguro",
      description: "O valor só é liberado para o freelancer após você confirmar que o trabalho foi concluído conforme o combinado.",
      color: "text-green-600"
    },
    {
      icon: Lock,
      title: "Proteção garantida",
      description: "Seu dinheiro fica retido com segurança na plataforma até a conclusão satisfatória do projeto.",
      color: "text-purple-600"
    },
    {
      icon: MessageCircle,
      title: "Mantenha comunicação clara",
      description: "Responda rapidamente às dúvidas dos freelancers. Uma boa comunicação resulta em melhores entregas.",
      color: "text-cyan-600"
    },
    {
      icon: Clock,
      title: "Prazo realista",
      description: "Defina prazos que deem tempo suficiente para um trabalho de qualidade. Pressa nem sempre resulta no melhor trabalho.",
      color: "text-orange-600"
    },
    {
      icon: FileText,
      title: "Inclua referências",
      description: "Se possível, adicione links ou exemplos do que você imagina. Referências visuais ajudam muito na compreensão.",
      color: "text-pink-600"
    },
    {
      icon: CheckCircle2,
      title: "Avalie as propostas com atenção",
      description: "Não escolha apenas pelo preço. Analise o portfólio, experiência e avaliações dos freelancers antes de decidir.",
      color: "text-teal-600"
    }
  ];

  // Rotação automática de dicas a cada 5 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tips.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [tips.length]);

  const { isVerified, isLoading: isCheckingVerification } = useDocumentVerification(profileId);

  useEffect(() => {
    document.title = 'Criar Projeto - Woorkins';
    
    // Carregar rascunho do localStorage
    const draft = localStorage.getItem('projectDraft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setTitle(parsed.title || '');
        setDescription(parsed.description || '');
        setBudgetRange(parsed.budgetRange || '');
        setDeadline(parsed.deadline || '');
      } catch (e) {
        console.error('Erro ao carregar rascunho:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (isVerified && showVerificationDialog) {
      setShowVerificationDialog(false);
    }
  }, [isVerified, showVerificationDialog]);

  useEffect(() => {
    const checkRequirements = async () => {
      if (!user) {
        setIsCheckingRequirements(false);
        return;
      }
      
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, cpf, avatar_url, document_verified')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setProfileId(data.id);
        setRegisteredName(data.full_name || '');
        setRegisteredCPF(data.cpf || '');
        setAvatarUrl(data.avatar_url);
        
        if (!data.avatar_url) {
          setShowPhotoDialog(true);
        } else if (!data.document_verified) {
          setShowVerificationDialog(true);
        }
      }
      
      setIsCheckingRequirements(false);
    };

    checkRequirements();
  }, [user]);

  // Analisa automaticamente quando título ou descrição mudam
  useEffect(() => {
    if (title.trim() && description.trim()) {
      const analysis = analyzeProject(title, description);
      // Agora retorna arrays
      setDetectedCategory(analysis.categories.join(', ')); // Converte para string para exibição
      setDetectedTags(analysis.tags);
    } else {
      setDetectedCategory('');
      setDetectedTags([]);
    }
  }, [title, description]);

  // Salvar rascunho no localStorage sempre que houver mudanças
  useEffect(() => {
    const draft = {
      title,
      description,
      budgetRange,
      deadline
    };
    localStorage.setItem('projectDraft', JSON.stringify(draft));
  }, [title, description, budgetRange, deadline]);

  // Scroll automático para a seção de erros quando houver validação
  useEffect(() => {
    if (validationErrors.length > 0 && errorSectionRef.current) {
      errorSectionRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }, [validationErrors]);

  const nextStep = () => {
    if (currentStep === 1) {
      if (!title.trim()) {
        setTitleError(true);
        setTimeout(() => setTitleError(false), 2000);
        return;
      }
      if (!description.trim()) {
        setDescriptionError(true);
        setTimeout(() => setDescriptionError(false), 2000);
        return;
      }
    }
    
    if (currentStep === 2 && !budgetRange) {
      setBudgetError(true);
      setTimeout(() => setBudgetError(false), 2000);
      return;
    }
    
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Validar o projeto antes de prosseguir
    const validation = validateProject(title, description);
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setValidationWarnings(validation.warnings);
      
      toast({
        title: '⚠️ Corrija os problemas para publicar',
        description: 'Seu projeto precisa de alguns ajustes.',
        variant: 'destructive',
      });
      
      return;
    }
    
    // Se tiver apenas avisos, mostrar mas permitir publicação
    if (validation.warnings.length > 0) {
      setValidationWarnings(validation.warnings);
    }
    
    // Limpar erros anteriores
    setValidationErrors([]);

    if (!avatarUrl) {
      setShowPhotoDialog(true);
      return;
    }

    if (!isVerified) {
      setShowVerificationDialog(true);
      return;
    }

    setCreating(true);

    try {
      const { data: profileData } = await supabase
        .from('profiles' as any)
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profileData) {
        throw new Error('Perfil não encontrado');
      }

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

      // Calcular data de deadline baseada no número de dias
      let deadlineDate = null;
      if (deadline) {
        const days = parseInt(deadline);
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);
        deadlineDate = futureDate.toISOString().split('T')[0]; // Formato YYYY-MM-DD
      }

      // Converter a string de categorias em array
      const categoriesArray = detectedCategory 
        ? detectedCategory.split(',').map(c => c.trim())
        : ['Outro'];

      const { data, error } = await supabase
        .from('projects' as any)
        .insert({
          profile_id: (profileData as any).id,
          title,
          description,
          category: categoriesArray[0] || 'Outro', // Mantém compatibilidade com coluna antiga
          categories: categoriesArray, // Nova coluna de array
          skills: detectedTags, // Nova coluna de skills/tags
          budget_min: budgetMin,
          budget_max: budgetMax,
          deadline: deadlineDate,
        })
        .select()
        .single();

      if (error) throw error;

      // Limpar rascunho do localStorage após publicação bem-sucedida
      localStorage.removeItem('projectDraft');
      
      toast({
        title: 'Projeto criado!',
        description: 'Seu projeto foi publicado com sucesso.',
      });

      navigate(`/projetos/${(data as any).id}`);
    } catch (error: any) {
      toast({
        title: 'Erro ao criar projeto',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const steps = [
    { number: 1, title: 'Informações', icon: FileText },
    { number: 2, title: 'Orçamento', icon: DollarSign },
    { number: 3, title: 'Revisão', icon: Eye },
  ];

  const getBudgetRangeText = () => {
    switch (budgetRange) {
      case 'low': return 'Até R$300';
      case 'medium': return 'R$300 a R$800';
      case 'high': return 'R$800 a R$2.000';
      case 'premium': return 'Acima de R$2.000';
      default: return 'Não definido';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center max-w-woorkins">
          <h1 className="text-4xl font-bold mb-4">Acesso negado</h1>
          <p className="text-muted-foreground mb-8">
            Você precisa estar logado para criar um projeto
          </p>
          <Button asChild className="bg-gradient-primary">
            <Link to="/auth">Fazer Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isCheckingRequirements) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="bg-card/50 backdrop-blur-sm border-2 rounded-lg p-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-muted-foreground">Verificando requisitos...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/projetos">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
        </div>

        <div className="grid lg:grid-cols-[1fr,320px] gap-6">
          {/* Card principal */}
          <div className="bg-card/50 backdrop-blur-sm border-2 rounded-lg shadow-xl overflow-hidden">
            {/* Header com gradiente azul/teal */}
            <div className="bg-gradient-to-r from-blue-900 via-teal-700 to-blue-900 p-6 border-b">
              <h1 className="text-2xl font-bold text-white mb-2">Criar Novo Projeto</h1>
              <p className="text-blue-100 text-sm">
                Preencha as informações e receba propostas de freelancers qualificados
              </p>
            </div>

            {/* Indicador de etapas */}
            <div className="bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-background p-6 border-b">
              <div className="flex items-center justify-between max-w-2xl mx-auto">
                {steps.map((step, index) => {
                  const StepIcon = step.icon;
                  const isActive = currentStep === step.number;
                  const isCompleted = currentStep > step.number;
                  
                  return (
                    <div key={step.number} className="flex items-center flex-1">
                      <div className="flex flex-col items-center flex-1">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                            isActive && "bg-gradient-to-r from-blue-600 to-teal-600 border-blue-600 text-white scale-110",
                            isCompleted && "bg-gradient-to-r from-green-600 to-emerald-600 border-green-600 text-white",
                            !isActive && !isCompleted && "bg-muted border-muted-foreground/30 text-muted-foreground"
                          )}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <StepIcon className="w-5 h-5" />
                          )}
                        </div>
                        <span
                          className={cn(
                            "text-xs font-medium mt-2 text-center",
                            isActive && "text-blue-600 dark:text-blue-400 font-bold",
                            isCompleted && "text-green-600 dark:text-green-400",
                            !isActive && !isCompleted && "text-muted-foreground"
                          )}
                        >
                          {step.title}
                        </span>
                      </div>
                      {index < steps.length - 1 && (
                        <div
                          className={cn(
                            "h-[2px] flex-1 mx-2 transition-all",
                            isCompleted ? "bg-gradient-to-r from-green-600 to-emerald-600" : "bg-muted"
                          )}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Conteúdo das etapas */}
            <div className="p-6 bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-background min-h-[400px]">
              {currentStep === 1 && (
                <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-base font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        Título do Projeto *
                      </span>
                      <span className={cn(
                        "text-xs font-normal",
                        title.length < 10 ? "text-red-600 dark:text-red-400" :
                        title.length > 80 ? "text-red-600 dark:text-red-400" :
                        "text-muted-foreground"
                      )}>
                        {title.length}/80
                      </span>
                    </Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => {
                        if (e.target.value.length <= 80) {
                          setTitle(e.target.value);
                        }
                        if (titleError) setTitleError(false);
                      }}
                      placeholder="Ex: Desenvolvimento de site institucional"
                      maxLength={80}
                      className={cn(
                        "h-12 text-base border-blue-200 focus:border-blue-600 dark:border-blue-800 transition-all",
                        titleError && "border-red-500 dark:border-red-500 animate-shake bg-red-50 dark:bg-red-950/20",
                        title.length > 80 && "border-red-500 dark:border-red-500"
                      )}
                    />
                    {titleError ? (
                      <p className="text-sm text-red-600 dark:text-red-400 font-medium animate-pulse">
                        ⚠️ Por favor, preencha o título do projeto
                      </p>
                    ) : title.length < 10 ? (
                      <p className="text-xs text-muted-foreground">
                        Mínimo de 10 caracteres (faltam {10 - title.length})
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-base font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        Descrição do Projeto *
                      </span>
                      <span className={cn(
                        "text-xs font-normal",
                        description.length < 30 ? "text-red-600 dark:text-red-400" :
                        description.length > 2000 ? "text-red-600 dark:text-red-400" :
                        "text-muted-foreground"
                      )}>
                        {description.length}/2.000
                      </span>
                    </Label>
                    
                    {/* Botões de formatação */}
                    <div className="flex gap-2 mb-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const editor = document.getElementById('description');
                          if (!editor) return;
                          
                          const selection = window.getSelection();
                          if (!selection || selection.rangeCount === 0) return;
                          
                          const range = selection.getRangeAt(0);
                          const selectedText = range.toString();
                          
                          if (selectedText) {
                            const formattedText = `**${selectedText}**`;
                            range.deleteContents();
                            range.insertNode(document.createTextNode(formattedText));
                            
                            // Trigger input event to update state
                            editor.dispatchEvent(new Event('input', { bubbles: true }));
                          }
                        }}
                        className="h-8"
                      >
                        <Bold className="w-3 h-3 mr-1" />
                        Negrito
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const editor = document.getElementById('description');
                          if (!editor) return;
                          
                          const selection = window.getSelection();
                          if (!selection || selection.rangeCount === 0) return;
                          
                          const range = selection.getRangeAt(0);
                          const selectedText = range.toString();
                          
                          if (selectedText) {
                            const formattedText = `*${selectedText}*`;
                            range.deleteContents();
                            range.insertNode(document.createTextNode(formattedText));
                            
                            // Trigger input event to update state
                            editor.dispatchEvent(new Event('input', { bubbles: true }));
                          }
                        }}
                        className="h-8"
                      >
                        <Italic className="w-3 h-3 mr-1" />
                        Itálico
                      </Button>
                    </div>
                    
                    <RichTextEditor
                      id="description"
                      value={description}
                      onChange={(value) => {
                        setDescription(value);
                        if (descriptionError) setDescriptionError(false);
                      }}
                      placeholder="Descreva em detalhes o que você precisa...

Inclua:
• O que precisa ser feito
• Referências ou exemplos
• Requisitos específicos
• Entregas esperadas"
                      maxLength={2000}
                      className={cn(
                        "text-base border-blue-200 focus:border-blue-600 dark:border-blue-800 transition-all",
                        descriptionError && "border-red-500 dark:border-red-500 animate-shake bg-red-50 dark:bg-red-950/20",
                        description.length > 2000 && "border-red-500 dark:border-red-500"
                      )}
                    />
                    
                    {descriptionError ? (
                      <p className="text-sm text-red-600 dark:text-red-400 font-medium animate-pulse">
                        ⚠️ Por favor, preencha a descrição do projeto
                      </p>
                    ) : description.length < 30 ? (
                      <p className="text-xs text-muted-foreground">
                        Mínimo de 30 caracteres (faltam {30 - description.length})
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        💡 O sistema irá detectar automaticamente a categoria e tags baseado no seu título e descrição
                      </p>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
                  <div className="space-y-4">
                    <Label className={cn(
                      "text-base font-semibold flex items-center gap-2 transition-all",
                      budgetError && "text-red-600 dark:text-red-400"
                    )}>
                      <DollarSign className="w-4 h-4 text-blue-600" />
                      Faixa de Valor do Projeto *
                    </Label>
                    {budgetError && (
                      <p className="text-sm text-red-600 dark:text-red-400 font-medium animate-pulse">
                        ⚠️ Por favor, selecione uma faixa de orçamento
                      </p>
                    )}
                    <RadioGroup 
                      value={budgetRange} 
                      onValueChange={(value) => {
                        setBudgetRange(value);
                        if (budgetError) setBudgetError(false);
                      }} 
                      className={cn(
                        "space-y-3 transition-all",
                        budgetError && "animate-shake"
                      )}
                    >
                      <div className={cn(
                        "flex items-start space-x-3 p-4 rounded-lg border-2 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all cursor-pointer",
                        budgetError && "border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-950/20"
                      )}>
                        <RadioGroupItem value="low" id="low" className="mt-1" />
                        <Label htmlFor="low" className="flex-1 cursor-pointer space-y-1">
                          <div className="font-semibold text-base">Até R$300</div>
                          <div className="text-sm text-muted-foreground">
                            Projetos rápidos e simples
                          </div>
                        </Label>
                      </div>
                      
                      <div className={cn(
                        "flex items-start space-x-3 p-4 rounded-lg border-2 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all cursor-pointer",
                        budgetError && "border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-950/20"
                      )}>
                        <RadioGroupItem value="medium" id="medium" className="mt-1" />
                        <Label htmlFor="medium" className="flex-1 cursor-pointer space-y-1">
                          <div className="font-semibold text-base">R$300 a R$800</div>
                          <div className="text-sm text-muted-foreground">
                            Projetos de média complexidade
                          </div>
                        </Label>
                      </div>
                      
                      <div className={cn(
                        "flex items-start space-x-3 p-4 rounded-lg border-2 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all cursor-pointer",
                        budgetError && "border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-950/20"
                      )}>
                        <RadioGroupItem value="high" id="high" className="mt-1" />
                        <Label htmlFor="high" className="flex-1 cursor-pointer space-y-1">
                          <div className="font-semibold text-base">R$800 a R$2.000</div>
                          <div className="text-sm text-muted-foreground">
                            Projetos completos e detalhados
                          </div>
                        </Label>
                      </div>
                      
                      <div className={cn(
                        "flex items-start space-x-3 p-4 rounded-lg border-2 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all cursor-pointer",
                        budgetError && "border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-950/20"
                      )}>
                        <RadioGroupItem value="premium" id="premium" className="mt-1" />
                        <Label htmlFor="premium" className="flex-1 cursor-pointer space-y-1">
                          <div className="font-semibold text-base">Acima de R$2.000</div>
                          <div className="text-sm text-muted-foreground">
                            Projetos grandes ou personalizados
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                    
                    <div className="flex items-start gap-2 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <span className="text-xl">💡</span>
                      <p className="text-sm text-muted-foreground">
                        Você pode negociar valores diretamente com os freelancers depois.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deadline" className="text-base font-semibold flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-blue-600" />
                      Você precisa do projeto pronto em quantos dias? (Opcional)
                    </Label>
                    <Input
                      id="deadline"
                      type="number"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      placeholder="Ex: 15"
                      min="1"
                      className="h-12 text-base border-blue-200 focus:border-blue-600 dark:border-blue-800"
                    />
                    <p className="text-xs text-muted-foreground">
                      Informe o número de dias até a data de entrega desejada
                    </p>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
                  {/* Feedback de validação */}
                  {validationErrors.length > 0 && (
                    <div 
                      ref={errorSectionRef}
                      className="bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-4 animate-fade-in"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">❌</span>
                        <div className="flex-1">
                          <p className="font-bold text-red-900 dark:text-red-100 mb-2">
                            Não é possível publicar ainda
                          </p>
                          <ul className="space-y-1">
                            {validationErrors.map((error, index) => (
                              <li key={index} className="text-sm text-red-800 dark:text-red-200">
                                • {error}
                              </li>
                            ))}
                          </ul>
                          <p className="text-xs text-red-700 dark:text-red-300 mt-3 font-medium">
                            💡 Volte às etapas anteriores para corrigir os problemas.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {validationWarnings.length > 0 && validationErrors.length === 0 && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-800 rounded-lg p-4 animate-fade-in">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">⚠️</span>
                        <div className="flex-1">
                          <p className="font-bold text-amber-900 dark:text-amber-100 mb-2">
                            Sugestões de melhoria
                          </p>
                          <ul className="space-y-1">
                            {validationWarnings.map((warning, index) => (
                              <li key={index} className="text-sm text-amber-800 dark:text-amber-200">
                                • {warning}
                              </li>
                            ))}
                          </ul>
                          <p className="text-xs text-amber-700 dark:text-amber-300 mt-3">
                            Você pode publicar mesmo assim, mas recomendamos seguir as sugestões para receber propostas melhores.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {validationErrors.length === 0 && validationWarnings.length === 0 && (
                    <div className="bg-green-50 dark:bg-green-950/20 border-2 border-green-200 dark:border-green-800 rounded-lg p-4 animate-fade-in">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">✅</span>
                        <div className="flex-1">
                          <p className="font-bold text-green-900 dark:text-green-100 mb-1">
                            Tudo certo!
                          </p>
                          <p className="text-sm text-green-800 dark:text-green-200">
                            Seu projeto está pronto para ser publicado e começar a receber propostas.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-gradient-to-br from-blue-50 to-teal-50 dark:from-blue-950 dark:to-teal-900 rounded-lg p-6 border-2 border-blue-200 dark:border-blue-800">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-blue-900 dark:text-blue-100">
                      <Eye className="w-5 h-5" />
                      Revise seu projeto
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">Título</p>
                        <p className="text-base">{title}</p>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">Descrição</p>
                        <div className="text-base whitespace-pre-wrap">
                          {description.split(/(\*\*.*?\*\*|\*.*?\*)/).map((part, index) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                              return <strong key={index}>{part.slice(2, -2)}</strong>;
                            } else if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
                              return <em key={index}>{part.slice(1, -1)}</em>;
                            }
                            return <span key={index}>{part}</span>;
                          })}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="edit-category" className="text-sm font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-2 mb-2">
                          Categorias Detectadas
                          <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300">
                            ✨ Automático
                          </Badge>
                        </Label>
                        <Input
                          id="edit-category"
                          value={detectedCategory}
                          onChange={(e) => setDetectedCategory(e.target.value)}
                          placeholder="Ex: Desenvolvimento Web, Design Gráfico, Marketing Digital"
                          className="h-10 text-base bg-white dark:bg-slate-900"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Você pode editar as categorias se necessário (separe por vírgula)
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-2 mb-2">
                          Tags Sugeridas
                          <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300">
                            ✨ Automático
                          </Badge>
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {detectedTags.map((tag, index) => (
                            <div key={tag} className="flex items-center gap-1">
                              <Input
                                value={tag}
                                onChange={(e) => {
                                  const newTags = [...detectedTags];
                                  newTags[index] = e.target.value;
                                  setDetectedTags(newTags);
                                }}
                                className="h-8 w-32 text-sm bg-white dark:bg-slate-900"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setDetectedTags(detectedTags.filter((_, i) => i !== index));
                                }}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                          {detectedTags.length < 5 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setDetectedTags([...detectedTags, ''])}
                              className="h-8"
                            >
                              + Adicionar Tag
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Você pode editar, remover ou adicionar tags (máximo 5)
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">Faixa de Valor</p>
                          <p className="text-base">{getBudgetRangeText()}</p>
                        </div>

                        {deadline && (
                          <div>
                            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">Prazo</p>
                            <p className="text-base">{deadline} dias</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <p className="text-sm text-amber-900 dark:text-amber-100">
                      ⚠️ <strong>Importante:</strong> Após publicar, seu projeto estará visível para todos os freelancers da plataforma.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer com botões de navegação */}
            <div className="bg-slate-100 dark:bg-slate-900 p-6 border-t flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="h-12"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>

              {currentStep < 3 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="h-12 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700"
                >
                  Próximo
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={creating || validationErrors.length > 0}
                  className={cn(
                    "h-12 transition-all",
                    validationErrors.length > 0
                      ? "bg-gray-400 hover:bg-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  )}
                >
                  {creating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Publicando...
                    </>
                  ) : validationErrors.length > 0 ? (
                    <>
                      ❌ Corrija os erros
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Publicar Projeto
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Sidebar de Dicas */}
          <div className="hidden lg:block">
            <div className="sticky top-8 space-y-4">
              {/* Card de dica atual com animação */}
              <div className="bg-gradient-to-br from-blue-50 to-teal-50 dark:from-blue-950 dark:to-teal-900 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-6 shadow-lg animate-fade-in">
                {(() => {
                  const currentTip = tips[currentTipIndex];
                  const TipIcon = currentTip.icon;
                  return (
                    <>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-white dark:bg-slate-900">
                          <TipIcon className={cn("w-6 h-6", currentTip.color)} />
                        </div>
                        <h3 className="font-bold text-lg text-blue-900 dark:text-blue-100">
                          {currentTip.title}
                        </h3>
                      </div>
                      <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                        {currentTip.description}
                      </p>
                    </>
                  );
                })()}

                {/* Indicadores de progresso */}
                <div className="flex gap-1 mt-6">
                  {tips.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentTipIndex(index)}
                      className={cn(
                        "h-1 rounded-full transition-all",
                        index === currentTipIndex 
                          ? "flex-1 bg-blue-600" 
                          : "w-8 bg-blue-300 dark:bg-blue-700"
                      )}
                      aria-label={`Ir para dica ${index + 1}`}
                    />
                  ))}
                </div>
              </div>

              {/* Card de segurança fixo */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-900 border-2 border-green-200 dark:border-green-800 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="w-6 h-6 text-green-600" />
                  <h3 className="font-bold text-base text-green-900 dark:text-green-100">
                    Sua Segurança
                  </h3>
                </div>
                <ul className="space-y-2 text-sm text-green-800 dark:text-green-200">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Pagamento retido com segurança</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Liberação apenas após confirmação</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Suporte dedicado em caso de problemas</span>
                  </li>
                </ul>
              </div>

              {/* Estatísticas */}
              <div className="bg-card border-2 rounded-lg p-6">
                <h3 className="font-bold text-base mb-4">Por que usar o Woorkins?</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Freelancers qualificados</span>
                    <span className="font-bold text-primary">+5.000</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Projetos concluídos</span>
                    <span className="font-bold text-primary">+10.000</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Satisfação média</span>
                    <span className="font-bold text-primary">4.8/5.0</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <RequireProfilePhotoDialog
        open={showPhotoDialog}
        userName={registeredName}
        userId={user?.id || ''}
        context="project"
        onClose={() => {
          setShowPhotoDialog(false);
          navigate(-1);
        }}
        onPhotoUploaded={() => {
          const reloadProfile = async () => {
            const { data } = await supabase
              .from('profiles')
              .select('avatar_url')
              .eq('user_id', user?.id)
              .single();
            
            if (data?.avatar_url) {
              setAvatarUrl(data.avatar_url);
              setShowPhotoDialog(false);
              if (!isVerified) {
                setShowVerificationDialog(true);
              }
            }
          };
          reloadProfile();
        }}
      />

      <RequireDocumentVerificationDialog
        open={showVerificationDialog}
        onOpenChange={(open) => {
          setShowVerificationDialog(open);
          if (!open && !isVerified) {
            navigate('/projetos');
          }
        }}
        profileId={profileId}
        registeredName={registeredName}
        registeredCPF={registeredCPF}
        action="create_project"
      />
    </div>
  );
}
