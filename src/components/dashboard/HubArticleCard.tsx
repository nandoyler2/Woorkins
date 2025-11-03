import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Article {
  id: string;
  title: string;
  slug: string;
  category: string;
  cover_image: string | null;
  created_at: string;
  published_at: string;
}

export function HubArticleCard() {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRandomArticle();
  }, []);

  const loadRandomArticle = async () => {
    try {
      // Priorizar artigos das últimas 24 horas
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      // Primeiro, tentar buscar artigos recentes (últimas 24h)
      let { data: recentArticles } = await supabase
        .from('hub_articles')
        .select('id, title, slug, category, cover_image, created_at, published_at')
        .eq('published', true)
        .gte('published_at', twentyFourHoursAgo.toISOString())
        .order('published_at', { ascending: false })
        .limit(10);

      // Se não houver artigos recentes, buscar os mais recentes em geral
      if (!recentArticles || recentArticles.length === 0) {
        const { data: allArticles } = await supabase
          .from('hub_articles')
          .select('id, title, slug, category, cover_image, created_at, published_at')
          .eq('published', true)
          .order('published_at', { ascending: false })
          .limit(20);
        
        recentArticles = allArticles || [];
      }

      // Selecionar um artigo aleatório da lista
      if (recentArticles && recentArticles.length > 0) {
        const randomIndex = Math.floor(Math.random() * recentArticles.length);
        setArticle(recentArticles[randomIndex]);
      }
    } catch (error) {
      console.error('Error loading random article:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const published = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - published.getTime()) / 1000 / 60);

    if (diffInMinutes < 1) return 'Publicado agora mesmo';
    if (diffInMinutes < 60) return `Publicado há ${diffInMinutes} ${diffInMinutes === 1 ? 'minuto' : 'minutos'}`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Publicado há ${diffInHours} ${diffInHours === 1 ? 'hora' : 'horas'}`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `Publicado há ${diffInDays} ${diffInDays === 1 ? 'dia' : 'dias'}`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    return `Publicado há ${diffInMonths} ${diffInMonths === 1 ? 'mês' : 'meses'}`;
  };

  if (loading) {
    return (
      <Card className="overflow-hidden animate-pulse">
        <div className="h-48 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900"></div>
      </Card>
    );
  }

  if (!article) return null;

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm border-2 border-blue-200 overflow-hidden">
      {/* Header */}
      <div className="border-b border-blue-200 p-4 bg-white/50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-r from-blue-500 to-teal-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Woorkins Hub</h3>
        </div>
      </div>
      
      {/* Content - Sem padding, preenche toda a área */}
      <Link to={`/hub/${article.slug}`}>
        <div className="overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-2xl">
          <div className="relative h-52 overflow-hidden">
            {/* Imagem de fundo ou gradiente */}
            {article.cover_image ? (
              <img 
                src={article.cover_image} 
                alt={article.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-900 via-teal-700 to-blue-900"></div>
            )}
            
            {/* Overlay com sombra para legibilidade */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent"></div>
            
            {/* Badge Destaque */}
            <div className="absolute top-4 left-4">
              <Badge className="bg-red-600 text-white font-bold px-3 py-1.5 shadow-lg">
                <Sparkles className="h-3 w-3 mr-1 inline" />
                DESTAQUE
              </Badge>
            </div>
            
            {/* Conteúdo */}
            <div className="absolute bottom-0 left-0 right-0 p-5 space-y-2.5">
              {/* Categoria */}
              <Badge 
                variant="secondary" 
                className="bg-blue-500/90 backdrop-blur-sm text-white text-xs font-semibold shadow-lg"
              >
                {article.category}
              </Badge>
              
              {/* Título - Sem line-clamp, mostra completo */}
              <h3 className="text-white font-bold text-base leading-snug drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
                {article.title}
              </h3>
              
              {/* Data */}
              <div className="flex items-center gap-1.5 text-white/95 text-[0.65rem] drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                <Clock className="h-3 w-3" />
                <span className="font-medium">{getTimeAgo(article.published_at || article.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </Card>
  );
}
