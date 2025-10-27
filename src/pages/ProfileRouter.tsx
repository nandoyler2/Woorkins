import { useState, useEffect } from 'react';
import { useParams, Routes, Route } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import UserProfile from './UserProfile';

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

      // Primeiro verifica se é um slug de perfil profissional (business)
      const { data: businessData, error: businessError } = await supabase
        .from('profiles')
        .select('id, slug')
        .eq('slug', slug)
        .eq('profile_type', 'business')
        .maybeSingle();

      if (businessError) {
        console.warn('[ProfileRouter] Business query error:', businessError);
      }

      if (businessData) {
        console.log('[ProfileRouter] Business profile found:', businessData.id);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (profileType === 'notfound') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Perfil não encontrado</h1>
          <p className="text-muted-foreground">Este perfil não existe ou foi removido.</p>
        </div>
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
