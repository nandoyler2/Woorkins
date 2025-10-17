import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useIdentifierValidation() {
  const [isChecking, setIsChecking] = useState(false);

  const checkAvailability = useCallback(async (identifier: string): Promise<boolean> => {
    if (!identifier || identifier.trim() === '') {
      return false;
    }

    setIsChecking(true);
    try {
      const { data, error } = await supabase
        .rpc('check_identifier_available', { p_identifier: identifier });

      if (error) {
        console.error('Error checking identifier:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error checking identifier:', error);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  const validateIdentifier = useCallback((identifier: string): { valid: boolean; error?: string } => {
    // Remove espaços
    const trimmed = identifier.trim();

    // Verifica se está vazio
    if (!trimmed) {
      return { valid: false, error: 'Identificador não pode estar vazio' };
    }

    // Verifica tamanho mínimo e máximo
    if (trimmed.length < 3) {
      return { valid: false, error: 'Mínimo de 3 caracteres' };
    }

    if (trimmed.length > 30) {
      return { valid: false, error: 'Máximo de 30 caracteres' };
    }

    // Verifica se contém apenas letras minúsculas, números e hífens
    const regex = /^[a-z0-9-]+$/;
    if (!regex.test(trimmed)) {
      return { valid: false, error: 'Use apenas letras minúsculas, números e hífens' };
    }

    // Não pode começar ou terminar com hífen
    if (trimmed.startsWith('-') || trimmed.endsWith('-')) {
      return { valid: false, error: 'Não pode começar ou terminar com hífen' };
    }

    // Não pode ter hífens consecutivos
    if (trimmed.includes('--')) {
      return { valid: false, error: 'Não pode ter hífens consecutivos' };
    }

    return { valid: true };
  }, []);

  return {
    isChecking,
    checkAvailability,
    validateIdentifier,
  };
}
