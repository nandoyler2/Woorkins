import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SystemBlock {
  block_type: 'messaging' | 'system';
  reason: string;
  blocked_until: string | null;
  is_permanent: boolean;
}

export const useSystemBlock = (profileId: string | null) => {
  const [blocks, setBlocks] = useState<SystemBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profileId) {
      setBlocks([]);
      setIsLoading(false);
      return;
    }

    const checkBlocks = async () => {
      try {
        const { data, error } = await supabase
          .from('system_blocks')
          .select('block_type, reason, blocked_until, is_permanent')
          .eq('profile_id', profileId);

        if (error) throw error;

        // Filter out expired blocks
        const activeBlocks = (data || []).filter((block) => {
          if (block.is_permanent) return true;
          if (!block.blocked_until) return false;
          return new Date(block.blocked_until) > new Date();
        }).map((block) => ({
          block_type: block.block_type as 'messaging' | 'system',
          reason: block.reason,
          blocked_until: block.blocked_until,
          is_permanent: block.is_permanent,
        }));

        setBlocks(activeBlocks);
      } catch (error) {
        console.error('Error checking blocks:', error);
        setBlocks([]);
      } finally {
        setIsLoading(false);
      }
    };

    checkBlocks();

    // Check every 10 seconds
    const interval = setInterval(checkBlocks, 10000);

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`system_blocks_${profileId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_blocks',
          filter: `profile_id=eq.${profileId}`,
        },
        () => {
          checkBlocks();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      channel.unsubscribe();
    };
  }, [profileId]);

  const messagingBlock = blocks.find((b) => b.block_type === 'messaging');
  const systemBlock = blocks.find((b) => b.block_type === 'system');

  return {
    blocks,
    messagingBlock,
    systemBlock,
    isBlocked: blocks.length > 0,
    isSystemBlocked: !!systemBlock,
    isMessagingBlocked: !!messagingBlock,
    isLoading,
  };
};
