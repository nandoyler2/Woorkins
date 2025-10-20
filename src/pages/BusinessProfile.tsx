import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Star, MapPin, Phone, Mail, Globe, Image as ImageIcon, MessageCircle, Facebook, Instagram, Linkedin, Twitter, Clock, Shield, User as UserIcon } from 'lucide-react';
import { Footer } from '@/components/Footer';
import { SafeImage } from '@/components/ui/safe-image';
import { useToast } from '@/hooks/use-toast';
import { formatFullName } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { NegotiationChat } from '@/components/NegotiationChat';
import { PublicBusinessBanners } from '@/components/business/PublicBusinessBanners';
import { PublicBusinessVideo } from '@/components/business/PublicBusinessVideo';
import { PublicBusinessCatalog } from '@/components/business/PublicBusinessCatalog';
import { PublicBusinessTestimonials } from '@/components/business/PublicBusinessTestimonials';
import { PublicBusinessCertifications } from '@/components/business/PublicBusinessCertifications';
import { PublicBusinessJobVacancies } from '@/components/business/PublicBusinessJobVacancies';
import { PublicBusinessSocial } from '@/components/business/PublicBusinessSocial';
import { PublicBusinessPortfolio } from '@/components/business/PublicBusinessPortfolio';
import { PublicBusinessLinktree } from '@/components/business/PublicBusinessLinktree';
import { PublicBusinessAppointments } from '@/components/business/PublicBusinessAppointments';

import { ProfileEvaluationForm } from '@/components/ProfileEvaluationForm';
import { ThumbsUp, AlertCircle } from 'lucide-react';

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
  whatsapp: string | null;
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
  twitter: string | null;
  website_url: string | null;
  enable_negotiation: boolean;
  working_hours: string | null;
}

