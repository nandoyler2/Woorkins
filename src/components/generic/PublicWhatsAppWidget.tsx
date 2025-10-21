import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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

interface PublicWhatsAppWidgetProps {
  entityType: 'business' | 'user';
  entityId: string;
  entityName: string;
}

export const PublicWhatsAppWidget = ({ entityType, entityId, entityName }: PublicWhatsAppWidgetProps) => {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    loadConfig();
  }, [entityId]);

  const loadConfig = async () => {
    try {
      const tableName = entityType === 'business' ? 'business_whatsapp_config' : 'user_whatsapp_config';
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq(`${entityType}_id`, entityId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data && data.phone) {
        setConfig({
          phone: data.phone,
          welcome_message: data.welcome_message || 'Olá! Gostaria de conversar com você.',
          auto_open: data.auto_open || false,
          questions: data.questions || []
        });
      }
    } catch (error) {
      console.error('Error loading WhatsApp config:', error);
    }
  };

  const handleOpenWhatsApp = () => {
    if (!config) return;

    let message = config.welcome_message;

    if (!config.auto_open && config.questions.length > 0) {
      const answeredQuestions = config.questions
        .filter(q => answers[q.id])
        .map(q => `*${q.question}*\n${answers[q.id]}`)
        .join('\n\n');

      if (answeredQuestions) {
        message += '\n\n' + answeredQuestions;
      }
    }

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${config.phone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    setIsOpen(false);
  };

  const handleClick = () => {
    if (!config) return;

    if (config.auto_open || config.questions.length === 0) {
      handleOpenWhatsApp();
    } else {
      setIsOpen(true);
    }
  };

  if (!config) return null;

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 left-6 z-50">
        <Button
          onClick={handleClick}
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg bg-[#25D366] hover:bg-[#20BA59] text-white"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
        
        {/* Tooltip */}
        <div className="absolute left-16 bottom-0 bg-card border rounded-lg px-3 py-2 shadow-md whitespace-nowrap animate-in fade-in slide-in-from-left-2 pointer-events-none">
          <p className="text-sm font-medium">Fale com {entityName}</p>
        </div>
      </div>

      {/* Questions Dialog */}
      {isOpen && !config.auto_open && config.questions.length > 0 && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md max-h-[80vh] overflow-auto">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>Fale com {entityName}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Responda as perguntas abaixo (opcional) e clique em enviar para abrir o WhatsApp
              </p>

              {config.questions.map((question) => (
                <div key={question.id} className="space-y-2">
                  <Label>{question.question}</Label>
                  <Textarea
                    placeholder="Sua resposta..."
                    value={answers[question.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                    rows={3}
                  />
                </div>
              ))}

              <Button onClick={handleOpenWhatsApp} className="w-full">
                <MessageCircle className="h-4 w-4 mr-2" />
                Abrir WhatsApp
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};
