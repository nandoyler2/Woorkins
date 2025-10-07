import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ImageUpload } from '@/components/ImageUpload';
import { ArrowLeft, Save, Star, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BusinessProfile {
  id: string;
  profile_id: string;
  company_name: string;
  slug: string;
  logo_url: string | null;
  cover_url: string | null;
  description: string | null;
  category: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  portfolio_description: string | null;
}

interface Evaluation {
  id: string;
  user_id: string;
  title: string;
  content: string;
  rating: number;
  public_response: string | null;
  created_at: string;
  profiles: {
    username: string;
    full_name: string;
  };
}

export default function BusinessEdit() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [responses, setResponses] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadBusiness();
    loadEvaluations();
  }, [slug]);

  const loadBusiness = async () => {
    if (!user || !slug) return;

    const { data: profileData } = await supabase
      .from('profiles' as any)
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profileData) return;

    const { data, error } = await supabase
      .from('business_profiles' as any)
      .select('*')
      .eq('slug', slug)
      .eq('profile_id', (profileData as any).id)
      .maybeSingle();

    if (error || !data) {
      toast({
        title: 'Erro',
        description: 'Marca não encontrada',
        variant: 'destructive',
      });
      navigate('/dashboard');
      return;
    }

    setBusiness(data as unknown as BusinessProfile);
    setLoading(false);
  };

  const loadEvaluations = async () => {
    if (!slug) return;

    const { data: businessData } = await supabase
      .from('business_profiles' as any)
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (!businessData) return;

    const { data } = await supabase
      .from('evaluations' as any)
      .select(`
        *,
        profiles:user_id (
          username,
          full_name
        )
      `)
      .eq('business_id', (businessData as any).id)
      .order('created_at', { ascending: false });

    if (data) {
      setEvaluations(data as any);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('business_profiles' as any)
        .update({
          company_name: business.company_name,
          description: business.description,
          category: business.category,
          phone: business.phone,
          email: business.email,
          address: business.address,
          portfolio_description: business.portfolio_description,
        })
        .eq('id', business.id);

      if (error) throw error;

      toast({
        title: 'Salvo!',
        description: 'Alterações salvas com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (url: string) => {
    if (!business) return;

    const { error } = await supabase
      .from('business_profiles' as any)
      .update({ logo_url: url })
      .eq('id', business.id);

    if (!error) {
      setBusiness({ ...business, logo_url: url });
      toast({ title: 'Logo atualizado!' });
    }
  };

  const handleCoverUpload = async (url: string) => {
    if (!business) return;

    const { error } = await supabase
      .from('business_profiles' as any)
      .update({ cover_url: url })
      .eq('id', business.id);

    if (!error) {
      setBusiness({ ...business, cover_url: url });
      toast({ title: 'Capa atualizada!' });
    }
  };

  const handleResponseSubmit = async (evaluationId: string) => {
    const response = responses[evaluationId];
    if (!response?.trim()) return;

    try {
      const { error } = await supabase
        .from('evaluations' as any)
        .update({ public_response: response })
        .eq('id', evaluationId);

      if (error) throw error;

      toast({
        title: 'Resposta publicada!',
        description: 'Sua resposta foi enviada.',
      });

      setResponses({ ...responses, [evaluationId]: '' });
      loadEvaluations();
    } catch (error: any) {
      toast({
        title: 'Erro ao responder',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!business) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-4xl font-bold">{business.company_name}</h1>
              <p className="text-muted-foreground">@{business.slug}</p>
            </div>
          </div>

          {/* Imagens */}
          <Card className="bg-card/50 backdrop-blur-sm border-2">
            <CardHeader>
              <CardTitle>Imagens da Marca</CardTitle>
              <CardDescription>Logo e capa do perfil</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Logo</Label>
                <ImageUpload
                  currentImageUrl={business.logo_url}
                  onUpload={handleLogoUpload}
                  bucket="business-logos"
                  folder={business.id}
                  type="logo"
                />
              </div>
              <div className="space-y-2">
                <Label>Capa</Label>
                <ImageUpload
                  currentImageUrl={business.cover_url}
                  onUpload={handleCoverUpload}
                  bucket="business-covers"
                  folder={business.id}
                  type="cover"
                />
              </div>
            </CardContent>
          </Card>

          {/* Informações */}
          <Card className="bg-card/50 backdrop-blur-sm border-2">
            <CardHeader>
              <CardTitle>Informações</CardTitle>
              <CardDescription>Dados da empresa</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome da Empresa</Label>
                  <Input
                    value={business.company_name}
                    onChange={(e) => setBusiness({ ...business, company_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Input
                    value={business.category || ''}
                    onChange={(e) => setBusiness({ ...business, category: e.target.value })}
                    placeholder="Ex: Tecnologia, Alimentação, etc"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={business.description || ''}
                    onChange={(e) => setBusiness({ ...business, description: e.target.value })}
                    rows={4}
                    placeholder="Descreva sua empresa..."
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={business.email || ''}
                      onChange={(e) => setBusiness({ ...business, email: e.target.value })}
                      placeholder="contato@empresa.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input
                      value={business.phone || ''}
                      onChange={(e) => setBusiness({ ...business, phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Input
                    value={business.address || ''}
                    onChange={(e) => setBusiness({ ...business, address: e.target.value })}
                    placeholder="Endereço completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição do Portfólio</Label>
                  <Textarea
                    value={business.portfolio_description || ''}
                    onChange={(e) => setBusiness({ ...business, portfolio_description: e.target.value })}
                    rows={3}
                    placeholder="Descreva seus trabalhos..."
                  />
                </div>
                <Button type="submit" className="w-full bg-gradient-primary hover:shadow-glow transition-all" disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Avaliações */}
          <Card className="bg-card/50 backdrop-blur-sm border-2">
            <CardHeader>
              <CardTitle>Avaliações ({evaluations.length})</CardTitle>
              <CardDescription>Gerencie as avaliações da sua marca</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {evaluations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma avaliação ainda
                </p>
              ) : (
                evaluations.map((evaluation) => (
                  <div key={evaluation.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{evaluation.profiles.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          @{evaluation.profiles.username}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-primary text-primary" />
                        <span className="font-bold">{evaluation.rating}</span>
                      </div>
                    </div>
                    <div>
                      <p className="font-medium mb-1">{evaluation.title}</p>
                      <p className="text-sm text-muted-foreground">{evaluation.content}</p>
                    </div>
                    {evaluation.public_response ? (
                      <div className="bg-muted rounded-lg p-3">
                        <p className="text-sm font-medium mb-1">Sua resposta:</p>
                        <p className="text-sm">{evaluation.public_response}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Responder avaliação..."
                          value={responses[evaluation.id] || ''}
                          onChange={(e) => setResponses({ ...responses, [evaluation.id]: e.target.value })}
                          rows={2}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleResponseSubmit(evaluation.id)}
                          disabled={!responses[evaluation.id]?.trim()}
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Responder
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
