import { supabase } from '@/integrations/supabase/client';

/**
 * Verifica se um identificador (username ou slug) está disponível globalmente
 */
export async function checkIdentifierAvailable(identifier: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('check_identifier_available', { p_identifier: identifier });
    
    if (error) {
      console.error('Error checking identifier:', error);
      return false;
    }
    
    return data === true;
  } catch (error) {
    console.error('Error checking identifier availability:', error);
    return false;
  }
}

/**
 * Valida e normaliza um identificador (remove caracteres inválidos, converte para lowercase)
 */
export function normalizeIdentifier(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, ''); // Remove hífens no início e fim
}

/**
 * Valida formato de identificador
 */
export function validateIdentifierFormat(identifier: string): { valid: boolean; error?: string } {
  if (!identifier || identifier.trim() === '') {
    return { valid: false, error: 'Identificador não pode estar vazio' };
  }

  if (identifier.length < 3) {
    return { valid: false, error: 'Identificador deve ter pelo menos 3 caracteres' };
  }

  if (identifier.length > 50) {
    return { valid: false, error: 'Identificador deve ter no máximo 50 caracteres' };
  }

  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(identifier)) {
    return { valid: false, error: 'Use apenas letras minúsculas, números e hífens (não pode começar ou terminar com hífen)' };
  }

  // Palavras reservadas
  const reserved = ['admin', 'api', 'auth', 'login', 'logout', 'signup', 'register', 'dashboard', 'profile', 'settings', 'account', 'search', 'about', 'contact', 'help', 'terms', 'privacy', 'support'];
  if (reserved.includes(identifier.toLowerCase())) {
    return { valid: false, error: 'Este nome está reservado pelo sistema' };
  }

  return { valid: true };
}
