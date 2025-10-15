import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface CommissionSettings {
  free: number;
  pro: number;
  premium: number;
}

export default function AdminSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeGateway, setActiveGateway] = useState<'stripe' | 'mercadopago'>('stripe');
  const [commissions, setCommissions] = useState<CommissionSettings>({
    free: 5.0,
    pro: 3.0,
    premium: 2.0,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load gateway config
      const { data: gatewayData } = await supabase
        .from('payment_gateway_config')
        .select('active_gateway')
        .single();

      if (gatewayData) {
        setActiveGateway(gatewayData.active_gateway as 'stripe' | 'mercadopago');
      }

      // Load commission settings
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['stripe_commission_free', 'stripe_commission_pro', 'stripe_commission_premium']);

      if (error) throw error;

      if (data) {
        const newCommissions: CommissionSettings = { free: 5.0, pro: 3.0, premium: 2.0 };
        data.forEach((setting) => {
          const plan = setting.setting_key.replace('stripe_commission_', '') as keyof CommissionSettings;
          const value = setting.setting_value as { percentage: number };
          newCommissions[plan] = value.percentage || 5.0;
        });
        setCommissions(newCommissions);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: 'Erro ao carregar configurações',
        description: 'Não foi possível carregar as configurações atuais.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update each commission setting
      const updates = [
        {
          setting_key: 'stripe_commission_free',
          setting_value: {
            percentage: commissions.free,
            stripe_fee_percentage: 0.029,
            stripe_fee_fixed: 0.30,
          },
        },
        {
          setting_key: 'stripe_commission_pro',
          setting_value: {
            percentage: commissions.pro,
            stripe_fee_percentage: 0.029,
            stripe_fee_fixed: 0.30,
          },
        },
        {
          setting_key: 'stripe_commission_premium',
          setting_value: {
            percentage: commissions.premium,
            stripe_fee_percentage: 0.029,
            stripe_fee_fixed: 0.30,
          },
        },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('platform_settings')
          .update({
            setting_value: update.setting_value,
            updated_at: new Date().toISOString(),
          })
          .eq('setting_key', update.setting_key);

        if (error) throw error;
      }

      toast({
        title: 'Configurações salvas',
        description: 'As configurações foram atualizadas com sucesso.',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações do Sistema</h1>
        <p className="text-muted-foreground">Configure parâmetros da plataforma e integração Stripe</p>
      </div>

      <Card className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Comissões por Plano (Woorkins)</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Defina a porcentagem de comissão que a plataforma cobra de cada plano.{' '}
            {activeGateway === 'stripe' ? (
              <>A taxa do Stripe (2.9% + R$0.30) é fixa e será adicionada automaticamente.</>
            ) : (
              <>As taxas do Mercado Pago (Cartão: 4,98% | PIX: 0,99%) são fixas e serão adicionadas automaticamente.</>
            )}
          </p>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Plano Grátis (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={commissions.free}
                  onChange={(e) => setCommissions({ ...commissions, free: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">Taxa Stripe: 2.9% + R$0.30 (fixo)</p>
              </div>
              <div className="space-y-2">
                <Label>Plano Pro (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={commissions.pro}
                  onChange={(e) => setCommissions({ ...commissions, pro: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">Taxa Stripe: 2.9% + R$0.30 (fixo)</p>
              </div>
              <div className="space-y-2">
                <Label>Plano Premium (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={commissions.premium}
                  onChange={(e) => setCommissions({ ...commissions, premium: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">
                  {activeGateway === 'stripe' ? 'Taxa Stripe: 2.9% + R$0.30 (fixo)' : 'Taxas Mercado Pago: Cartão 4.98% | PIX 0.99%'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-lg font-semibold mb-4">Exemplo de Cálculo</h3>
          <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
            <p><strong>Valor do Serviço:</strong> R$ 1.000,00</p>
            
            {activeGateway === 'stripe' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                <div>
                  <p className="font-medium">Plano Grátis ({commissions.free}%)</p>
                  <p>Comissão Woorkins: R$ {(1000 * commissions.free / 100).toFixed(2)}</p>
                  <p>Taxa Stripe: R$ {(1000 * 0.029 + 0.30).toFixed(2)}</p>
                  <p className="font-semibold">Total taxas: R$ {(1000 * commissions.free / 100 + 1000 * 0.029 + 0.30).toFixed(2)}</p>
                  <p className="text-green-600">Freelancer recebe: R$ {(1000 - (1000 * commissions.free / 100 + 1000 * 0.029 + 0.30)).toFixed(2)}</p>
                </div>
                <div>
                  <p className="font-medium">Plano Pro ({commissions.pro}%)</p>
                  <p>Comissão Woorkins: R$ {(1000 * commissions.pro / 100).toFixed(2)}</p>
                  <p>Taxa Stripe: R$ {(1000 * 0.029 + 0.30).toFixed(2)}</p>
                  <p className="font-semibold">Total taxas: R$ {(1000 * commissions.pro / 100 + 1000 * 0.029 + 0.30).toFixed(2)}</p>
                  <p className="text-green-600">Freelancer recebe: R$ {(1000 - (1000 * commissions.pro / 100 + 1000 * 0.029 + 0.30)).toFixed(2)}</p>
                </div>
                <div>
                  <p className="font-medium">Plano Premium ({commissions.premium}%)</p>
                  <p>Comissão Woorkins: R$ {(1000 * commissions.premium / 100).toFixed(2)}</p>
                  <p>Taxa Stripe: R$ {(1000 * 0.029 + 0.30).toFixed(2)}</p>
                  <p className="font-semibold">Total taxas: R$ {(1000 * commissions.premium / 100 + 1000 * 0.029 + 0.30).toFixed(2)}</p>
                  <p className="text-green-600">Freelancer recebe: R$ {(1000 - (1000 * commissions.premium / 100 + 1000 * 0.029 + 0.30)).toFixed(2)}</p>
                </div>
              </div>
            ) : (
              <>
                <p className="font-medium mt-4 mb-2">Pagamento com Cartão de Crédito (4,98%)</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="font-medium">Plano Grátis ({commissions.free}%)</p>
                    <p>Comissão Woorkins: R$ {(1000 * commissions.free / 100).toFixed(2)}</p>
                    <p>Taxa Mercado Pago: R$ {(1000 * 0.0498).toFixed(2)}</p>
                    <p className="font-semibold">Total taxas: R$ {(1000 * commissions.free / 100 + 1000 * 0.0498).toFixed(2)}</p>
                    <p className="text-green-600">Freelancer recebe: R$ {(1000 - (1000 * commissions.free / 100 + 1000 * 0.0498)).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="font-medium">Plano Pro ({commissions.pro}%)</p>
                    <p>Comissão Woorkins: R$ {(1000 * commissions.pro / 100).toFixed(2)}</p>
                    <p>Taxa Mercado Pago: R$ {(1000 * 0.0498).toFixed(2)}</p>
                    <p className="font-semibold">Total taxas: R$ {(1000 * commissions.pro / 100 + 1000 * 0.0498).toFixed(2)}</p>
                    <p className="text-green-600">Freelancer recebe: R$ {(1000 - (1000 * commissions.pro / 100 + 1000 * 0.0498)).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="font-medium">Plano Premium ({commissions.premium}%)</p>
                    <p>Comissão Woorkins: R$ {(1000 * commissions.premium / 100).toFixed(2)}</p>
                    <p>Taxa Mercado Pago: R$ {(1000 * 0.0498).toFixed(2)}</p>
                    <p className="font-semibold">Total taxas: R$ {(1000 * commissions.premium / 100 + 1000 * 0.0498).toFixed(2)}</p>
                    <p className="text-green-600">Freelancer recebe: R$ {(1000 - (1000 * commissions.premium / 100 + 1000 * 0.0498)).toFixed(2)}</p>
                  </div>
                </div>

                <p className="font-medium mt-4 mb-2">Pagamento com PIX (0,99%)</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="font-medium">Plano Grátis ({commissions.free}%)</p>
                    <p>Comissão Woorkins: R$ {(1000 * commissions.free / 100).toFixed(2)}</p>
                    <p>Taxa Mercado Pago: R$ {(1000 * 0.0099).toFixed(2)}</p>
                    <p className="font-semibold">Total taxas: R$ {(1000 * commissions.free / 100 + 1000 * 0.0099).toFixed(2)}</p>
                    <p className="text-green-600">Freelancer recebe: R$ {(1000 - (1000 * commissions.free / 100 + 1000 * 0.0099)).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="font-medium">Plano Pro ({commissions.pro}%)</p>
                    <p>Comissão Woorkins: R$ {(1000 * commissions.pro / 100).toFixed(2)}</p>
                    <p>Taxa Mercado Pago: R$ {(1000 * 0.0099).toFixed(2)}</p>
                    <p className="font-semibold">Total taxas: R$ {(1000 * commissions.pro / 100 + 1000 * 0.0099).toFixed(2)}</p>
                    <p className="text-green-600">Freelancer recebe: R$ {(1000 - (1000 * commissions.pro / 100 + 1000 * 0.0099)).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="font-medium">Plano Premium ({commissions.premium}%)</p>
                    <p>Comissão Woorkins: R$ {(1000 * commissions.premium / 100).toFixed(2)}</p>
                    <p>Taxa Mercado Pago: R$ {(1000 * 0.0099).toFixed(2)}</p>
                    <p className="font-semibold">Total taxas: R$ {(1000 * commissions.premium / 100 + 1000 * 0.0099).toFixed(2)}</p>
                    <p className="text-green-600">Freelancer recebe: R$ {(1000 - (1000 * commissions.premium / 100 + 1000 * 0.0099)).toFixed(2)}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-lg font-semibold mb-4">
            {activeGateway === 'stripe' ? 'Integração Stripe' : 'Integração Mercado Pago'}
          </h3>
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg flex items-center justify-between">
              <div>
                <p className="font-medium text-green-900 dark:text-green-100">
                  ✓ {activeGateway === 'stripe' ? 'Stripe' : 'Mercado Pago'} Conectado
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {activeGateway === 'stripe' 
                    ? 'Chaves configuradas e funcionando'
                    : 'Access Token e chaves configuradas e funcionando'
                  }
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              As chaves do {activeGateway === 'stripe' ? 'Stripe' : 'Mercado Pago'} estão configuradas como secrets no backend. Para atualizar, acesse as configurações de secrets do projeto.
            </p>
            {activeGateway === 'mercadopago' && (
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">Taxas do Mercado Pago</p>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Cartão de crédito: 4,98%</li>
                  <li>• PIX: 0,99%</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        <Button onClick={handleSave} className="w-full" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Configurações
        </Button>
      </Card>
    </div>
  );
}
