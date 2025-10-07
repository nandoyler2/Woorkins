import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, Phone, Mail, Globe, Image as ImageIcon } from 'lucide-react';
import { Footer } from '@/components/Footer';
import { SafeImage } from '@/components/ui/safe-image';
import { useToast } from '@/hooks/use-toast';

interface BusinessData {
  id: string;
  company_name: string;
  slug: string;
  logo_url: string | null;
  cover_url: string | null;
  description: string | null;
  category: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  portfolio_description: string | null;
  average_rating: number;
  total_reviews: number;
}

interface PortfolioItem {
  id: string;
  title: string;
  media_url: string;
  media_type: string;
  description: string | null;
}

interface Evaluation {
  id: string;
  title: string;
  content: string;
  rating: number;
  created_at: string;
  public_response: string | null;
  profiles: {
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export default function BusinessProfile() {
  const { slug } = useParams();
  const { toast } = useToast();
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBusinessData();
  }, [slug]);

  const loadBusinessData = async () => {
    if (!slug) return;

    try {
      // Load business profile
      const { data: businessData, error: businessError } = await supabase
        .from('business_profiles' as any)
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (businessError || !businessData) {
        toast({
          title: 'Erro',
          description: 'Marca não encontrada',
          variant: 'destructive',
        });
        return;
      }

      setBusiness(businessData as unknown as BusinessData);

      // Load portfolio
      const { data: portfolioData } = await supabase
        .from('portfolio_items' as any)
        .select('*')
        .eq('business_id', (businessData as any).id)
        .order('order_index', { ascending: true });

      if (portfolioData) {
        setPortfolio(portfolioData as unknown as PortfolioItem[]);
      }

      // Load evaluations
      const { data: evaluationsData } = await supabase
        .from('evaluations' as any)
        .select(`
          *,
          profiles:user_id (
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('business_id', (businessData as any).id)
        .order('created_at', { ascending: false });

      if (evaluationsData) {
        setEvaluations(evaluationsData as any);
      }
    } catch (error) {
      console.error('Error loading business:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold mb-4">Marca não encontrada</h1>
          <p className="text-muted-foreground">Esta marca não existe ou foi removida.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      <Header />

      {/* Cover Image */}
      {business.cover_url && (
        <div className="w-full h-64 md:h-96 relative overflow-hidden">
          <SafeImage
            src={business.cover_url}
            alt={`Capa de ${business.company_name}`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header Section */}
          <Card className="bg-card/50 backdrop-blur-sm border-2 shadow-elegant">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                {business.logo_url ? (
                  <SafeImage
                    src={business.logo_url}
                    alt={`Logo de ${business.company_name}`}
                    className="w-32 h-32 rounded-2xl object-cover border-4 border-background shadow-glow ring-2 ring-primary/20"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center border-2 border-primary/20">
                    <ImageIcon className="w-12 h-12 text-primary" />
                  </div>
                )}

                <div className="flex-1 space-y-4">
                  <div>
                    <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">{business.company_name}</h1>
                    <p className="text-muted-foreground text-sm">woorkins.com/{business.slug}</p>
                    {business.category && (
                      <Badge className="mt-3 bg-gradient-primary text-white border-0 shadow-glow">
                        {business.category}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl border-2 border-primary/10">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-gradient-primary rounded-lg shadow-glow">
                        <Star className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <span className="font-bold text-2xl">{Number(business.average_rating).toFixed(1)}</span>
                        <span className="text-muted-foreground text-sm ml-2">({business.total_reviews} avaliações)</span>
                      </div>
                    </div>
                  </div>

                  {business.description && (
                    <p className="text-foreground leading-relaxed text-base">{business.description}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card className="bg-card/50 backdrop-blur-sm border-2 shadow-elegant hover:shadow-glow transition-shadow">
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow">
                  <Phone className="w-4 h-4 text-white" />
                </div>
                Informações de Contato
              </h2>
              <div className="space-y-4">
                {business.address && (
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-primary/5 to-transparent hover:from-primary/10 transition-colors">
                    <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="leading-relaxed">{business.address}</span>
                  </div>
                )}
                {business.phone && (
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-secondary/5 to-transparent hover:from-secondary/10 transition-colors">
                    <Phone className="w-5 h-5 text-primary flex-shrink-0" />
                    <a href={`tel:${business.phone}`} className="hover:text-primary transition-colors font-medium">{business.phone}</a>
                  </div>
                )}
                {business.email && (
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-accent/5 to-transparent hover:from-accent/10 transition-colors">
                    <Mail className="w-5 h-5 text-primary flex-shrink-0" />
                    <a href={`mailto:${business.email}`} className="hover:text-primary transition-colors font-medium">{business.email}</a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Portfolio */}
          {portfolio.length > 0 && (
            <Card className="bg-card/50 backdrop-blur-sm border-2 shadow-elegant">
              <CardContent className="pt-6">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow">
                    <ImageIcon className="w-4 h-4 text-white" />
                  </div>
                  Portfólio
                </h2>
                {business.portfolio_description && (
                  <p className="text-muted-foreground mb-8 text-base leading-relaxed">{business.portfolio_description}</p>
                )}
                <div className="grid md:grid-cols-3 gap-6">
                  {portfolio.map((item) => (
                    <div key={item.id} className="group space-y-3">
                      <div className="relative overflow-hidden rounded-2xl border-2 border-primary/10 shadow-card hover:shadow-elegant transition-all duration-300 hover:-translate-y-1">
                        <SafeImage
                          src={item.media_url}
                          alt={item.title}
                          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <h3 className="font-bold text-lg">{item.title}</h3>
                      {item.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reviews */}
          <Card className="bg-card/50 backdrop-blur-sm border-2 shadow-elegant">
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow">
                  <Star className="w-4 h-4 text-white" />
                </div>
                Avaliações ({evaluations.length})
              </h2>
              {evaluations.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl flex items-center justify-center">
                    <Star className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-muted-foreground text-lg">
                    Nenhuma avaliação ainda. Seja o primeiro a avaliar!
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {evaluations.map((evaluation) => (
                    <div key={evaluation.id} className="p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent border-2 border-primary/10 hover:border-primary/20 transition-colors">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          {evaluation.profiles.avatar_url ? (
                            <SafeImage
                              src={evaluation.profiles.avatar_url}
                              alt={evaluation.profiles.full_name}
                              className="w-12 h-12 rounded-full border-2 border-primary/20"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold">
                              {evaluation.profiles.full_name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-lg">{evaluation.profiles.full_name}</p>
                            <p className="text-sm text-muted-foreground">
                              @{evaluation.profiles.username}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-primary rounded-lg shadow-glow">
                          <Star className="w-4 h-4 text-white" />
                          <span className="font-bold text-white">{evaluation.rating}</span>
                        </div>
                      </div>
                      <h3 className="font-bold text-lg mb-2">{evaluation.title}</h3>
                      <p className="text-foreground leading-relaxed mb-3">{evaluation.content}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(evaluation.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                      {evaluation.public_response && (
                        <div className="mt-4 p-4 bg-background rounded-xl border-2 border-secondary/20">
                          <p className="text-sm font-bold mb-2 text-secondary">Resposta da empresa:</p>
                          <p className="text-sm leading-relaxed">{evaluation.public_response}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
