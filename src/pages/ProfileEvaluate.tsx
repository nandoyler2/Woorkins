import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProfileEvaluationForm } from "@/components/ProfileEvaluationForm";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Building2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProfileEvaluate() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [profileType, setProfileType] = useState<'user' | 'business' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Avaliar Perfil - Woorkins';
  }, []);

  useEffect(() => {
    loadProfile();
  }, [slug]);

  const loadProfile = async () => {
    if (!slug) return;

    try {
      setLoading(true);

      // Check if it's a user profile (starts with @)
      if (slug.startsWith('@')) {
        const username = slug.substring(1);
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .eq('username', username)
          .single();

        if (error) throw error;
        
        if (data) {
          setProfile(data);
          setProfileType('user');
        }
      } else {
        // Check if it's a business profile
        const { data, error } = await supabase
          .from('business_profiles')
          .select('id, slug, company_name, avatar_url')
          .eq('slug', slug)
          .single();

        if (error) throw error;

        if (data) {
          setProfile(data);
          setProfileType('business');
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    const profilePath = profileType === 'user' ? `/@${profile.username}` : `/${profile.slug}`;
    navigate(profilePath);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Perfil não encontrado</p>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const profilePath = profileType === 'user' ? `/@${profile.username}` : `/${profile.slug}`;
  const displayName = profileType === 'user' 
    ? (profile.full_name || profile.username)
    : profile.company_name;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate(profilePath)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao perfil
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile.avatar_url || ''} alt={displayName} />
                <AvatarFallback>
                  {profileType === 'user' ? (
                    <User className="h-8 w-8" />
                  ) : (
                    <Building2 className="h-8 w-8" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>Avaliar {displayName}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {profileType === 'user' ? 'Perfil de Usuário' : 'Perfil Empresarial'}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <ProfileEvaluationForm 
          profileId={profile.id} 
          onSuccess={handleSuccess}
        />
      </div>
      <Footer />
    </div>
  );
}
