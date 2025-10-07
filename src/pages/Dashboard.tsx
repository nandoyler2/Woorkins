import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Building2, Edit, Star, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface BusinessProfile {
  id: string;
  company_name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  average_rating: number;
  total_reviews: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  
  // Form state
  const [companyName, setCompanyName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (user) {
      loadProfile();
      loadBusinesses();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles' as any)
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setProfile(data as unknown as Profile);
    }
    setLoading(false);
  };

  const loadBusinesses = async () => {
    if (!user) return;

    const { data: profileData } = await supabase
      .from('profiles' as any)
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    const profileId = (profileData as any)?.id;
    if (!profileId) return;

    const { data, error } = await supabase
      .from('business_profiles' as any)
      .select('*')
      .eq('profile_id', profileId);

    if (!error && data) {
      setBusinesses(data as unknown as BusinessProfile[]);
    }
  };

  const checkSlugAvailability = async (slugToCheck: string) => {
    if (!slugToCheck || slugToCheck.length < 3) {
      setSlugAvailable(null);
      return;
    }

    setCheckingSlug(true);
    
    try {
      const { data, error } = await supabase
        .from('business_profiles' as any)
        .select('id')
        .eq('slug', slugToCheck)
        .maybeSingle();

      setSlugAvailable(!data);
    } catch (error) {
      console.error('Error checking slug:', error);
      setSlugAvailable(null);
    } finally {
      setCheckingSlug(false);
    }
  };

  const handleCompanyNameChange = (name: string) => {
    setCompanyName(name);
    
    // Auto-generate slug from company name
    const generatedSlug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-'); // Remove duplicate hyphens
    
    setSlug(generatedSlug);
    
    // Check availability with debounce
    if (generatedSlug.length >= 3) {
      setTimeout(() => checkSlugAvailability(generatedSlug), 500);
    }
  };

  const handleSlugChange = (newSlug: string) => {
    const cleanSlug = newSlug.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(cleanSlug);
    
    if (cleanSlug.length >= 3) {
      setTimeout(() => checkSlugAvailability(cleanSlug), 500);
    } else {
      setSlugAvailable(null);
    }
  };

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setCreating(true);

    try {
      const { error } = await supabase
        .from('business_profiles' as any)
        .insert({
          profile_id: profile.id,
          company_name: companyName,
          slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ''),
          description,
        });

      if (error) throw error;

      toast({
        title: 'Marca criada com sucesso!',
        description: `Sua marca foi criada em woorkins.com/${slug}`,
      });

      setOpenDialog(false);
      setCompanyName('');
      setSlug('');
      setDescription('');
      loadBusinesses();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar marca',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Welcome Section */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold">Olá, {profile?.full_name || profile?.username}!</h1>
            <p className="text-lg text-muted-foreground">
              Gerencie suas marcas e perfis empresariais
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Marcas Ativas
                </CardTitle>
                <Building2 className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{businesses.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avaliações Totais
                </CardTitle>
                <Star className="w-4 h-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {businesses.reduce((sum, b) => sum + b.total_reviews, 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avaliação Média
                </CardTitle>
                <Star className="w-4 h-4 text-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {businesses.length > 0
                    ? (businesses.reduce((sum, b) => sum + Number(b.average_rating), 0) / businesses.length).toFixed(1)
                    : '0.0'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Businesses Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Minhas Marcas</h2>
              <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Marca
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Nova Marca</DialogTitle>
                    <DialogDescription>
                      Crie um perfil empresarial com um @username único
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateBusiness} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="company-name">Nome da Empresa</Label>
                      <Input
                        id="company-name"
                        value={companyName}
                        onChange={(e) => handleCompanyNameChange(e.target.value)}
                        placeholder="Nome da sua empresa"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slug">Username (Slug)</Label>
                      <Input
                        id="slug"
                        value={slug}
                        onChange={(e) => handleSlugChange(e.target.value)}
                        placeholder="minha-empresa"
                        required
                        minLength={3}
                      />
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          Será usado como: woorkins.com/{slug || 'minha-empresa'}
                        </p>
                        {checkingSlug && (
                          <span className="text-xs text-muted-foreground">Verificando...</span>
                        )}
                        {!checkingSlug && slugAvailable === true && slug.length >= 3 && (
                          <span className="text-xs text-accent flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Disponível
                          </span>
                        )}
                        {!checkingSlug && slugAvailable === false && (
                          <span className="text-xs text-destructive flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            Indisponível
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Descreva sua empresa..."
                        rows={4}
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={creating || slugAvailable === false || checkingSlug}
                    >
                      {creating ? 'Criando...' : 'Criar Marca'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {businesses.length === 0 ? (
              <Card className="p-12">
                <div className="text-center space-y-4">
                  <Building2 className="w-16 h-16 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="text-xl font-bold mb-2">Nenhuma marca ainda</h3>
                    <p className="text-muted-foreground">
                      Crie sua primeira marca para começar a receber avaliações
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {businesses.map((business) => (
                  <Card key={business.id} className="hover:shadow-elegant transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-xl">{business.company_name}</CardTitle>
                          <CardDescription className="text-base">
                            woorkins.com/{business.slug}
                          </CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/business/${business.slug}/edit`}>
                            <Edit className="w-4 h-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {business.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {business.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-primary fill-primary" />
                          <span className="font-medium">{Number(business.average_rating).toFixed(1)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4 text-muted-foreground" />
                          <span>{business.total_reviews} avaliações</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" asChild>
                          <Link to={`/${business.slug}`}>Ver Perfil</Link>
                        </Button>
                        <Button className="flex-1 bg-gradient-primary" asChild>
                          <Link to={`/business/${business.slug}/edit`}>Gerenciar</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
