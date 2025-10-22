import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { X, Plus } from "lucide-react";

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

interface UnifiedWhatsAppManagerProps {
  profileId: string;
}

export function UnifiedWhatsAppManager({ profileId }: UnifiedWhatsAppManagerProps) {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<WhatsAppConfig>({
    phone: "",
    welcome_message: "Olá! Gostaria de conversar com você.",
    auto_open: false,
    questions: [],
  });
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
  }, [profileId]);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('profile_whatsapp_config')
        .select('*')
        .eq('target_profile_id', profileId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        const configData = data as any;
        const questionsData = configData.questions;
        setConfig({
          phone: configData.phone || "",
          welcome_message: configData.welcome_message || "Olá! Gostaria de conversar com você.",
          auto_open: configData.auto_open || false,
          questions: Array.isArray(questionsData) ? questionsData : [],
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar configurações",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const validateAndFormatPhone = (phone: string): string | null => {
    const cleaned = phone.replace(/\D/g, '');
    
    if (!cleaned.startsWith('55')) {
      toast({
        title: "Erro",
        description: "O número deve começar com o código do Brasil (55)",
        variant: "destructive",
      });
      return null;
    }

    if (cleaned.length < 12 || cleaned.length > 13) {
      toast({
        title: "Erro",
        description: "Número inválido. Use o formato: 5511999999999",
        variant: "destructive",
      });
      return null;
    }

    const ddd = cleaned.substring(2, 4);
    const validDDDs = ['11', '12', '13', '14', '15', '16', '17', '18', '19', '21', '22', '24', '27', '28', '31', '32', '33', '34', '35', '37', '38', '41', '42', '43', '44', '45', '46', '47', '48', '49', '51', '53', '54', '55', '61', '62', '63', '64', '65', '66', '67', '68', '69', '71', '73', '74', '75', '77', '79', '81', '82', '83', '84', '85', '86', '87', '88', '89', '91', '92', '93', '94', '95', '96', '97', '98', '99'];

    if (!validDDDs.includes(ddd)) {
      toast({
        title: "Erro",
        description: "DDD inválido",
        variant: "destructive",
      });
      return null;
    }

    return cleaned;
  };

  const handleSave = async () => {
    const validPhone = validateAndFormatPhone(config.phone);
    if (!validPhone) return;

    setLoading(true);
    try {
      const configData = {
        phone: validPhone,
        welcome_message: config.welcome_message,
        auto_open: config.auto_open,
        questions: config.questions,
        target_profile_id: profileId,
      };

      const { data: existing } = await supabase
        .from('profile_whatsapp_config')
        .select('id')
        .eq('target_profile_id', profileId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('profile_whatsapp_config')
          .update(configData)
          .eq('target_profile_id', profileId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('profile_whatsapp_config')
          .insert([configData]);

        if (error) throw error;
      }

      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    setConfig({
      ...config,
      questions: [
        ...config.questions,
        { id: Date.now().toString(), question: "", order: config.questions.length },
      ],
    });
  };

  const removeQuestion = (id: string) => {
    setConfig({
      ...config,
      questions: config.questions.filter((q) => q.id !== id),
    });
  };

  const updateQuestion = (id: string, question: string) => {
    setConfig({
      ...config,
      questions: config.questions.map((q) =>
        q.id === id ? { ...q, question } : q
      ),
    });
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Widget WhatsApp</h3>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Número do WhatsApp</label>
          <Input
            placeholder="5511999999999"
            value={config.phone}
            onChange={(e) => setConfig({ ...config, phone: e.target.value })}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Formato: código do país + DDD + número (ex: 5511999999999)
          </p>
        </div>

        <div>
          <label className="text-sm font-medium">Mensagem de boas-vindas</label>
          <Textarea
            placeholder="Olá! Gostaria de conversar com você."
            value={config.welcome_message}
            onChange={(e) => setConfig({ ...config, welcome_message: e.target.value })}
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Abrir automaticamente</label>
          <Switch
            checked={config.auto_open}
            onCheckedChange={(checked) => setConfig({ ...config, auto_open: checked })}
          />
        </div>

        {!config.auto_open && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Perguntas Rápidas</label>
              <Button size="sm" variant="outline" onClick={addQuestion}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>

            {config.questions.map((question) => (
              <div key={question.id} className="flex gap-2">
                <Input
                  placeholder="Digite a pergunta"
                  value={question.question}
                  onChange={(e) => updateQuestion(question.id, e.target.value)}
                />
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => removeQuestion(question.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button onClick={handleSave} disabled={loading}>
          Salvar Configurações
        </Button>
      </div>
    </Card>
  );
}
