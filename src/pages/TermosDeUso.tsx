import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, FileText, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';

export default function TermosDeUso() {
  const [content, setContent] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTerms();
  }, []);

  const loadTerms = async () => {
    try {
      const { data, error } = await supabase
        .from('legal_pages')
        .select('*')
        .eq('slug', 'termos-de-uso')
        .single();

      if (error) throw error;

      if (data) {
        setContent(data.content);
        setLastUpdated(new Date(data.last_updated).toLocaleDateString('pt-BR'));
      }
    } catch (error) {
      console.error('Error loading terms:', error);
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
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Termos de Uso</h1>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Última atualização: {lastUpdated}</span>
          </div>
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
        <div className="mt-12 text-center">
          <Card className="p-6 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
            <p className="text-lg mb-4">
              <strong>Dúvidas sobre os termos?</strong>
            </p>
            <p className="text-muted-foreground">
              Entre em contato conosco: <a href="mailto:suporte@woorkins.com" className="text-primary hover:underline">suporte@woorkins.com</a>
            </p>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}
