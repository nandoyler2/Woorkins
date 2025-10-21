import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Shield, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';

export default function PoliticaPrivacidade() {
  const [content, setContent] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Política de Privacidade - Woorkins';
  }, []);

  useEffect(() => {
    loadPrivacy();
  }, []);

  const loadPrivacy = async () => {
    try {
      const { data, error } = await supabase
        .from('legal_pages')
        .select('*')
        .eq('slug', 'politica-de-privacidade')
        .single();

      if (error) throw error;

      if (data) {
        setContent(data.content);
        setLastUpdated(new Date(data.last_updated).toLocaleDateString('pt-BR'));
      }
    } catch (error) {
      console.error('Error loading privacy policy:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <Header />
      
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary/10 mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Política de Privacidade</h1>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Última atualização: {lastUpdated}</span>
          </div>
        </div>

        {/* LGPD Badge */}
        <div className="mb-8">
          <Card className="p-4 bg-gradient-to-r from-green-500/10 to-blue-500/10 border-green-500/20">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-semibold">Conformidade com a LGPD</p>
                <p className="text-sm text-muted-foreground">
                  Esta política está em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018)
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Content */}
        <Card className="p-8 md:p-12 bg-card/50 backdrop-blur-sm">
          <div className="prose prose-lg dark:prose-invert max-w-none
            prose-headings:text-foreground
            prose-h1:text-3xl prose-h1:font-bold prose-h1:mb-6 prose-h1:mt-8
            prose-h2:text-2xl prose-h2:font-bold prose-h2:mb-4 prose-h2:mt-8 prose-h2:pb-2 prose-h2:border-b prose-h2:border-border
            prose-h3:text-xl prose-h3:font-semibold prose-h3:mb-3 prose-h3:mt-6
            prose-p:text-foreground/90 prose-p:leading-relaxed prose-p:mb-4
            prose-strong:text-primary prose-strong:font-semibold
            prose-ul:my-4 prose-ul:ml-6
            prose-li:text-foreground/90 prose-li:mb-2
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
          ">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </Card>

        {/* CTA Footer */}
        <div className="mt-12 space-y-6">
          <Card className="p-6 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
            <p className="text-lg mb-4">
              <strong>Contato sobre Privacidade</strong>
            </p>
            <div className="space-y-2 text-muted-foreground">
              <p>Para questões sobre privacidade e proteção de dados:</p>
              <p><strong>Email:</strong> <a href="mailto:privacidade@woorkins.com" className="text-primary hover:underline">privacidade@woorkins.com</a></p>
              <p><strong>DPO:</strong> <a href="mailto:dpo@woorkins.com" className="text-primary hover:underline">dpo@woorkins.com</a></p>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-500/5 to-transparent border-green-500/20">
            <p className="text-lg mb-4">
              <strong>Seus Direitos (LGPD)</strong>
            </p>
            <p className="text-muted-foreground mb-3">
              Você tem direito a acessar, corrigir, excluir e portar seus dados. Entre em contato para exercer seus direitos.
            </p>
            <p className="text-sm text-muted-foreground">
              Reclamações podem ser feitas à ANPD: <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.gov.br/anpd</a>
            </p>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}
