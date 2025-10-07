import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Phone, Mail, Globe, Image as ImageIcon } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <Header />

      {/* Cover Image */}
      {business.cover_url && (
        <div className="w-full h-64 md:h-96 relative">
          <SafeImage
            src={business.cover_url}
            alt={`Capa de ${business.company_name}`}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {business.logo_url ? (
              <SafeImage
                src={business.logo_url}
                alt={`Logo de ${business.company_name}`}
                className="w-32 h-32 rounded-lg object-cover border-4 border-background shadow-elegant"
              />
            ) : (
              <div className="w-32 h-32 rounded-lg bg-muted flex items-center justify-center">
                <ImageIcon className="w-12 h-12 text-muted-foreground" />
              </div>
            )}

            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-4xl font-bold mb-2">{business.company_name}</h1>
                <p className="text-muted-foreground">woorkins.com/{business.slug}</p>
                {business.category && (
                  <p className="text-sm text-primary font-medium mt-2">{business.category}</p>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 fill-primary text-primary" />
                  <span className="font-bold text-lg">{Number(business.average_rating).toFixed(1)}</span>
                  <span className="text-muted-foreground">({business.total_reviews} avaliações)</span>
                </div>
              </div>

              {business.description && (
                <p className="text-foreground">{business.description}</p>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <Card className="bg-card/50 backdrop-blur-sm border-2">
            <CardContent className="pt-6">
              <h2 className="text-xl font-bold mb-4">Informações de Contato</h2>
              <div className="space-y-3">
                {business.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary mt-0.5" />
                    <span>{business.address}</span>
                  </div>
                )}
                {business.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-primary" />
                    <a href={`tel:${business.phone}`} className="hover:underline">{business.phone}</a>
                  </div>
                )}
                {business.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-primary" />
                    <a href={`mailto:${business.email}`} className="hover:underline">{business.email}</a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Portfolio */}
          {portfolio.length > 0 && (
            <Card className="bg-card/50 backdrop-blur-sm border-2">
              <CardContent className="pt-6">
                <h2 className="text-xl font-bold mb-4">Portfólio</h2>
                {business.portfolio_description && (
                  <p className="text-muted-foreground mb-6">{business.portfolio_description}</p>
                )}
                <div className="grid md:grid-cols-3 gap-4">
                  {portfolio.map((item) => (
                    <div key={item.id} className="space-y-2">
                      <SafeImage
                        src={item.media_url}
                        alt={item.title}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <h3 className="font-medium">{item.title}</h3>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reviews */}
          <Card className="bg-card/50 backdrop-blur-sm border-2">
            <CardContent className="pt-6">
              <h2 className="text-xl font-bold mb-6">Avaliações ({evaluations.length})</h2>
              {evaluations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma avaliação ainda. Seja o primeiro a avaliar!
                </p>
              ) : (
                <div className="space-y-6">
                  {evaluations.map((evaluation) => (
                    <div key={evaluation.id} className="border-b pb-6 last:border-0">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {evaluation.profiles.avatar_url && (
                            <SafeImage
                              src={evaluation.profiles.avatar_url}
                              alt={evaluation.profiles.full_name}
                              className="w-10 h-10 rounded-full"
                            />
                          )}
                          <div>
                            <p className="font-medium">{evaluation.profiles.full_name}</p>
                            <p className="text-sm text-muted-foreground">
                              @{evaluation.profiles.username}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-primary text-primary" />
                          <span className="font-bold">{evaluation.rating}</span>
                        </div>
                      </div>
                      <h3 className="font-medium mb-2">{evaluation.title}</h3>
                      <p className="text-muted-foreground mb-2">{evaluation.content}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(evaluation.created_at).toLocaleDateString('pt-BR')}
                      </p>
                      {evaluation.public_response && (
                        <div className="mt-4 bg-muted rounded-lg p-4">
                          <p className="text-sm font-medium mb-1">Resposta da empresa:</p>
                          <p className="text-sm">{evaluation.public_response}</p>
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
    </div>
  );
}
