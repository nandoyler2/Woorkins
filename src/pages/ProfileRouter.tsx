import { useState, useEffect } from 'react';
import { useParams, Routes, Route, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import UserProfile from './UserProfile';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Home, Search } from 'lucide-react';

export default function ProfileRouter() {
  const { slug } = useParams<{ slug: string }>();
  const [profileType, setProfileType] = useState<'user' | 'business' | 'notfound' | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    const checkProfileType = async () => {
      if (!slug) {
        console.log('[ProfileRouter] No slug provided');
        setProfileType('notfound');
        return;
      }

      console.log('[ProfileRouter] Checking profile type for slug:', slug);

      // Primeiro tenta resolver como perfil profissional (business) por slug OU username
      const { data: businessData, error: businessError } = await supabase
        .from('profiles')
        .select('id, slug, username')
        .eq('profile_type', 'business')
        .or(`slug.eq.${slug},username.eq.${slug}`)
        .or('deleted.is.null,deleted.eq.false')
        .maybeSingle();

      if (businessError) {
        console.warn('[ProfileRouter] Business query error:', businessError);
      }

      if (businessData) {
        console.log('[ProfileRouter] Business profile found (by slug or username):', businessData.id);
        setProfileType('business');
        setProfileId(businessData.id);
        return;
      }

      // Se não for business, verifica se é um username de usuário pessoal
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('username', slug)
        .eq('profile_type', 'user')
        .or('deleted.is.null,deleted.eq.false')
        .maybeSingle();

      if (userError) {
        console.warn('[ProfileRouter] User query error:', userError);
      }

      if (userData) {
        console.log('[ProfileRouter] User profile found:', userData.id);
        setProfileType('user');
        setProfileId(userData.id);
        return;
      }

      // Fallback: verificar se existe business com esse username (legacy)
      const { data: legacyBusinessData, error: legacyError } = await supabase
        .from('profiles')
        .select('id, username, slug')
        .eq('username', slug)
        .eq('profile_type', 'business')
        .or('deleted.is.null,deleted.eq.false')
        .maybeSingle();

      if (legacyError) {
        console.warn('[ProfileRouter] Legacy query error:', legacyError);
      }
        
      if (legacyBusinessData?.slug) {
        console.log('[ProfileRouter] Legacy business found, redirecting to:', legacyBusinessData.slug);
        // Redirecionar para o slug correto do business
        window.location.replace(`/${legacyBusinessData.slug}`);
        return;
      }

      // Não encontrou nem perfil profissional nem usuário
      console.log('[ProfileRouter] Profile not found for slug:', slug);
      setProfileType('notfound');
    };

    checkProfileType();
  }, [slug]);

  if (profileType === null) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-48 bg-muted rounded-lg" />
            <div className="h-32 bg-muted rounded-lg" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (profileType === 'notfound') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-20">
          <div className="text-center max-w-2xl mx-auto space-y-6">
            <div className="space-y-2">
              <h1 className="text-6xl md:text-7xl font-bold text-foreground">
                😕
              </h1>
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
                Perfil não encontrado
              </h2>
              <p className="text-muted-foreground text-lg">
                O perfil que você está procurando não existe ou foi removido.
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
  }

  // Sempre usa UserProfile, mas passa o tipo como prop
  return (
    <Routes>
      <Route path="/" element={<UserProfile profileType={profileType} profileId={profileId!} />} />
      <Route path="/:tab" element={<UserProfile profileType={profileType} profileId={profileId!} />} />
    </Routes>
  );
}
