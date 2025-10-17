import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  MessageSquare,
  DollarSign,
  Briefcase,
  Navigation,
  HelpCircle
} from 'lucide-react';

interface FAQ {
  id: string;
  keywords: string[];
  question_pattern: string;
  response: string;
  link: string | null;
  category: string;
  active: boolean;
  priority: number;
}

const CATEGORIES = [
  { value: 'woorkoins', label: 'Woorkoins', icon: DollarSign },
  { value: 'pricing', label: 'Preços', icon: DollarSign },
  { value: 'projects', label: 'Projetos', icon: Briefcase },
  { value: 'navigation', label: 'Navegação', icon: Navigation },
  { value: 'general', label: 'Geral', icon: HelpCircle }
];

export default function AISettings() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<FAQ>>({
    keywords: [],
    question_pattern: '',
    response: '',
    link: '',
    category: 'general',
    active: true,
    priority: 5
  });
  const { toast } = useToast();

  useEffect(() => {
    loadFAQs();
  }, []);

  const loadFAQs = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_faq')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFaqs(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar FAQs',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.question_pattern || !formData.response) {
        toast({
          title: 'Campos obrigatórios',
          description: 'Preencha o padrão da pergunta e a resposta',
          variant: 'destructive'
        });
        return;
      }

      if (editingId) {
        const { error } = await supabase
          .from('ai_faq')
          .update(formData as any)
          .eq('id', editingId);

        if (error) throw error;
        toast({ title: 'FAQ atualizado com sucesso!' });
      } else {
        const { error } = await supabase.from('ai_faq').insert([formData as any]);

        if (error) throw error;
        toast({ title: 'FAQ criado com sucesso!' });
      }

      setEditingId(null);
      setFormData({
        keywords: [],
        question_pattern: '',
        response: '',
        link: '',
        category: 'general',
        active: true,
        priority: 5
      });
      loadFAQs();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar FAQ',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (faq: FAQ) => {
    setEditingId(faq.id);
    setFormData(faq);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este FAQ?')) return;

    try {
      const { error } = await supabase.from('ai_faq').delete().eq('id', id);

      if (error) throw error;
      toast({ title: 'FAQ excluído com sucesso!' });
      loadFAQs();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir FAQ',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('ai_faq')
        .update({ active: !active })
        .eq('id', id);

      if (error) throw error;
      loadFAQs();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find((c) => c.value === category);
    const Icon = cat?.icon || HelpCircle;
    return <Icon className="h-4 w-4" />;
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
          <h2 className="text-3xl font-bold">Configurações de IA</h2>
          <p className="text-muted-foreground mt-2">
            Gerencie as respostas automáticas (FAQ) do assistente de IA
          </p>
        </div>
      </div>

      {/* Formulário de Criação/Edição */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {editingId ? 'Editar FAQ' : 'Novo FAQ'}
          </h3>
          {editingId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingId(null);
                setFormData({
                  keywords: [],
                  question_pattern: '',
                  response: '',
                  link: '',
                  category: 'general',
                  active: true,
                  priority: 5
                });
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Padrão da Pergunta *
            </label>
            <Input
              value={formData.question_pattern}
              onChange={(e) =>
                setFormData({ ...formData, question_pattern: e.target.value })
              }
              placeholder="Ex: Como funciona Woorkoins"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Palavras-chave (separadas por vírgula) *
            </label>
            <Input
              value={formData.keywords?.join(', ')}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  keywords: e.target.value.split(',').map((k) => k.trim())
                })
              }
              placeholder="Ex: woorkoins, funciona, o que é"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Resposta *
            </label>
            <Textarea
              value={formData.response}
              onChange={(e) =>
                setFormData({ ...formData, response: e.target.value })
              }
              placeholder="Digite a resposta que será enviada ao usuário..."
              rows={8}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Link (opcional)
            </label>
            <Input
              value={formData.link || ''}
              onChange={(e) =>
                setFormData({ ...formData, link: e.target.value })
              }
              placeholder="https://woorkins.com/..."
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Categoria
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Prioridade (0-10)
              </label>
              <Input
                type="number"
                min="0"
                max="10"
                value={formData.priority}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority: parseInt(e.target.value)
                  })
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <select
                value={formData.active ? 'true' : 'false'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    active: e.target.value === 'true'
                  })
                }
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>
          </div>

          <Button onClick={handleSave} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {editingId ? 'Atualizar FAQ' : 'Criar FAQ'}
          </Button>
        </div>
      </Card>

      {/* Lista de FAQs */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">FAQs Cadastrados</h3>
        {faqs.map((faq) => (
          <Card key={faq.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getCategoryIcon(faq.category)}
                  <h4 className="font-semibold">{faq.question_pattern}</h4>
                  {!faq.active && (
                    <Badge variant="secondary">Inativo</Badge>
                  )}
                  <Badge variant="outline">
                    Prioridade: {faq.priority}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2 whitespace-pre-wrap">
                  {faq.response.substring(0, 150)}
                  {faq.response.length > 150 && '...'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {faq.keywords.map((keyword, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleActive(faq.id, faq.active)}
                >
                  {faq.active ? 'Desativar' : 'Ativar'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(faq)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(faq.id)}
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
