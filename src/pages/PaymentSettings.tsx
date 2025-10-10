import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, AlertCircle, ExternalLink, CreditCard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface StripeAccount {
  id: string;
  stripe_account_id: string;
  account_status: string;
  onboarding_completed: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
}

export default function PaymentSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [stripeAccount, setStripeAccount] = useState<StripeAccount | null>(null);

  useEffect(() => {
    if (user) {
      loadStripeAccount();
    }
  }, [user]);

  const loadStripeAccount = async () => {
    try {
      // Get user's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) return;

      // Get Stripe account
      const { data, error } = await supabase
        .from('stripe_connected_accounts')
        .select('*')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      setStripeAccount(data);
    } catch (error) {
      console.error('Error loading Stripe account:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar suas configurações de pagamento.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-connected-account', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      if (data.onboarding_url) {
        // Redirect to Stripe onboarding
        window.location.href = data.onboarding_url;
      } else if (data.onboarding_completed) {
        toast({
          title: 'Conta já configurada',
          description: 'Sua conta Stripe já está totalmente configurada.',
        });
        await loadStripeAccount();
      }
    } catch (error) {
      console.error('Error creating Stripe account:', error);
      toast({
        title: 'Erro ao criar conta',
        description: 'Não foi possível criar sua conta no Stripe.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = () => {
    if (!stripeAccount) return null;

    if (stripeAccount.onboarding_completed && stripeAccount.charges_enabled && stripeAccount.payouts_enabled) {
      return <Badge className="bg-green-500">✓ Ativo</Badge>;
    }

    if (stripeAccount.details_submitted) {
      return <Badge className="bg-yellow-500">⏳ Em Análise</Badge>;
    }

    return <Badge variant="destructive">⚠️ Incompleto</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-woorkins mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações de Pagamento</h1>
        <p className="text-muted-foreground">
          Configure sua conta para receber pagamentos automaticamente via PIX
        </p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Status da Conta Stripe</h3>
            <p className="text-sm text-muted-foreground">
              {stripeAccount
                ? 'Sua conta Stripe está conectada à plataforma'
                : 'Configure sua conta para receber pagamentos'}
            </p>
          </div>
          {getStatusBadge()}
        </div>

        {!stripeAccount ? (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex items-start gap-2">
                <CreditCard className="h-5 w-5 mt-0.5" />
                <div>
                  <p className="font-medium">Configure sua conta de recebimento</p>
                  <p className="text-sm text-muted-foreground">
                    Para receber pagamentos pelos seus serviços, você precisa criar uma conta Stripe Connect.
                    O processo é rápido e seguro.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Benefícios:</p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>✓ Receba pagamentos via PIX automaticamente</li>
                <li>✓ Repasses em 1-2 dias úteis</li>
                <li>✓ Segurança e proteção do Stripe</li>
                <li>✓ Sistema de escrow (retenção até conclusão do serviço)</li>
              </ul>
            </div>

            <Button onClick={handleCreateAccount} className="w-full" disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                <>
                  Criar Conta Stripe
                  <ExternalLink className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                {stripeAccount.charges_enabled ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
                <div>
                  <p className="text-sm font-medium">Recebimento de Pagamentos</p>
                  <p className="text-xs text-muted-foreground">
                    {stripeAccount.charges_enabled ? 'Habilitado' : 'Aguardando aprovação'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {stripeAccount.payouts_enabled ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
                <div>
                  <p className="text-sm font-medium">Repasses Automáticos</p>
                  <p className="text-xs text-muted-foreground">
                    {stripeAccount.payouts_enabled ? 'Habilitado' : 'Aguardando aprovação'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {stripeAccount.onboarding_completed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
                <div>
                  <p className="text-sm font-medium">Cadastro Completo</p>
                  <p className="text-xs text-muted-foreground">
                    {stripeAccount.onboarding_completed ? 'Completo' : 'Incompleto'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {stripeAccount.details_submitted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
                <div>
                  <p className="text-sm font-medium">Documentos Enviados</p>
                  <p className="text-xs text-muted-foreground">
                    {stripeAccount.details_submitted ? 'Enviados' : 'Pendente'}
                  </p>
                </div>
              </div>
            </div>

            {!stripeAccount.onboarding_completed && (
              <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-900 dark:text-yellow-100">
                      Complete seu cadastro
                    </p>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                      Você precisa completar o cadastro no Stripe para receber pagamentos.
                      Isso inclui informações pessoais e dados bancários.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={handleCreateAccount}
                      disabled={creating}
                    >
                      {creating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Carregando...
                        </>
                      ) : (
                        <>
                          Completar Cadastro
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {stripeAccount.onboarding_completed &&
              stripeAccount.charges_enabled &&
              stripeAccount.payouts_enabled && (
                <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-900 dark:text-green-100">
                        Tudo pronto!
                      </p>
                      <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                        Sua conta está configurada e você pode receber pagamentos.
                        Os repasses serão feitos automaticamente em 1-2 dias úteis após a conclusão do serviço.
                      </p>
                    </div>
                  </div>
                </div>
              )}
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold">Como funciona?</h3>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
              1
            </div>
            <div>
              <p className="font-medium text-foreground">Cliente efetua o pagamento</p>
              <p>O valor fica retido em escrow (segurança para ambas as partes)</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
              2
            </div>
            <div>
              <p className="font-medium text-foreground">Você entrega o serviço</p>
              <p>Complete o projeto conforme acordado com o cliente</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
              3
            </div>
            <div>
              <p className="font-medium text-foreground">Cliente confirma conclusão</p>
              <p>O pagamento é automaticamente liberado do escrow</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
              4
            </div>
            <div>
              <p className="font-medium text-foreground">Você recebe via PIX</p>
              <p>O valor cai na sua conta em 1-2 dias úteis após liberação</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}