import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Calendar, Eye, TrendingUp, Tag } from 'lucide-react';
import { SafeImage } from '@/components/ui/safe-image';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Article {
  id: string;
  title: string;
  slug: string;
  summary: string;
  cover_image: string | null;
  category: string;
  tags: string[];
  views_count: number;
  published_at: string;
  author_profile_id: string;
  featured: boolean;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

const CATEGORIES = [
  { value: '', label: 'Todas', color: 'bg-gradient-to-r from-blue-500 to-teal-500' },
  { value: 'negócios', label: '💼 Negócios', color: 'bg-gradient-to-r from-blue-600 to-blue-400' },
  { value: 'empreendedorismo', label: '🚀 Empreendedorismo', color: 'bg-gradient-to-r from-purple-600 to-pink-400' },
  { value: 'carreiras', label: '💡 Carreiras', color: 'bg-gradient-to-r from-green-600 to-teal-400' },
  { value: 'freelancing', label: '🎯 Freelancing', color: 'bg-gradient-to-r from-orange-600 to-yellow-400' },
  { value: 'tecnologia', label: '💻 Tecnologia', color: 'bg-gradient-to-r from-indigo-600 to-blue-400' },
  { value: 'produtividade', label: '📈 Produtividade', color: 'bg-gradient-to-r from-red-600 to-orange-400' },
  { value: 'finanças', label: '💰 Finanças', color: 'bg-gradient-to-r from-emerald-600 to-green-400' },
  { value: 'networking', label: '🤝 Networking', color: 'bg-gradient-to-r from-cyan-600 to-blue-400' },
];

export default function Hub() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [featuredArticle, setFeaturedArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [popularArticles, setPopularArticles] = useState<Article[]>([]);

  useEffect(() => {
    loadArticles();
    loadPopularArticles();
  }, [selectedCategory]);

  const loadArticles = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('hub_articles')
        .select('*, profiles!hub_articles_author_profile_id_fkey(full_name, avatar_url)')
        .eq('published', true)
        .order('published_at', { ascending: false });

      if (selectedCategory) {
        query = query.eq('category', selectedCategory);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        // Buscar artigo em destaque
        const featured = data.find((a: any) => a.featured);
        if (featured) {
          setFeaturedArticle(featured as Article);
        }

        // Filtrar artigos (excluir o destacado)
        const regularArticles = data.filter((a: any) => !a.featured || a.id !== featured?.id);
        setArticles(regularArticles as Article[]);
      }
    } catch (error) {
      console.error('Erro ao carregar artigos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPopularArticles = async () => {
    try {
      const { data } = await supabase
        .from('hub_articles')
        .select('*, profiles!hub_articles_author_profile_id_fkey(full_name, avatar_url)')
        .eq('published', true)
        .order('views_count', { ascending: false })
        .limit(5);

      if (data) {
        setPopularArticles(data as Article[]);
      }
    } catch (error) {
      console.error('Erro ao carregar artigos populares:', error);
    }
  };

  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryColor = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return cat?.color || 'bg-gradient-to-r from-gray-600 to-gray-400';
  };

  const getCategoryLabel = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return cat?.label || category;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-blue-900 via-teal-700 to-blue-900 text-white py-16 overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-5xl font-bold tracking-tight">
              HUB de Conhecimento
            </h1>
            <p className="text-xl text-white/90">
              Artigos, insights e tendências sobre negócios, carreiras e muito mais
            </p>
            
            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Buscar artigos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 text-lg bg-white/95 backdrop-blur border-0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="border-b bg-background/95 backdrop-blur sticky top-16 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                variant={selectedCategory === cat.value ? 'default' : 'outline'}
                className={`whitespace-nowrap ${
                  selectedCategory === cat.value ? cat.color + ' text-white border-0' : ''
                }`}
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Featured Article */}
            {featuredArticle && !searchQuery && (
              <Card className="overflow-hidden group cursor-pointer hover:shadow-2xl transition-all duration-300 border-2 border-primary/20">
                <Link to={`/hub/${featuredArticle.slug}`}>
                  {featuredArticle.cover_image && (
                    <div className="relative h-[400px] overflow-hidden">
                      <SafeImage
                        src={featuredArticle.cover_image}
                        alt={featuredArticle.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                      <Badge className="absolute top-4 left-4 bg-red-600 hover:bg-red-600 text-white">
                        ⭐ DESTAQUE
                      </Badge>
                      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                        <Badge className={`${getCategoryColor(featuredArticle.category)} text-white mb-3`}>
                          {getCategoryLabel(featuredArticle.category)}
                        </Badge>
                        <h2 className="text-3xl font-bold mb-2 group-hover:text-primary transition-colors">
                          {featuredArticle.title}
                        </h2>
                        <p className="text-white/90 text-lg mb-4">
                          {featuredArticle.summary}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-white/80">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDistanceToNow(new Date(featuredArticle.published_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            {featuredArticle.views_count} visualizações
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </Link>
              </Card>
            )}

            {/* Articles Grid */}
            <div className="space-y-6">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <Skeleton className="w-48 h-32 rounded-lg" />
                        <div className="flex-1 space-y-3">
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : filteredArticles.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">
                    Nenhum artigo encontrado.
                  </p>
                </div>
              ) : (
                filteredArticles.map((article) => (
                  <Card key={article.id} className="overflow-hidden group hover:shadow-lg transition-all duration-300 cursor-pointer">
                    <Link to={`/hub/${article.slug}`}>
                      <CardContent className="p-0">
                        <div className="flex flex-col sm:flex-row gap-4">
                          {article.cover_image && (
                            <div className="relative w-full sm:w-64 h-48 sm:h-auto overflow-hidden">
                              <SafeImage
                                src={article.cover_image}
                                alt={article.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            </div>
                          )}
                          <div className="flex-1 p-6 space-y-3">
                            <Badge className={`${getCategoryColor(article.category)} text-white`}>
                              {getCategoryLabel(article.category)}
                            </Badge>
                            <h3 className="text-2xl font-bold group-hover:text-primary transition-colors line-clamp-2">
                              {article.title}
                            </h3>
                            <p className="text-muted-foreground line-clamp-2">
                              {article.summary}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {formatDistanceToNow(new Date(article.published_at), {
                                  addSuffix: true,
                                  locale: ptBR,
                                })}
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="w-4 h-4" />
                                {article.views_count}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Popular Articles */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Mais Lidos
                </h3>
                <div className="space-y-4">
                  {popularArticles.map((article, index) => (
                    <Link
                      key={article.id}
                      to={`/hub/${article.slug}`}
                      className="block group"
                    >
                      <div className="flex gap-3">
                        <span className="text-3xl font-bold text-muted-foreground/30">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <h4 className="font-semibold group-hover:text-primary transition-colors line-clamp-2 mb-1">
                            {article.title}
                          </h4>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {article.views_count} visualizações
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Categories Widget */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-primary" />
                  Categorias
                </h3>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.filter(c => c.value).map((cat) => (
                    <Button
                      key={cat.value}
                      onClick={() => setSelectedCategory(cat.value)}
                      variant={selectedCategory === cat.value ? 'default' : 'outline'}
                      size="sm"
                      className={selectedCategory === cat.value ? cat.color + ' text-white border-0' : ''}
                    >
                      {cat.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
