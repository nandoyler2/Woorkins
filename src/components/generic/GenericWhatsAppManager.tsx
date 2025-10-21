import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface WhatsAppQuestion {
  id: string;
  question: string;
  order: number;
}

interface WhatsAppConfig {
  phone: string;
  welcome_message: string;
  auto_open: boolean;
  questions: WhatsAppQuestion[];
}

interface GenericWhatsAppManagerProps {
  entityType: 'business' | 'user';
  entityId: string;
}

export const GenericWhatsAppManager = ({ entityType, entityId }: GenericWhatsAppManagerProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<WhatsAppConfig>({
    phone: '',
    welcome_message: 'Olá! Gostaria de conversar com você.',
    auto_open: false,
    questions: []
  });

  useEffect(() => {
    loadConfig();
  }, [entityId]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      
      const tableName = entityType === 'business' ? 'business_whatsapp_config' : 'user_whatsapp_config';
      const { data, error } = await supabase
        .from(tableName as any)
        .select('*')
        .eq(`${entityType}_id`, entityId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        const config = data as any;
        setConfig({
          phone: config.phone || '',
          welcome_message: config.welcome_message || 'Olá! Gostaria de conversar com você.',
          auto_open: config.auto_open || false,
          questions: Array.isArray(config.questions) ? config.questions as unknown as WhatsAppQuestion[] : []
        });
      }
    } catch (error) {
      console.error('Error loading WhatsApp config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const tableName = entityType === 'business' ? 'business_whatsapp_config' : 'user_whatsapp_config';
      const columnName = `${entityType}_id`;

      const { error } = await supabase
        .from(tableName as any)
        .upsert({
          [columnName]: entityId,
          phone: config.phone,
          welcome_message: config.welcome_message,
          auto_open: config.auto_open,
          questions: config.questions
        } as any);

      if (error) throw error;

      toast({
        title: "Configurações salvas",
        description: "Suas configurações de WhatsApp foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error('Error saving WhatsApp config:', error);
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar as configurações.",
        variant: "destructive",
      });
    }
  };

  const addQuestion = () => {
    const newQuestion: WhatsAppQuestion = {
      id: crypto.randomUUID(),
      question: '',
      order: config.questions.length
    };
    setConfig({ ...config, questions: [...config.questions, newQuestion] });
  };

  const removeQuestion = (id: string) => {
    setConfig({
      ...config,
      questions: config.questions.filter(q => q.id !== id)
    });
  };

  const updateQuestion = (id: string, question: string) => {
    setConfig({
      ...config,
      questions: config.questions.map(q => 
        q.id === id ? { ...q, question } : q
      )
    });
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>WhatsApp Widget</CardTitle>
        <CardDescription>
          Configure o botão flutuante de WhatsApp que aparecerá no seu perfil público
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="phone">Número do WhatsApp</Label>
          <Input
            id="phone"
            placeholder="Ex: 5511999999999"
            value={config.phone}
            onChange={(e) => setConfig({ ...config, phone: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Digite o número com código do país (ex: 55 para Brasil) sem espaços ou caracteres especiais
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="welcome">Mensagem de Boas-vindas</Label>
          <Textarea
            id="welcome"
            placeholder="Mensagem que será enviada automaticamente"
            value={config.welcome_message}
            onChange={(e) => setConfig({ ...config, welcome_message: e.target.value })}
            rows={3}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="auto-open"
            checked={config.auto_open}
            onCheckedChange={(checked) => setConfig({ ...config, auto_open: checked })}
          />
          <Label htmlFor="auto-open" className="cursor-pointer">
            Abrir WhatsApp diretamente (sem caixa de perguntas)
          </Label>
        </div>

        {!config.auto_open && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Perguntas Rápidas</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addQuestion}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Pergunta
              </Button>
            </div>
            
            {config.questions.map((q, index) => (
              <div key={q.id} className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder={`Pergunta ${index + 1}`}
                    value={q.question}
                    onChange={(e) => updateQuestion(q.id, e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeQuestion(q.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            {config.questions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Adicione perguntas rápidas para facilitar o contato
              </p>
            )}
          </div>
        )}

        <Button onClick={handleSave} className="w-full">
          Salvar Configurações
        </Button>
      </CardContent>
    </Card>
  );
};
