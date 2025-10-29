import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, X, Sparkles } from 'lucide-react';
import logoWoorkins from '@/assets/logo-woorkins.png';
import { SafeImage } from '@/components/ui/safe-image';
import { useIdentifierValidation } from '@/hooks/useIdentifierValidation';
import { ProfilePhotoUpload } from '@/components/ProfilePhotoUpload';

export default function Welcome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { validateIdentifier, checkAvailability, isChecking } = useIdentifierValidation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<string>('');
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string>('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [usernameValid, setUsernameValid] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string>('');

  useEffect(() => {
    document.title = 'Bem-vindo ao Woorkins';
    loadProfile();
  }, []);

  const loadProfile = async () => {
    if (!user) {
      navigate('/auth?mode=signin');
      return;
    }

    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, username, bio, avatar_url, full_name')
        .eq('user_id', user.id)
        .eq('profile_type', 'user')
        .limit(1);

      if (error) throw error;

      if (profiles && profiles.length > 0) {
        const profile = profiles[0];
        setProfileId(profile.id);
        setUsername(profile.username || '');
        setBio(profile.bio || '');
        setCurrentPhotoUrl(profile.avatar_url || '');
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar perfil',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkUsername = async () => {
      if (!username) {
        setUsernameValid(null);
        setUsernameError('');
        return;
      }

      const validation = validateIdentifier(username);
      if (!validation.valid) {
        setUsernameValid(false);
        setUsernameError(validation.error || 'Username inválido');
        return;
      }

      const available = await checkAvailability(username);
      if (available) {
        setUsernameValid(true);
        setUsernameError('');
      } else {
        setUsernameValid(false);
        setUsernameError('Este username já está em uso');
      }
    };

    const timeout = setTimeout(checkUsername, 500);
    return () => clearTimeout(timeout);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !usernameValid) {
      toast({
        variant: 'destructive',
        title: 'Username obrigatório',
        description: 'Por favor, escolha um username válido e disponível.',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: username.toLowerCase(),
          bio: bio.trim() || null,
        })
        .eq('id', profileId);

      if (error) throw error;

      // Marcar onboarding como completo
      localStorage.setItem('onboarding_completed', 'true');

      toast({
        title: '🎉 Bem-vindo ao Woorkins!',
        description: 'Seu perfil foi configurado com sucesso.',
      });

      navigate('/painel');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar perfil',
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-2xl shadow-elegant border-0">
        <CardHeader className="space-y-4 pb-8">
          <div className="flex justify-center">
            <SafeImage src={logoWoorkins} alt="Logo Woorkins" className="h-16 w-auto" />
          </div>
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Sparkles className="w-12 h-12 text-primary" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <CardTitle className="text-3xl font-bold">
              Bem-vindo ao Woorkins!
            </CardTitle>
            <CardDescription className="text-base">
              Vamos configurar seu perfil?
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Photo */}
            <div className="flex justify-center">
              <ProfilePhotoUpload
                currentPhotoUrl={currentPhotoUrl}
                userName={user?.user_metadata?.full_name || 'Usuário'}
                profileId={profileId}
                onPhotoUpdated={() => {
                  loadProfile();
                }}
              />
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center gap-2">
                Username <span className="text-destructive">*</span>
                {isChecking && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                {!isChecking && usernameValid === true && <Check className="w-4 h-4 text-green-500" />}
                {!isChecking && usernameValid === false && <X className="w-4 h-4 text-destructive" />}
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                required
                className="h-11"
                placeholder="seu-username"
                maxLength={50}
              />
              {usernameError && (
                <p className="text-sm text-destructive">{usernameError}</p>
              )}
              {usernameValid === true && (
                <p className="text-sm text-green-600">✓ Username disponível</p>
              )}
              <p className="text-xs text-muted-foreground">
                Seu username será usado na URL do seu perfil: woorkins.com/{username}
              </p>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bio (opcional)</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Conte um pouco sobre você..."
                className="min-h-[100px]"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {bio.length}/500 caracteres
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base"
              disabled={saving || !usernameValid}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Começar'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
