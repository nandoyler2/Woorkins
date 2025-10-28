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
        .from(tableName as any)
        .select('*')
        .eq(`${entityType}_id`, entityId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        const config = data as any;
        if (config.phone) {
          setConfig({
            phone: config.phone,
            welcome_message: config.welcome_message || 'Olá! Gostaria de conversar com você.',
            auto_open: config.auto_open || false,
            questions: Array.isArray(config.questions) ? config.questions as unknown as WhatsAppQuestion[] : []
          });
        }
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
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        {/* Tooltip - balãozinho discreto */}
        <div className="bg-gradient-to-r from-[#25D366]/90 to-[#128C7E]/90 backdrop-blur-sm border border-[#25D366]/30 rounded-lg px-3 py-2 shadow-xl pointer-events-none">
          <p className="text-xs text-white font-semibold">Fale com {entityName}</p>
        </div>
        
        {/* WhatsApp Icon Button - apenas o ícone oficial */}
        <button
          onClick={handleClick}
          className="h-16 w-16 rounded-full shadow-2xl bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:scale-125 hover:shadow-[#25D366]/50 transition-all duration-300 flex items-center justify-center ring-4 ring-[#25D366]/20 animate-pulse"
          aria-label={`Falar com ${entityName} pelo WhatsApp`}
        >
          <svg 
            viewBox="0 0 24 24" 
            className="h-8 w-8 fill-white"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
        </button>
      </div>

      {/* Questions Dialog */}
      {isOpen && !config.auto_open && config.questions.length > 0 && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md max-h-[80vh] overflow-auto">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-gradient-to-r from-[#25D366]/10 to-[#128C7E]/10 -m-6 mb-4 p-6 rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-[#25D366]" />
                Fale com {entityName}
              </CardTitle>
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

              <Button onClick={handleOpenWhatsApp} className="w-full bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:shadow-lg transition-all">
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
