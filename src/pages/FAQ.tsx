import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, HelpCircle, BookOpen, DollarSign, Users, MessageCircle, Shield, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface FAQ {
  id: string;
  question_pattern: string;
  response: string;
  faq_display_response: string | null;
  category: string;
  keywords: string[];
}

const getCategoryIcon = (category: string) => {
  const icons: Record<string, any> = {
    'geral': BookOpen,
    'pagamentos': DollarSign,
    'projetos': Users,
    'mensagens': MessageCircle,
    'verificação': Shield,
    'conta': Settings,
  };
  const Icon = icons[category.toLowerCase()] || HelpCircle;
  return <Icon className="w-4 h-4" />;
};

export default function FAQ() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    document.title = 'Perguntas Frequentes - Woorkins';
  }, []);

  useEffect(() => {
    loadFAQs();
  }, []);

  const loadFAQs = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_faq')
        .select('*')
        .eq('active', true)
        .order('priority', { ascending: false });

      if (error) throw error;
      setFaqs(data || []);
    } catch (error) {
      console.error('Error loading FAQs:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', ...Array.from(new Set(faqs.map(f => f.category)))];

  const filteredFAQs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const displayText = faq.faq_display_response || faq.response;
    const matchesSearch = searchQuery === '' || 
      faq.question_pattern.toLowerCase().includes(searchQuery.toLowerCase()) ||
      displayText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const getCategoryLabel = (cat: string) => {
    if (cat === 'all') return 'Todas';
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      <Header />
      
      <div className="container mx-auto px-4 py-12 max-w-woorkins">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-2xl mb-6 shadow-glow">
            <HelpCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            Perguntas Frequentes
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Encontre respostas rápidas para as dúvidas mais comuns sobre o Woorkins
          </p>
        </div>

        {/* Search */}
        <Card className="mb-8 shadow-elegant border-2 border-primary/10">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                placeholder="Buscar nas perguntas frequentes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 border-primary/20 focus:border-primary"
              />
            </div>
            {searchQuery && (
              <p className="text-sm text-muted-foreground mt-3">
                {filteredFAQs.length} {filteredFAQs.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Categories */}
        <div className="flex flex-wrap gap-3 mb-10 justify-center">
          {categories.map(cat => (
            <Badge
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              className={`cursor-pointer px-5 py-2.5 text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                selectedCategory === cat 
                  ? 'bg-gradient-primary text-white shadow-glow' 
                  : 'hover:border-primary hover:bg-primary/5'
              }`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat !== 'all' && getCategoryIcon(cat)}
              {getCategoryLabel(cat)}
            </Badge>
          ))}
        </div>

        {/* FAQs */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredFAQs.length === 0 ? (
          <Card className="p-12 shadow-elegant border-2 border-dashed">
            <div className="text-center space-y-4">
              <HelpCircle className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
              <div>
                <h3 className="text-xl font-bold mb-2">Nenhuma pergunta encontrada</h3>
                <p className="text-muted-foreground">
                  Tente ajustar sua busca ou selecionar outra categoria
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="shadow-elegant border-2 border-primary/10">
            <CardContent className="p-8">
              <Accordion type="single" collapsible className="w-full space-y-4">
                {filteredFAQs.map((faq, index) => (
                  <AccordionItem 
                    key={faq.id} 
                    value={`item-${index}`}
                    className="border-2 border-primary/10 rounded-xl px-6 py-2 hover:border-primary/30 transition-all duration-200"
                  >
                    <AccordionTrigger className="text-left hover:text-primary transition-colors hover:no-underline">
                      <div className="flex items-start gap-3 w-full">
                        <div className="mt-1 text-primary">
                          {getCategoryIcon(faq.category)}
                        </div>
                        <span className="font-semibold text-base">{faq.question_pattern}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      <div className="pt-4 pb-2 pl-9">
                        <div className="text-base whitespace-pre-line">
                          {faq.faq_display_response || faq.response}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}

        {/* Contact CTA */}
        <Card className="mt-12 bg-gradient-to-br from-primary/5 to-secondary/5 border-2 border-primary/20 shadow-elegant">
          <CardContent className="p-10 text-center">
            <div className="max-w-2xl mx-auto space-y-4">
              <h3 className="text-2xl font-bold">Não encontrou sua resposta?</h3>
              <p className="text-muted-foreground text-lg">
                Nossa equipe de suporte está pronta para ajudar você com qualquer dúvida
              </p>
              <a
                href="mailto:suporte@woorkins.com"
                className="inline-flex items-center gap-2 bg-gradient-primary text-white px-8 py-4 rounded-xl hover:opacity-90 transition-all duration-200 shadow-glow font-medium text-lg"
              >
                <MessageCircle className="w-5 h-5" />
                Entre em Contato
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
