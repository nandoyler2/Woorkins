import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useDocumentVerification } from '@/hooks/useDocumentVerification';
import { RequireDocumentVerificationDialog } from '@/components/RequireDocumentVerificationDialog';
import { RequireProfilePhotoDialog } from '@/components/RequireProfilePhotoDialog';

export default function ProjectCreate() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [deadline, setDeadline] = useState<Date>();
  const [profileId, setProfileId] = useState<string>('');
  const [registeredName, setRegisteredName] = useState('');
  const [registeredCPF, setRegisteredCPF] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [isCheckingRequirements, setIsCheckingRequirements] = useState(true);

  const { isVerified, isLoading: isCheckingVerification } = useDocumentVerification(profileId);

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
        
        // Verificar requisitos na ordem: foto primeiro, depois documento
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Verificar requisitos novamente antes de enviar
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

      const { data, error } = await supabase
        .from('projects' as any)
        .insert({
          profile_id: (profileData as any).id,
          title,
          description,
          category: category || null,
          budget_min: budgetMin ? parseFloat(budgetMin) : null,
          budget_max: budgetMax ? parseFloat(budgetMax) : null,
          deadline: deadline ? format(deadline, 'yyyy-MM-dd') : null,
        })
        .select()
        .single();

      if (error) throw error;

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
            <Link to="/autenticacao">Fazer Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-woorkins">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/projetos">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Criar Novo Projeto
              </h1>
              <p className="text-muted-foreground mt-2">
                Descreva seu projeto e receba propostas de freelancers
              </p>
            </div>
          </div>

          {isCheckingRequirements ? (
            <Card className="bg-card/50 backdrop-blur-sm border-2">
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  <p className="text-muted-foreground">Verificando requisitos...</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card/50 backdrop-blur-sm border-2">
            <CardHeader>
              <CardTitle>Detalhes do Projeto</CardTitle>
              <CardDescription>
                Preencha as informações sobre o serviço que você precisa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Título do Projeto *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Desenvolvimento de site institucional"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Input
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Ex: Design, Desenvolvimento, Marketing"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição *</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva em detalhes o que você precisa..."
                    rows={6}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Seja claro sobre suas necessidades, objetivos e expectativas
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="budget-min">Orçamento Mínimo (R$)</Label>
                    <Input
                      id="budget-min"
                      type="number"
                      value={budgetMin}
                      onChange={(e) => setBudgetMin(e.target.value)}
                      placeholder="500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="budget-max">Orçamento Máximo (R$)</Label>
                    <Input
                      id="budget-max"
                      type="number"
                      value={budgetMax}
                      onChange={(e) => setBudgetMax(e.target.value)}
                      placeholder="2000"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Prazo</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !deadline && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {deadline ? format(deadline, 'dd/MM/yyyy') : 'Selecione uma data'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={deadline}
                        onSelect={setDeadline}
                        initialFocus
                        disabled={(date) => date < new Date()}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-primary hover:shadow-glow transition-all" 
                  disabled={creating}
                  size="lg"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {creating ? 'Criando...' : 'Publicar Projeto'}
                </Button>
              </form>
            </CardContent>
          </Card>
          )}
        </div>
      </div>

      <RequireProfilePhotoDialog
        open={showPhotoDialog}
        userName={registeredName}
        userId={user?.id || ''}
        onPhotoUploaded={() => {
          // Recarregar dados do perfil
          const reloadProfile = async () => {
            const { data } = await supabase
              .from('profiles')
              .select('avatar_url')
              .eq('user_id', user?.id)
              .single();
            
            if (data?.avatar_url) {
              setAvatarUrl(data.avatar_url);
              setShowPhotoDialog(false);
              // Verificar documento após adicionar foto
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
            // Se fechar sem verificar, redirecionar
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