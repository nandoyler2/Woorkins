import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SpamBlock {
  blocked_until: string;
  block_duration_minutes: number;
  spam_count: number;
  reason?: string;
}

export function useSpamBlock(profileId: string | undefined, context: 'support_chat' | 'ai_assistant' | 'negotiation' | 'proposal') {
  const [spamBlock, setSpamBlock] = useState<SpamBlock | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (!profileId) return;

    const fetchSpamBlock = async () => {
      const { data } = await supabase
        .from('message_spam_tracking')
        .select('*')
        .eq('profile_id', profileId)
        .eq('context', context)
        .maybeSingle();

      if (data?.blocked_until) {
        const blockedUntil = new Date(data.blocked_until);
        const now = new Date();
        
        if (blockedUntil > now) {
          setSpamBlock(data);
          setIsBlocked(true);
          setRemainingSeconds(Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000));
        } else {
          setSpamBlock(null);
          setIsBlocked(false);
          setRemainingSeconds(0);
        }
      }
    };

    fetchSpamBlock();
    const interval = setInterval(fetchSpamBlock, 5000);

    return () => clearInterval(interval);
  }, [profileId, context]);

  useEffect(() => {
    if (!isBlocked || remainingSeconds <= 0) return;

    const countdown = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setIsBlocked(false);
          setSpamBlock(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, [isBlocked, remainingSeconds]);

  return {
    isBlocked,
    remainingSeconds,
    spamBlock,
  };
}
