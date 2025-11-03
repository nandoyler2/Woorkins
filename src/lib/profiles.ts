import { supabase } from '@/integrations/supabase/client';
import { formatFullName } from '@/lib/utils';

interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  full_name: string | null;
  profile_type: 'user' | 'business' | null;
  avatar_url: string | null;
  created_at: string;
  company_name?: string | null;
  slug?: string | null;
}

/**
 * Retorna o nome de exibição correto baseado no tipo de perfil
 * - Para business: retorna company_name formatado
 * - Para user: retorna full_name formatado
 */
export function getProfileDisplayName(profile: {
  profile_type?: 'user' | 'business' | null;
  full_name?: string | null;
  company_name?: string | null;
}): string {
  if (profile.profile_type === 'business' && profile.company_name) {
    return formatFullName(profile.company_name);
  }
  return formatFullName(profile.full_name) || 'Usuário';
}

/**
 * Gera um username disponível baseado em um prefixo
 * Adiciona sufixos numéricos até encontrar um username livre
 */
export async function generateAvailableUsername(base: string): Promise<string> {
  // Limpar e slugificar o base
  const cleanBase = base
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 20);

  // Se o base estiver vazio, usar fallback
  const finalBase = cleanBase || 'user';

  // Verificar se não existe como username OU como slug de business
  const checkAvailability = async (candidate: string): Promise<boolean> => {
    // Checar como username em qualquer perfil
    const { data: existingUsername } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', candidate)
      .maybeSingle();

    if (existingUsername) return false;

    // Checar se conflita com slug de algum business
    const { data: existingSlug } = await supabase
      .from('profiles')
      .select('slug')
      .eq('slug', candidate)
      .eq('profile_type', 'business')
      .maybeSingle();

    return !existingSlug;
  };

  // Tentar o base original primeiro
  const isAvailable = await checkAvailability(finalBase);
  if (isAvailable) {
    return finalBase;
  }

  // Se já existe, tentar com sufixos numéricos
  let attempt = 1;
  let candidateUsername = `${finalBase}${attempt}`;
  
  while (attempt < 100) {
    const available = await checkAvailability(candidateUsername);
    if (available) {
      return candidateUsername;
    }

    attempt++;
    candidateUsername = `${finalBase}${attempt}`;
  }

  // Fallback final: usar timestamp
  return `${finalBase}_${Date.now().toString().slice(-6)}`;
}

/**
 * Garante que o usuário tem pelo menos um perfil do tipo 'user'
 * Se não existir, cria automaticamente
 * Retorna a lista de perfis do usuário, priorizando o tipo 'user'
 */
export async function getOrCreateUserProfile(user: { id: string; email?: string }): Promise<Profile[]> {
  console.log('[getOrCreateUserProfile] Starting for user:', user.id);

  // Buscar todos os perfis do usuário (exceto os excluídos)
  const { data: existingProfiles, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .neq('deleted', true) // Excluir perfis marcados como deleted
    .order('created_at', { ascending: true });

  if (fetchError) {
    console.error('[getOrCreateUserProfile] Error fetching profiles:', fetchError);
    throw fetchError;
  }

  console.log('[getOrCreateUserProfile] Existing profiles:', existingProfiles);

  // Se já existe pelo menos um perfil, retornar priorizando 'user'
  if (existingProfiles && existingProfiles.length > 0) {
    const userProfile = existingProfiles.find((p: any) => p.profile_type === 'user');
    if (userProfile) {
      console.log('[getOrCreateUserProfile] User profile found:', userProfile.id);
      return existingProfiles as Profile[];
    }
    
    // Se não tem perfil 'user', mas tem outro tipo, retornar mesmo assim
    // (pode ser apenas business)
    console.log('[getOrCreateUserProfile] No user profile, but has other profiles');
    return existingProfiles as Profile[];
  }

  // Se não existe nenhum perfil, criar um do tipo 'user'
  console.log('[getOrCreateUserProfile] No profiles found, creating user profile...');

  // Gerar username baseado no email ou usar fallback
  const emailPrefix = user.email ? user.email.split('@')[0] : 'user';
  const username = await generateAvailableUsername(emailPrefix);

  // Criar o perfil
  const newProfile = {
    user_id: user.id,
    profile_type: 'user',
    username: username,
    full_name: emailPrefix.replace(/[._-]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
  };

  console.log('[getOrCreateUserProfile] Creating new profile:', newProfile);

  const { data: createdProfile, error: createError } = await supabase
    .from('profiles')
    .insert(newProfile)
    .select()
    .single();

  if (createError) {
    console.error('[getOrCreateUserProfile] Error creating profile:', createError);
    throw createError;
  }

  console.log('[getOrCreateUserProfile] Profile created successfully:', createdProfile.id);

  return [createdProfile as Profile];
}