interface Evaluation {
  id: string;
  title: string;
  content: string;
  rating: number;
  created_at: string;
  public_response: string | null;
  evaluation_category: 'positive' | 'complaint';
  media_urls: string[] | null;
  media_types: string[] | null;
  profiles: {
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export default function BusinessProfile() {
  const { slug } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [positiveEvaluations, setPositiveEvaluations] = useState<Evaluation[]>([]);
  const [complaintEvaluations, setComplaintEvaluations] = useState<Evaluation[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inicio');
  const [showNegotiationDialog, setShowNegotiationDialog] = useState(false);
  const [currentNegotiation, setCurrentNegotiation] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showEvaluationForm, setShowEvaluationForm] = useState(false);
  const [showAllPositive, setShowAllPositive] = useState(false);
  const [showAllComplaints, setShowAllComplaints] = useState(false);

  useEffect(() => {
    loadBusinessData();
    recordProfileView();
  }, [slug]);

  const startNegotiation = async () => {
    if (!user) {
      toast({
        title: 'Login necessário',
        description: 'Faça login para iniciar uma negociação',
        variant: 'destructive',
      });
      return;
    }

    if (!business) return;

    // Check if already has an open negotiation
    const { data: existing } = await supabase
      .from('negotiations')
      .select('id')
      .eq('business_id', business.id)
      .eq('user_id', user.id)
      .in('status', ['open', 'accepted', 'paid'])
      .maybeSingle();

    if (existing) {
      setCurrentNegotiation(existing.id);
      setShowNegotiationDialog(true);
      return;
    }

    // Create new negotiation
    const { data, error } = await supabase
      .from('negotiations')
      .insert({
        business_id: business.id,
        user_id: user.id,
        status: 'open',
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar a negociação',
        variant: 'destructive',
      });
    } else {
      setCurrentNegotiation(data.id);
      setShowNegotiationDialog(true);
      toast({
        title: 'Negociação iniciada!',
        description: 'Comece a conversar com a empresa',
      });
    }
  };

  const recordProfileView = async () => {
    if (!slug) return;

    try {
      // Get business ID first
      const { data: businessData } = await supabase
        .from('business_profiles' as any)
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (!businessData) return;

      // Get current user profile if logged in
      let viewerProfileId = null;
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles' as any)
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profileData) {
          viewerProfileId = (profileData as any).id;
        }
      }

      // Record the view
      await supabase
        .from('business_profile_views' as any)
        .insert({
          business_id: (businessData as any).id,
          viewer_profile_id: viewerProfileId,
          user_agent: navigator.userAgent
        });
    } catch (error) {
      // Silently fail - don't show errors for view tracking
      console.log('Failed to record profile view:', error);
    }
  };

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

      // Check if current user is admin/owner
      if (user) {
        const { data: currentProfile } = await supabase
          .from('profiles' as any)
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (currentProfile) {
          const profileId = (currentProfile as any).id;
          
          // Check if user is the owner
          const isOwner = (businessData as any).profile_id === profileId;
          
          // Check if user is an admin
          const { data: adminData } = await supabase
            .from('business_admins' as any)
            .select('id')
            .eq('business_id', (businessData as any).id)
            .eq('profile_id', profileId)
            .eq('status', 'accepted')
            .maybeSingle();
          
          setIsAdmin(isOwner || !!adminData);
        }
      }

      // Load evaluations with proper join
      const { data: evaluationsData } = await supabase
        .from('evaluations' as any)
        .select(`
          id,
          title,
          content,
          rating,
          created_at,
          public_response,
          evaluation_category,
          media_urls,
          media_types,
          user_id
        `)
        .eq('business_id', (businessData as any).id)
        .order('created_at', { ascending: false });

      if (evaluationsData) {
        // Fetch user profiles separately
        const userIds = evaluationsData.map((e: any) => e.user_id);
        const { data: profilesData } = await supabase
          .from('profiles' as any)
          .select('user_id, username, full_name, avatar_url')
          .in('user_id', userIds);

        // Combine data
        const evaluationsWithProfiles = evaluationsData.map((evaluation: any) => {
          const profile = profilesData?.find((p: any) => p.user_id === evaluation.user_id);
          return {
            ...evaluation,
            profiles: profile || { username: 'unknown', full_name: 'Unknown User', avatar_url: null }
          };
        });

        const evals = evaluationsWithProfiles as unknown as Evaluation[];
        setEvaluations(evals);
        
        // Separar por categoria
        setPositiveEvaluations(evals.filter(e => e.evaluation_category === 'positive'));
        setComplaintEvaluations(evals.filter(e => e.evaluation_category === 'complaint'));
        
        // Calcular média
        const avg = evals.length > 0 
          ? evals.reduce((acc, curr) => acc + curr.rating, 0) / evals.length 
          : 0;
        setAverageRating(avg);
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
        <div className="container mx-auto px-4 py-16 text-center max-w-woorkins">
          <h1 className="text-4xl font-bold mb-4">Marca não encontrada</h1>
          <p className="text-muted-foreground">Esta marca não existe ou foi removida.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      <Header />

      {/* Cover Image - LinkedIn style */}
      <div className="w-full h-48 md:h-60 relative overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20">
        {business.cover_url ? (
          <SafeImage
            src={business.cover_url}
            alt={`Capa de ${business.company_name}`}
            className="absolute inset-0 w-full h-full object-cover object-center block"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
        )}
      </div>

      {/* Main Content Container */}
      <div className="container mx-auto px-4 -mt-16 relative z-10 max-w-woorkins">
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-4">
              {/* Profile Header Card */}
              <Card className="bg-card/50 backdrop-blur-sm border-2 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Logo */}
                    <div className="-mt-20">
                      {business.logo_url ? (
                        <SafeImage
                          src={business.logo_url}
                          alt={`Logo de ${business.company_name}`}
                          className="w-36 h-36 rounded-xl object-contain bg-card p-2 border-4 border-background shadow-lg"
                        />
                      ) : (
                        <div className="w-36 h-36 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center border-4 border-background shadow-lg">
                          <ImageIcon className="w-12 h-12 text-primary" />
                        </div>
                      )}
                    </div>

                    {/* Company Info */}
                    <div className="flex-1 space-y-3">
                      <div>
                        <h1 className="text-3xl font-bold mb-1">{business.company_name}</h1>
                        {business.category && (
                          <p className="text-muted-foreground mb-2">{business.category}</p>
                        )}
                        {business.description && (
                          <p className="text-sm text-muted-foreground leading-relaxed">{business.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {business.address && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{business.address}</span>
                          </div>
                        )}
                      </div>

                      {isAdmin ? (
                        <Badge variant="secondary" className="px-4 py-2 text-sm font-medium">
                          <Shield className="w-4 h-4 mr-2" />
                          Você administra esse perfil
                        </Badge>
                      ) : (
                        <Button variant="outline" className="rounded-full">
                          Seguir
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs Navigation */}
              <Card className="bg-card/50 backdrop-blur-sm border-2 shadow-lg">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
                    <TabsTrigger 
                      value="inicio" 
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                    >
                      Início
                    </TabsTrigger>
                    <TabsTrigger 
                      value="sobre"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                    >
                      Sobre
                    </TabsTrigger>
                    <TabsTrigger 
                      value="positivas"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 flex items-center gap-2"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      Avaliações Positivas ({positiveEvaluations.length})
                    </TabsTrigger>
                    <TabsTrigger 
                      value="reclamacoes"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 flex items-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4" />
                      Reclamações ({complaintEvaluations.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* Início Tab */}
                  <TabsContent value="inicio" className="p-6 space-y-6">
                    {/* Ferramentas ativas do perfil */}
                    <PublicBusinessBanners businessId={business.id} />
                    <PublicBusinessVideo businessId={business.id} />
                    <PublicBusinessLinktree businessId={business.id} />
                    <PublicBusinessCatalog businessId={business.id} />
                    <PublicBusinessPortfolio businessId={business.id} />
                    <PublicBusinessAppointments businessId={business.id} />
                    
                    <div>
                      <h2 className="text-xl font-bold mb-4">Visão Geral</h2>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                          <div className="p-2 bg-primary rounded-lg">
                            <Star className="w-5 h-5 text-primary-foreground" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{Number(business.average_rating).toFixed(1)}</p>
                            <p className="text-sm text-muted-foreground">{business.total_reviews} avaliações</p>
                          </div>
                        </div>
                        {business.portfolio_description && (
                          <div>
                            <h3 className="font-semibold mb-2">Sobre o portfólio</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">{business.portfolio_description}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <PublicBusinessTestimonials businessId={business.id} />
                    <PublicBusinessCertifications businessId={business.id} />
                    <PublicBusinessJobVacancies businessId={business.id} />
                  </TabsContent>

                  {/* Sobre Tab */}
                  <TabsContent value="sobre" className="p-6">
                    <div className="space-y-4">
                      <h2 className="text-xl font-bold mb-4">Sobre a empresa</h2>
                      {business.description && (
                        <p className="text-muted-foreground leading-relaxed">{business.description}</p>
                      )}
                      {business.category && (
                        <div>
                          <h3 className="font-semibold mb-2">Categoria</h3>
                          <Badge variant="secondary">{business.category}</Badge>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Avaliações Positivas Tab */}
                  <TabsContent value="positivas" className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-xl font-bold flex items-center gap-2">
                            <ThumbsUp className="w-5 h-5" />
                            Avaliações Positivas
                          </h2>
                          {positiveEvaluations.length > 0 && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {positiveEvaluations.length} {positiveEvaluations.length === 1 ? 'avaliação' : 'avaliações'}
                            </p>
                          )}
                        </div>
                        <Button onClick={() => setShowEvaluationForm(!showEvaluationForm)}>
                          {showEvaluationForm ? 'Cancelar' : 'Avaliar'}
                        </Button>
                      </div>

                      {showEvaluationForm && (
                        <ProfileEvaluationForm
                          profileId={business.id}
                          onSuccess={() => {
                            setShowEvaluationForm(false);
                            loadBusinessData();
                          }}
                        />
                      )}

                      {positiveEvaluations.length === 0 ? (
                        <div className="text-center py-12">
                          <ThumbsUp className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                          <p className="text-muted-foreground">Nenhuma avaliação positiva ainda</p>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-4">
                            {positiveEvaluations.slice(0, showAllPositive ? undefined : 5).map((evaluation) => (
                              <Card key={evaluation.id}>
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-4">
                                    {evaluation.profiles.avatar_url ? (
                                      <SafeImage
                                        src={evaluation.profiles.avatar_url}
                                        alt={evaluation.profiles.full_name}
                                        className="w-12 h-12 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                                        <ImageIcon className="w-6 h-6 text-primary" />
                                      </div>
                                    )}
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-2">
                                        <div>
                                          <p className="font-semibold">
                                            {formatFullName(evaluation.profiles.full_name)}
                                          </p>
                                          <div className="flex items-center gap-2">
                                            <div className="flex">
                                              {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                  key={star}
                                                  className={`w-4 h-4 ${
                                                    star <= evaluation.rating
                                                      ? 'fill-yellow-400 text-yellow-400'
                                                      : 'text-muted-foreground'
                                                  }`}
                                                />
                                              ))}
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                              {new Date(evaluation.created_at).toLocaleDateString('pt-BR')}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      <p className="text-sm text-muted-foreground mb-3">
                                        {evaluation.content}
                                      </p>
                                      {evaluation.media_urls && evaluation.media_urls.length > 0 && (
                                        <div className="grid grid-cols-3 gap-2">
                                          {evaluation.media_urls.map((url, idx) => (
                                            <div key={idx} className="aspect-square rounded-lg overflow-hidden">
                                              {evaluation.media_types?.[idx] === 'video' ? (
                                                <video
                                                  src={url}
                                                  controls
                                                  className="w-full h-full object-cover"
                                                />
                                              ) : (
                                                <SafeImage
                                                  src={url}
                                                  alt={`Mídia ${idx + 1}`}
                                                  className="w-full h-full object-cover"
                                                />
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {evaluation.public_response && (
                                        <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                                          <p className="text-xs font-semibold mb-1">Resposta da empresa:</p>
                                          <p className="text-sm">{evaluation.public_response}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                          {positiveEvaluations.length > 5 && (
                            <Button
                              variant="outline"
                              onClick={() => setShowAllPositive(!showAllPositive)}
                              className="w-full"
                            >
                              {showAllPositive ? 'Ver menos' : `Ver mais (${positiveEvaluations.length - 5} restantes)`}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TabsContent>

                  {/* Reclamações Tab */}
                  <TabsContent value="reclamacoes" className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-xl font-bold flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            Reclamações
                          </h2>
                          {complaintEvaluations.length > 0 && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {complaintEvaluations.length} {complaintEvaluations.length === 1 ? 'reclamação' : 'reclamações'}
                            </p>
                          )}
                        </div>
                        <Button onClick={() => setShowEvaluationForm(!showEvaluationForm)}>
                          {showEvaluationForm ? 'Cancelar' : 'Avaliar'}
                        </Button>
                      </div>

                      {showEvaluationForm && (
                        <ProfileEvaluationForm
                          profileId={business.id}
                          onSuccess={() => {
                            setShowEvaluationForm(false);
                            loadBusinessData();
                          }}
                        />
                      )}

                      {complaintEvaluations.length === 0 ? (
                        <div className="text-center py-12">
                          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                          <p className="text-muted-foreground">Nenhuma reclamação ainda</p>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-4">
                            {complaintEvaluations.slice(0, showAllComplaints ? undefined : 5).map((evaluation) => (
                              <Card key={evaluation.id}>
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-4">
                                    {evaluation.profiles.avatar_url ? (
                                      <SafeImage
                                        src={evaluation.profiles.avatar_url}
                                        alt={evaluation.profiles.full_name}
                                        className="w-12 h-12 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                                        <ImageIcon className="w-6 h-6 text-primary" />
                                      </div>
                                    )}
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-2">
                                        <div>
                                          <p className="font-semibold">
                                            {formatFullName(evaluation.profiles.full_name)}
                                          </p>
                                          <div className="flex items-center gap-2">
                                            <div className="flex">
                                              {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                  key={star}
                                                  className={`w-4 h-4 ${
                                                    star <= evaluation.rating
                                                      ? 'fill-yellow-400 text-yellow-400'
                                                      : 'text-muted-foreground'
                                                  }`}
                                                />
                                              ))}
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                              {new Date(evaluation.created_at).toLocaleDateString('pt-BR')}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      <p className="text-sm text-muted-foreground mb-3">
                                        {evaluation.content}
                                      </p>
                                      {evaluation.media_urls && evaluation.media_urls.length > 0 && (
                                        <div className="grid grid-cols-3 gap-2">
                                          {evaluation.media_urls.map((url, idx) => (
                                            <div key={idx} className="aspect-square rounded-lg overflow-hidden">
                                              {evaluation.media_types?.[idx] === 'video' ? (
                                                <video
                                                  src={url}
                                                  controls
                                                  className="w-full h-full object-cover"
                                                />
                                              ) : (
                                                <SafeImage
                                                  src={url}
                                                  alt={`Mídia ${idx + 1}`}
                                                  className="w-full h-full object-cover"
                                                />
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {evaluation.public_response && (
                                        <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                                          <p className="text-xs font-semibold mb-1">Resposta da empresa:</p>
                                          <p className="text-sm">{evaluation.public_response}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                          {complaintEvaluations.length > 5 && (
                            <Button
                              variant="outline"
                              onClick={() => setShowAllComplaints(!showAllComplaints)}
                              className="w-full"
                            >
                              {showAllComplaints ? 'Ver menos' : `Ver mais (${complaintEvaluations.length - 5} restantes)`}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </Card>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-4">
              {/* Rating Highlight Card - DESTAQUE */}
              <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary/20 shadow-glow">
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Star className="w-8 h-8 text-primary fill-primary" />
                      <span className="text-5xl font-bold text-primary">
                        {Number(business.average_rating).toFixed(1)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Baseado em <span className="font-semibold text-foreground">{business.total_reviews}</span> avaliações
                    </p>
                    <div className="flex items-center justify-center gap-1 mt-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-5 h-5 ${
                            star <= Math.round(business.average_rating)
                              ? 'text-primary fill-primary'
                              : 'text-muted-foreground'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Info Card */}
              <Card className="bg-card border shadow-sm">
                <CardContent className="p-6">
                  <h2 className="font-bold mb-4">Informações de Contato</h2>
                  <div className="space-y-3">
                    {business.phone && (
                      <div className="flex items-start gap-3">
                        <Phone className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <a href={`tel:${business.phone}`} className="text-sm hover:text-primary transition-colors break-all">
                          {business.phone}
                        </a>
                      </div>
                    )}
                    {business.email && (
                      <div className="flex items-start gap-3">
                        <Mail className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <a href={`mailto:${business.email}`} className="text-sm hover:text-primary transition-colors break-all">
                          {business.email}
                        </a>
                      </div>
                    )}
                    {business.address && (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{business.address}</span>
                      </div>
                    )}
                    {business.working_hours && (
                      <div className="flex items-start gap-3">
                        <Clock className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{business.working_hours}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Social Media and Links */}
              <PublicBusinessSocial businessId={business.id} />

              {/* Negotiation Card */}
              {business.enable_negotiation && (
                <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-2 border-green-500/20">
                  <CardContent className="p-6">
                    <h2 className="font-bold mb-2">Negociação Disponível</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      Esta empresa aceita negociações diretas na plataforma
                    </p>
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={startNegotiation}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Iniciar Conversa
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-12">
        <Footer />
      </div>

      {/* Negotiation Dialog */}
      <Dialog open={showNegotiationDialog} onOpenChange={setShowNegotiationDialog}>
        <DialogContent className="max-w-4xl h-[600px] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Negociação com {business?.company_name}</DialogTitle>
          </DialogHeader>
          {currentNegotiation && (
            <div className="flex-1 overflow-hidden">
              <NegotiationChat negotiationId={currentNegotiation} isBusinessView={false} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
