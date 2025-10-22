import { useState, useEffect } from 'react';
import { useParams, Routes, Route } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import UserProfile from './UserProfile';
import BusinessProfile from './BusinessProfile';

export default function ProfileRouter() {
  const { slug } = useParams<{ slug: string }>();
  const [profileType, setProfileType] = useState<'user' | 'business' | 'notfound' | null>(null);

  useEffect(() => {
    const checkProfileType = async () => {
      if (!slug) {
        setProfileType('notfound');
        return;
      }

      // Primeiro verifica se é um username de usuário
      const { data: userData } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', slug)
        .maybeSingle();

      if (userData) {
        setProfileType('user');
        return;
      }

      // Se não for usuário, verifica se é um slug de empresa
      const { data: businessData } = await supabase
        .from('business_profiles')
        .select('slug')
        .eq('slug', slug)
        .maybeSingle();

      if (businessData) {
        setProfileType('business');
        return;
      }

      // Não encontrou nem usuário nem empresa
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

  if (profileType === 'user') {
    return (
      <Routes>
        <Route path="/" element={<UserProfile />} />
        <Route path="/:tab" element={<UserProfile />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<BusinessProfile />} />
      <Route path="/:tab" element={<BusinessProfile />} />
    </Routes>
  );
}
