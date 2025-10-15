import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useDocumentVerification(profileId: string | undefined) {
  const [isVerified, setIsVerified] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string>('pending');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profileId) {
      setIsLoading(false);
      return;
    }

    const checkVerification = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('document_verified, document_verification_status')
          .eq('id', profileId)
          .single();

        if (error) throw error;

        setIsVerified(data?.document_verified || false);
        setVerificationStatus(data?.document_verification_status || 'pending');
      } catch (error) {
        console.error('Error checking verification:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkVerification();

    // Subscribe to changes
    const channel = supabase
      .channel(`verification:${profileId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${profileId}`
        },
        (payload) => {
          if (payload.new) {
            setIsVerified((payload.new as any).document_verified || false);
            setVerificationStatus((payload.new as any).document_verification_status || 'pending');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId]);

  return { isVerified, verificationStatus, isLoading };
}
