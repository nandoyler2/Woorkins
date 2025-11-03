import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Star, CheckCircle, Clock, MessageSquare } from "lucide-react";
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
    <Card className="p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <Link to={`/projetos/${project.id}`} className="flex-1">
          <h3 className="text-lg font-bold text-foreground hover:text-primary transition-colors">
            {project.title}
          </h3>
        </Link>
        <div className="flex items-center gap-3 ml-4">
          <span className="text-lg font-bold text-primary whitespace-nowrap">
            {formatBudget(project.budget_min, project.budget_max)}
          </span>
          {(() => {
            const ownsByProfile = (project.profile_id && currentUserProfileIds.includes(project.profile_id));
            const ownsByUserId = user && (project as any)?.profiles?.user_id === user.id;
            const isOwner = !!(ownsByProfile || ownsByUserId);
            if (isOwner) {
              return (
                <div className="flex flex-col gap-2">
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="whitespace-nowrap bg-muted hover:bg-muted cursor-default text-foreground"
                    disabled
                  >
                    Seu Projeto
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="whitespace-nowrap"
                    asChild
                  >
                    <Link to={`/projeto/${project.id}/editar`}>
                      Editar
                    </Link>
                  </Button>
                </div>
              );
            }
            return (
              <Button 
                variant="default" 
                size="sm" 
                className="whitespace-nowrap"
                onClick={handleMakeProposal}
                style={hasProposal ? { backgroundColor: '#11AA9B' } : undefined}
              >
                {hasProposal ? 'Você já enviou a proposta' : 'Fazer uma proposta'}
              </Button>
            );
          })()}
        </div>
      </div>

      {/* Meta info */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        <span>{formatDate(project.created_at)}</span>
        <span>|</span>
        <span>Propostas: {project.proposals_count}</span>
        <span>|</span>
        <span>Prazo: {formatDeadline(project.deadline)}</span>
      </div>

      {/* Description */}
      <p className="text-sm text-foreground/80 mb-4 leading-relaxed">
        {truncateDescription(project.description)}
        <Link to={`/projetos/${project.id}`} className="text-primary hover:underline ml-1">
          Ver mais detalhes
        </Link>
      </p>

      {/* Skills/Tags */}
      {project.skills && project.skills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {project.skills.slice(0, 4).map((skill, index) => (
            <Badge key={index} variant="secondary" className="bg-muted text-muted-foreground">
              {skill}
            </Badge>
          ))}
          {project.skills.length > 4 && (
            <Badge variant="secondary" className="bg-muted text-muted-foreground">
              +{project.skills.length - 4}
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
            avatarSize="xs"
            className="flex items-center gap-2"
            nameClassName="text-sm text-muted-foreground"
          />
        ) : (
          <div className="flex items-center gap-2">
            <Avatar className="h-3 w-3">
              {project.profiles.avatar_url ? (
                <img 
                  src={project.profiles.avatar_url} 
                  alt={project.profiles.full_name || project.profiles.username}
                  className="h-full w-full object-cover"
                />
              ) : (
                <AvatarFallback className="bg-primary text-primary-foreground text-[6px]">
                  {formatShortName(project.profiles.full_name || project.profiles.username)?.[0]?.toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <span className="text-sm text-muted-foreground">
              {formatShortName(project.profiles.full_name) || project.profiles.username}
            </span>
          </div>
        )}
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
    </Card>
  );
}
