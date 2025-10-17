import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface FAQ {
  id: string;
  question_pattern: string;
  response: string;
  category: string;
  keywords: string[];
}

export default function FAQ() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

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
    const matchesSearch = searchQuery === '' || 
      faq.question_pattern.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.response.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

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
        <Card className="mb-8 shadow-elegant">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                placeholder="Buscar nas perguntas frequentes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
          </CardContent>
        </Card>

        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {categories.map(cat => (
            <Badge
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              className={`cursor-pointer px-4 py-2 text-sm ${
                selectedCategory === cat ? 'bg-gradient-primary' : 'hover:border-primary'
              }`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === 'all' ? 'Todas' : cat}
            </Badge>
          ))}
        </div>

        {/* FAQs */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredFAQs.length === 0 ? (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <HelpCircle className="w-16 h-16 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-xl font-bold mb-2">Nenhuma pergunta encontrada</h3>
                <p className="text-muted-foreground">
                  Tente ajustar sua busca ou categoria
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="shadow-elegant">
            <CardContent className="p-6">
              <Accordion type="single" collapsible className="w-full">
                {filteredFAQs.map((faq, index) => (
                  <AccordionItem key={faq.id} value={`item-${index}`}>
                    <AccordionTrigger className="text-left hover:text-primary transition-colors">
                      <div className="flex items-start gap-3">
                        <span className="font-semibold">{faq.question_pattern}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      <div className="pt-2">
                        {faq.response}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-4">
                        {faq.keywords.slice(0, 3).map((keyword, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}

        {/* Contact CTA */}
        <Card className="mt-12 bg-gradient-to-br from-primary/5 to-secondary/5 border-2">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">Não encontrou sua resposta?</h3>
            <p className="text-muted-foreground mb-6">
              Nossa equipe de suporte está pronta para ajudar você
            </p>
            <a
              href="mailto:suporte@woorkins.com"
              className="inline-flex items-center gap-2 bg-gradient-primary text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity shadow-glow"
            >
              Entre em contato
            </a>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
