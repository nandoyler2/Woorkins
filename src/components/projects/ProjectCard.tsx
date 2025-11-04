import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Star, CheckCircle, Clock, MessageSquare, Flag, Trash2 } from "lucide-react";
import { formatShortName } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthAction } from "@/contexts/AuthActionContext";
import { ProposalDialog } from "./ProposalDialog";
import { LoginPromptDialog } from "./LoginPromptDialog";
import { ClickableProfile } from "@/components/ClickableProfile";
import { ViewProposalDialog } from "./ViewProposalDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Shield } from "lucide-react";

interface ProjectCardProps {
  project: {
    id: string;
    title: string;
    description: string;
    category: string | null;
    budget_min: number | null;
    budget_max: number | null;
    deadline: string | null;
    status: string;
    proposals_count: number;
    created_at: string;
    profile_id?: string;
    profiles: {
      id?: string;
      user_id?: string;
      username: string;
      full_name: string;
      avatar_url?: string;
    };
    skills?: string[];
  };
}

export function ProjectCard({ project }: ProjectCardProps) {
  const { user } = useAuth();
  const { requireAuth } = useAuthAction();
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [viewProposalDialogOpen, setViewProposalDialogOpen] = useState(false);
  const [userProposal, setUserProposal] = useState<any>(null);
  const [hasProposal, setHasProposal] = useState(false);
  const [currentUserProfileIds, setCurrentUserProfileIds] = useState<string[]>([]);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const loadUserProfiles = async () => {
      if (!user) {
        setCurrentUserProfileIds([]);
        return;
      }

      try {
        const { data: profiles } = await supabase
          .from('profiles' as any)
          .select('id')
          .eq('user_id', user.id);

        const ids = (profiles || []).map((p: any) => p.id);
        setCurrentUserProfileIds(ids);
        console.log('🔍 ProjectCard - User Profile IDs:', ids);
        console.log('🔍 ProjectCard - Project.profile_id:', project.profile_id);
        console.log('🔍 ProjectCard - Project.profiles.user_id:', (project as any)?.profiles?.user_id);
      } catch (error) {
        console.error('Error loading user profiles:', error);
      }
    };

    loadUserProfiles();
  }, [user, project.profile_id]);

  useEffect(() => {
    const checkUserProposal = async () => {
      if (!user) {
        setHasProposal(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles' as any)
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!profile) return;

        const profileData = profile as any;

        const { data: proposal } = await supabase
          .from('proposals' as any)
          .select('budget, delivery_days, message, created_at')
          .eq('project_id', project.id)
          .eq('freelancer_id', profileData.id)
          .single();

        if (proposal) {
          setUserProposal(proposal);
          setHasProposal(true);
        } else {
          setHasProposal(false);
        }
      } catch (error) {
        setHasProposal(false);
      }
    };

    checkUserProposal();
  }, [user, project.id]);

  const handleMakeProposal = () => {
    if (hasProposal) {
      setViewProposalDialogOpen(true);
      return;
    }
    
    if (requireAuth(() => setProposalDialogOpen(true))) {
      setProposalDialogOpen(true);
    }
  };

  const handleLoginSuccess = () => {
    setLoginDialogOpen(false);
    setProposalDialogOpen(true);
  };

  const handleProposalSuccess = () => {
    setProposalDialogOpen(false);
    // Recarregar a proposta
    const checkUserProposal = async () => {
      if (!user) return;

      try {
        const { data: profile } = await supabase
          .from('profiles' as any)
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!profile) return;

        const profileData = profile as any;

        const { data: proposal } = await supabase
          .from('proposals' as any)
          .select('budget, delivery_days, message, created_at')
          .eq('project_id', project.id)
          .eq('freelancer_id', profileData.id)
          .single();

        if (proposal) {
          setUserProposal(proposal);
          setHasProposal(true);
        }
      } catch (error) {
        console.error('Error fetching proposal:', error);
      }
    };
    checkUserProposal();
  };

  const handleReport = async () => {
    if (!user) {
      toast.error('Faça login para denunciar');
      return;
    }

    if (!reportReason) {
      toast.error('Selecione um motivo para a denúncia');
      return;
    }

    try {
      // Sanitizar descrição
      const sanitizedDescription = reportDescription.replace(/[<>]/g, '').trim();

      const { error } = await supabase
        .from('reports' as any)
        .insert({
          reported_by: user.id,
          content_type: 'project',
          content_id: project.id,
          reason: reportReason,
          description: sanitizedDescription || null,
        });

      if (error) throw error;

      toast.success('Denúncia enviada com sucesso', {
        description: 'Nossa equipe analisará o conteúdo em breve'
      });
      
      setReportDialogOpen(false);
      setReportReason('');
      setReportDescription('');
    } catch (error) {
      console.error('Error reporting project:', error);
      toast.error('Erro ao enviar denúncia', {
        description: 'Tente novamente mais tarde'
      });
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('projects' as any)
        .delete()
        .eq('id', project.id);

      if (error) throw error;

      toast.success('Projeto excluído com sucesso');
      setDeleteDialogOpen(false);
      
      // Recarregar a página após 1 segundo
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Erro ao excluir projeto', {
        description: 'Tente novamente mais tarde'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatBudget = (min: number | null, max: number | null) => {
    if (!min && !max) return "A combinar";
    if (min && max) return `R$ ${min.toLocaleString()} - R$ ${max.toLocaleString()}`;
    if (min) return `A partir de R$ ${min.toLocaleString()}`;
    return `Até R$ ${max?.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diff < 1) return "Publicado há menos de 1 hora";
    if (diff < 24) return `Publicado há ${diff} hora${diff > 1 ? 's' : ''}`;
    
    const days = Math.floor(diff / 24);
    if (days < 7) return `Publicado há ${days} dia${days > 1 ? 's' : ''}`;
    
    return date.toLocaleDateString('pt-BR');
  };

  const formatDeadline = (dateString: string | null) => {
    if (!dateString) return "Não especificado";
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const truncateDescription = (text: string, limit: number = 200) => {
    if (text.length <= limit) return text;
    return text.substring(0, limit).trim() + "...";
  };

  return (
    <Card className="p-6 border-2 bg-card/50 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-200 animate-fade-in">
      {/* Header com gradiente sutil */}
      <div className="flex justify-between items-start mb-2 pb-2 border-b border-gradient-to-r from-transparent via-border to-transparent">
        <Link to={`/projetos/${project.id}`} className="flex-1">
          <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent hover:from-blue-700 hover:to-teal-700 transition-all">
            {project.title}
          </h3>
        </Link>
        <div className="flex items-center gap-3 ml-4">
          <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-950 dark:to-teal-950 rounded-lg border-2 border-primary/20">
            <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent whitespace-nowrap">
              {formatBudget(project.budget_min, project.budget_max)}
            </span>
          </div>
          {(() => {
            const ownsByProfile = (project.profile_id && currentUserProfileIds.includes(project.profile_id));
            const ownsByUserId = user && (project as any)?.profiles?.user_id === user.id;
            const isOwner = !!(ownsByProfile || ownsByUserId);
            if (isOwner) {
              return (
                <Button 
                  variant="default" 
                  size="sm" 
                  className="whitespace-nowrap bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 shadow-md"
                  onClick={() => toast.info("Esse é um projeto feito por você")}
                >
                  Seu Projeto
                </Button>
              );
            }
            return (
              <Button 
                variant="default" 
                size="sm" 
                className={`whitespace-nowrap shadow-md ${hasProposal ? 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700' : 'bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700'}`}
                onClick={handleMakeProposal}
              >
                {hasProposal ? 'Ver Sua Proposta' : 'Fazer uma Proposta'}
              </Button>
            );
          })()}
        </div>
      </div>

      {/* Meta info com badges - abaixo do título */}
      <div className="flex items-center flex-wrap gap-2 text-xs mb-3 mt-3">
        <Badge variant="secondary" className="bg-muted/50 text-foreground">
          <Clock className="h-3 w-3 mr-1" />
          {formatDate(project.created_at)}
        </Badge>
        <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400">
          <MessageSquare className="h-3 w-3 mr-1" />
          {project.proposals_count} Propostas
        </Badge>
        {project.deadline && (
          <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <Clock className="h-3 w-3 mr-1" />
            Prazo: {formatDeadline(project.deadline)}
          </Badge>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-foreground/80 mb-4 leading-relaxed">
        {truncateDescription(project.description)}
        <Link to={`/projetos/${project.id}`} className="text-primary hover:underline ml-1">
          Ver mais detalhes
        </Link>
      </p>

      {/* Skills/Tags com gradiente */}
      {project.skills && project.skills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {project.skills.slice(0, 4).map((skill, index) => (
            <Badge 
              key={index} 
              variant="secondary" 
              className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 hover:border-primary/40 transition-colors"
            >
              {skill}
            </Badge>
          ))}
          {project.skills.length > 4 && (
            <Badge variant="secondary" className="bg-gradient-to-r from-accent/10 to-orange/10 border border-accent/20">
              +{project.skills.length - 4} mais
            </Badge>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between items-center pt-4 border-t">
        {project.profile_id ? (
          <ClickableProfile
            profileId={project.profile_id}
            username={project.profiles.username}
            fullName={project.profiles.full_name}
            avatarUrl={project.profiles.avatar_url}
            avatarSize="sm"
            className="flex items-center gap-3"
            nameClassName="text-sm font-medium"
          />
        ) : (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 ring-2 ring-primary/20">
              {project.profiles.avatar_url ? (
                <AvatarImage 
                  src={project.profiles.avatar_url} 
                  alt={project.profiles.full_name || project.profiles.username}
                />
              ) : (
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {formatShortName(project.profiles.full_name || project.profiles.username)?.[0]?.toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <span className="text-sm font-medium">
              {formatShortName(project.profiles.full_name) || project.profiles.username}
            </span>
          </div>
        )}
        
        {/* Botão de Denunciar ou Excluir */}
        {(() => {
          const ownsByProfile = (project.profile_id && currentUserProfileIds.includes(project.profile_id));
          const ownsByUserId = user && (project as any)?.profiles?.user_id === user.id;
          const isOwner = !!(ownsByProfile || ownsByUserId);
          
          if (isOwner) {
            return (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Excluir
              </Button>
            );
          }
          
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (!user) {
                  toast.error('Faça login para denunciar');
                  return;
                }
                setReportDialogOpen(true);
              }}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Flag className="w-4 h-4 mr-1" />
              Denunciar
            </Button>
          );
        })()}
      </div>

      {/* Dialogs */}
      <ProposalDialog
        open={proposalDialogOpen}
        onOpenChange={(open) => {
          setProposalDialogOpen(open);
          if (!open) {
            handleProposalSuccess();
          }
        }}
        projectId={project.id}
        projectTitle={project.title}
        projectCreatedAt={project.created_at}
        proposalsCount={project.proposals_count}
      />

      <ViewProposalDialog
        open={viewProposalDialogOpen}
        onOpenChange={setViewProposalDialogOpen}
        proposal={userProposal}
        projectTitle={project.title}
      />

      <LoginPromptDialog
        open={loginDialogOpen}
        onOpenChange={setLoginDialogOpen}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Dialog de Denúncia */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="sm:max-w-[500px] border-2 shadow-2xl">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-600 via-orange-600 to-red-600"></div>
          
          <DialogHeader className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 rounded-full border-2 border-red-500/20">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-xl bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                  Denunciar Conteúdo Inadequado
                </DialogTitle>
              </div>
            </div>
            <DialogDescription className="text-base">
              Ajude-nos a manter a comunidade segura. Sua denúncia será analisada pela nossa equipe de moderação com confidencialidade.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5 pt-4">
            <div className="space-y-2">
              <Label className="text-base font-semibold">Motivo da denúncia *</Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger className="h-11 border-2">
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent className="z-[9999] bg-background">
                  <SelectItem value="offensive">
                    Conteúdo ofensivo ou discurso de ódio
                  </SelectItem>
                  <SelectItem value="spam">
                    Spam ou publicidade enganosa
                  </SelectItem>
                  <SelectItem value="harassment">
                    Assédio ou bullying
                  </SelectItem>
                  <SelectItem value="copyright">
                    Violação de direitos autorais
                  </SelectItem>
                  <SelectItem value="fraud">
                    Fraude ou golpe
                  </SelectItem>
                  <SelectItem value="fake">
                    Informações falsas ou enganosas
                  </SelectItem>
                  <SelectItem value="inappropriate">
                    Conteúdo inadequado ou impróprio
                  </SelectItem>
                  <SelectItem value="other">
                    Outro motivo
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">Descrição adicional (opcional)</Label>
              <Textarea
                placeholder="Forneça mais detalhes sobre o problema para ajudar nossa equipe..."
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                rows={4}
                className="resize-none border-2"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {reportDescription.length}/500 caracteres
              </p>
            </div>

            <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Shield className="w-4 h-4 mt-0.5 text-primary" />
                <p>
                  Sua denúncia é <strong>confidencial</strong> e será analisada por nossa equipe em até 24 horas. Você receberá uma notificação sobre o resultado.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleReport}
              disabled={!reportReason}
              className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
            >
              <Flag className="w-4 h-4 mr-2" />
              Enviar Denúncia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O projeto e todas as propostas associadas serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
