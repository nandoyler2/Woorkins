import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Save, X, Check } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  slug: string;
  commission_percentage: number;
  features: Array<{ text: string; included: boolean }>;
  display_order: number;
  active: boolean;
  recommended: boolean;
}

export default function PlansSettings() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Plan>>({
    name: '',
    slug: '',
    commission_percentage: 0,
    features: [],
    display_order: 0,
    active: true,
    recommended: false
  });
  const [newFeature, setNewFeature] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('display_order');

      if (error) throw error;
      setPlans((data || []).map(p => ({
        ...p,
        features: typeof p.features === 'string' 
          ? JSON.parse(p.features) 
          : (p.features as any)
      })));
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar planos',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.slug) {
        toast({
          title: 'Campos obrigatórios',
          description: 'Preencha o nome e o slug do plano',
          variant: 'destructive'
        });
        return;
      }

      if (editingId) {
        const { error } = await supabase
          .from('subscription_plans')
          .update(formData as any)
          .eq('id', editingId);

        if (error) throw error;
        toast({ title: 'Plano atualizado com sucesso!' });
      } else {
        const { error } = await supabase
          .from('subscription_plans')
          .insert([formData as any]);

        if (error) throw error;
        toast({ title: 'Plano criado com sucesso!' });
      }

      setEditingId(null);
      setFormData({
        name: '',
        slug: '',
        commission_percentage: 0,
        features: [],
        display_order: 0,
        active: true,
        recommended: false
      });
      loadPlans();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar plano',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (plan: Plan) => {
    setEditingId(plan.id);
    setFormData(plan);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este plano?')) return;

    try {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Plano excluído com sucesso!' });
      loadPlans();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir plano',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const addFeature = () => {
    if (!newFeature.trim()) return;

    setFormData({
      ...formData,
      features: [
        ...(formData.features || []),
        { text: newFeature, included: true }
      ]
    });
    setNewFeature('');
  };

  const removeFeature = (index: number) => {
    const features = [...(formData.features || [])];
    features.splice(index, 1);
    setFormData({ ...formData, features });
  };

  const toggleFeatureIncluded = (index: number) => {
    const features = [...(formData.features || [])];
    features[index].included = !features[index].included;
    setFormData({ ...formData, features });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Gerenciar Planos</h2>
          <p className="text-muted-foreground mt-2">
            Configure os planos de assinatura e suas comissões
          </p>
        </div>
      </div>

      {/* Formulário */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">
            {editingId ? 'Editar Plano' : 'Novo Plano'}
          </h3>
          {editingId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingId(null);
                setFormData({
                  name: '',
                  slug: '',
                  commission_percentage: 0,
                  features: [],
                  display_order: 0,
                  active: true,
                  recommended: false
                });
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Nome do Plano *
              </label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ex: Pro"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Slug *</label>
              <Input
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value })
                }
                placeholder="Ex: pro"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Comissão (%)
              </label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.commission_percentage}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    commission_percentage: parseFloat(e.target.value)
                  })
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Ordem de Exibição
              </label>
              <Input
                type="number"
                min="0"
                value={formData.display_order}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    display_order: parseInt(e.target.value)
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium block">Opções</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) =>
                      setFormData({ ...formData, active: e.target.checked })
                    }
                    className="rounded border-input"
                  />
                  <span className="text-sm">Ativo</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.recommended}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        recommended: e.target.checked
                      })
                    }
                    className="rounded border-input"
                  />
                  <span className="text-sm">Recomendado</span>
                </label>
              </div>
            </div>
          </div>

          {/* Features */}
          <div>
            <label className="text-sm font-medium mb-2 block">Features</label>
            <div className="flex gap-2 mb-3">
              <Input
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                placeholder="Digite uma feature..."
                onKeyDown={(e) => e.key === 'Enter' && addFeature()}
              />
              <Button type="button" onClick={addFeature}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {formData.features?.map((feature, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 border rounded"
                >
                  <button
                    type="button"
                    onClick={() => toggleFeatureIncluded(idx)}
                    className={`shrink-0 ${
                      feature.included
                        ? 'text-green-600'
                        : 'text-muted-foreground'
                    }`}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <span className="flex-1">{feature.text}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFeature(idx)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleSave} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {editingId ? 'Atualizar Plano' : 'Criar Plano'}
          </Button>
        </div>
      </Card>

      {/* Lista de Planos */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Planos Cadastrados</h3>
        {plans.map((plan) => (
          <Card key={plan.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-lg">{plan.name}</h4>
                  {!plan.active && <Badge variant="secondary">Inativo</Badge>}
                  {plan.recommended && (
                    <Badge className="bg-primary">Recomendado</Badge>
                  )}
                  <Badge variant="outline">{plan.commission_percentage}%</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Slug: {plan.slug} | Ordem: {plan.display_order}
                </p>
                <div className="space-y-1">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      {feature.included ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span>{feature.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(plan)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(plan.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
