import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminCounts {
  moderation: number;
  support: number;
  documentVerifications: number;
  systemBlocks: number;
}

export const useAdminCounts = () => {
  const [counts, setCounts] = useState<AdminCounts>({
    moderation: 0,
    support: 0,
    documentVerifications: 0,
    systemBlocks: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCounts = async () => {
      try {
        // Contagem de itens de moderação (posts, comentários bloqueados)
        const { count: moderationCount } = await supabase
          .from('blocked_messages')
          .select('*', { count: 'exact', head: true });

        // Contagem de conversas de suporte ativas
        const { count: supportCount } = await supabase
          .from('support_conversations')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        // Contagem de verificações de documentos pendentes
        const { count: verificationCount } = await supabase
          .from('document_verifications')
          .select('*', { count: 'exact', head: true })
          .eq('verification_status', 'pending');

        // Contagem de bloqueios do sistema ativos
        const { count: blocksCount } = await supabase
          .from('system_blocks')
          .select('*', { count: 'exact', head: true })
          .or('is_permanent.eq.true,blocked_until.gt.now()');

        setCounts({
          moderation: moderationCount || 0,
          support: supportCount || 0,
          documentVerifications: verificationCount || 0,
          systemBlocks: blocksCount || 0
        });
      } catch (error) {
        console.error('Error loading admin counts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCounts();

    // Atualizar contagens a cada 30 segundos
    const interval = setInterval(loadCounts, 30000);

    return () => clearInterval(interval);
  }, []);

  return { counts, loading };
};