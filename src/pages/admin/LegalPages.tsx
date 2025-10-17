import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Shield, Save, Eye, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

interface LegalPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  last_updated: string;
}

export default function LegalPages() {
  const [pages, setPages] = useState<LegalPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingContent, setEditingContent] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    try {
      const { data, error } = await supabase
        .from('legal_pages')
        .select('*')
        .order('slug');

      if (error) throw error;

      setPages(data || []);
      
      // Initialize editing content
      const contentMap: Record<string, string> = {};
      (data || []).forEach(page => {
        contentMap[page.slug] = page.content;
      });
      setEditingContent(contentMap);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as páginas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (slug: string) => {
    setSaving(true);

    try {
      const { error } = await supabase
        .from('legal_pages')
        .update({
          content: editingContent[slug],
          last_updated: new Date().toISOString(),
        })
        .eq('slug', slug);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Página atualizada com sucesso!',
      });

      loadPages();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as alterações',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getPageIcon = (slug: string) => {
    if (slug === 'termos-de-uso') return <FileText className="w-5 h-5" />;
    if (slug === 'politica-de-privacidade') return <Shield className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  const getPageUrl = (slug: string) => {
    return `/${slug}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Páginas Legais</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie os termos de uso e política de privacidade da plataforma
        </p>
      </div>

      <Card className="border-yellow-500/20 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            ⚠️ Atenção
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Estas páginas contêm informações legais importantes. Certifique-se de consultar um advogado antes de fazer alterações significativas. Os textos atuais foram criados com base na LGPD e nas melhores práticas, mas devem ser revisados por um profissional jurídico.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue={pages[0]?.slug} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          {pages.map((page) => (
            <TabsTrigger key={page.slug} value={page.slug} className="flex items-center gap-2">
              {getPageIcon(page.slug)}
              {page.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {pages.map((page) => (
          <TabsContent key={page.slug} value={page.slug} className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {getPageIcon(page.slug)}
                      {page.title}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      Última atualização: {new Date(page.last_updated).toLocaleString('pt-BR')}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={getPageUrl(page.slug)} target="_blank">
                      <Eye className="w-4 h-4 mr-2" />
                      Visualizar
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor={`content-${page.slug}`} className="text-base font-semibold">
                      Conteúdo (Markdown)
                    </Label>
                    <Badge variant="secondary" className="text-xs">
                      Suporta Markdown
                    </Badge>
                  </div>
                  <Textarea
                    id={`content-${page.slug}`}
                    value={editingContent[page.slug] || ''}
                    onChange={(e) => setEditingContent(prev => ({
                      ...prev,
                      [page.slug]: e.target.value
                    }))}
                    className="min-h-[600px] font-mono text-sm"
                    placeholder="Digite o conteúdo em Markdown..."
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Use Markdown para formatar o texto. Exemplo: # Título, ## Subtítulo, **negrito**, *itálico*, - lista
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setEditingContent(prev => ({
                      ...prev,
                      [page.slug]: page.content
                    }))}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => handleSave(page.slug)}
                    disabled={saving || editingContent[page.slug] === page.content}
                    className="bg-gradient-primary"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Alterações
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Preview Card */}
            <Card>
              <CardHeader>
                <CardTitle>Prévia</CardTitle>
                <CardDescription>
                  Visualização de como o conteúdo será exibido (Markdown renderizado)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none bg-muted/30 p-6 rounded-lg
                  prose-headings:text-foreground
                  prose-h1:text-2xl prose-h1:font-bold prose-h1:mb-4
                  prose-h2:text-xl prose-h2:font-bold prose-h2:mb-3 prose-h2:mt-6
                  prose-h3:text-lg prose-h3:font-semibold prose-h3:mb-2 prose-h3:mt-4
                  prose-p:text-foreground/90 prose-p:leading-relaxed
                  prose-strong:text-primary
                  prose-ul:my-2
                  prose-li:text-foreground/90
                ">
                  <div dangerouslySetInnerHTML={{ 
                    __html: editingContent[page.slug]?.split('\n').slice(0, 20).join('\n') || '' 
                  }} />
                  {editingContent[page.slug]?.split('\n').length > 20 && (
                    <p className="text-muted-foreground italic">
                      ... (visualização limitada aos primeiros parágrafos)
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
