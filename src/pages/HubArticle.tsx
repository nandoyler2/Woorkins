import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Eye, ArrowLeft, Share2, Clock } from 'lucide-react';
import { SafeImage } from '@/components/ui/safe-image';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

interface Article {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  cover_image: string | null;
  category: string;
  tags: string[];
  views_count: number;
  published_at: string;
  author_profile_id: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    username: string;
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  'negócios': 'bg-gradient-to-r from-blue-600 to-blue-400',
  'empreendedorismo': 'bg-gradient-to-r from-purple-600 to-pink-400',
  'carreiras': 'bg-gradient-to-r from-green-600 to-teal-400',
  'freelancing': 'bg-gradient-to-r from-orange-600 to-yellow-400',
  'tecnologia': 'bg-gradient-to-r from-indigo-600 to-blue-400',
  'produtividade': 'bg-gradient-to-r from-red-600 to-orange-400',
  'finanças': 'bg-gradient-to-r from-emerald-600 to-green-400',
  'networking': 'bg-gradient-to-r from-cyan-600 to-blue-400',
};

export default function HubArticle() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      loadArticle();
    }
  }, [slug]);

  const loadArticle = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hub_articles')
        .select('*, profiles!hub_articles_author_profile_id_fkey(full_name, avatar_url, username)')
        .eq('slug', slug)
        .eq('published', true)
        .single();

      if (error) throw error;

      if (data) {
        setArticle(data as Article);
        
        // Incrementar visualizações
        await supabase
          .from('hub_articles')
          .update({ views_count: (data.views_count || 0) + 1 })
          .eq('id', data.id);

        // Carregar artigos relacionados
        loadRelatedArticles(data.category, data.id);
      }
    } catch (error) {
      console.error('Erro ao carregar artigo:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRelatedArticles = async (category: string, currentId: string) => {
    try {
      const { data } = await supabase
        .from('hub_articles')
        .select('*, profiles!hub_articles_author_profile_id_fkey(full_name, avatar_url, username)')
        .eq('category', category)
        .eq('published', true)
        .neq('id', currentId)
        .limit(3);

      if (data) {
        setRelatedArticles(data as Article[]);
      }
    } catch (error) {
      console.error('Erro ao carregar artigos relacionados:', error);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: article?.title,
          text: article?.summary,
          url: url,
        });
      } catch (error) {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado para a área de transferência!');
    }
  };

  const calculateReadTime = (content: string) => {
    const wordsPerMinute = 200;
    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return minutes;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-12 w-24 mb-6" />
          <Skeleton className="h-[400px] w-full mb-8" />
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">Artigo não encontrado</h1>
          <Button asChild>
            <Link to="/hub">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao HUB
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Cover Image */}
      {article.cover_image && (
        <div className="relative h-[500px] w-full overflow-hidden">
          <SafeImage
            src={article.cover_image}
            alt={article.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>
      )}

      <div className="container mx-auto px-4 -mt-32 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Button variant="ghost" asChild className="mb-6 bg-background/80 backdrop-blur">
            <Link to="/hub">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao HUB
            </Link>
          </Button>

          {/* Article Card */}
          <Card className="overflow-hidden mb-8">
            <CardContent className="p-8 md:p-12">
              {/* Category Badge */}
              <Badge className={`${CATEGORY_COLORS[article.category] || 'bg-primary'} text-white mb-4`}>
                {article.category}
              </Badge>

              {/* Title */}
              <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                {article.title}
              </h1>

              {/* Summary */}
              <p className="text-xl text-muted-foreground mb-8">
                {article.summary}
              </p>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-6 pb-6 border-b mb-8">
                {/* Author */}
                <Link 
                  to={`/${article.profiles.username}`}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  {article.profiles.avatar_url ? (
                    <SafeImage
                      src={article.profiles.avatar_url}
                      alt={article.profiles.full_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-bold">
                        {article.profiles.full_name?.[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{article.profiles.full_name}</p>
                    <p className="text-sm text-muted-foreground">Autor</p>
                  </div>
                </Link>

                {/* Date */}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {formatDistanceToNow(new Date(article.published_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </div>

                {/* Views */}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Eye className="w-4 h-4" />
                  <span>{article.views_count} visualizações</span>
                </div>

                {/* Read Time */}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{calculateReadTime(article.content)} min de leitura</span>
                </div>

                {/* Share Button */}
                <Button
                  onClick={handleShare}
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Compartilhar
                </Button>
              </div>

              {/* Content */}
              <div className="prose prose-lg max-w-none dark:prose-invert">
                <ReactMarkdown
                  components={{
                    h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mt-8 mb-4" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-2xl font-bold mt-6 mb-3" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-xl font-bold mt-4 mb-2" {...props} />,
                    p: ({ node, ...props }) => <p className="mb-4 leading-relaxed" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-4 space-y-2" {...props} />,
                    blockquote: ({ node, ...props }) => (
                      <blockquote className="border-l-4 border-primary pl-4 italic my-4" {...props} />
                    ),
                    code: ({ node, ...props }) => (
                      <code className="bg-muted px-2 py-1 rounded text-sm" {...props} />
                    ),
                    img: ({ node, ...props }) => (
                      <img className="rounded-lg my-6 w-full" {...props} />
                    ),
                  }}
                >
                  {article.content}
                </ReactMarkdown>
              </div>

              {/* Tags */}
              {article.tags && article.tags.length > 0 && (
                <div className="mt-8 pt-6 border-t">
                  <div className="flex flex-wrap gap-2">
                    {article.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-6">Artigos Relacionados</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedArticles.map((related) => (
                  <Card key={related.id} className="group hover:shadow-lg transition-all cursor-pointer">
                    <Link to={`/hub/${related.slug}`}>
                      {related.cover_image && (
                        <div className="relative h-48 overflow-hidden">
                          <SafeImage
                            src={related.cover_image}
                            alt={related.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      )}
                      <CardContent className="p-4">
                        <Badge className={`${CATEGORY_COLORS[related.category] || 'bg-primary'} text-white text-xs mb-2`}>
                          {related.category}
                        </Badge>
                        <h3 className="font-bold group-hover:text-primary transition-colors line-clamp-2 mb-2">
                          {related.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {related.summary}
                        </p>
                      </CardContent>
                    </Link>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
