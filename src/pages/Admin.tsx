import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { AdminCard } from '@/components/admin/AdminCard';
import { AdminPageLayout } from '@/components/admin/AdminPageLayout';
import { useAdminCounts } from '@/hooks/useAdminCounts';
import {
  Users,
  Briefcase,
  Star,
  FileText,
  TrendingUp,
  DollarSign,
  MessageSquare,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface Stats {
  totalUsers: number;
  totalBusinesses: number;
  totalEvaluations: number;
  totalPosts: number;
  totalProjects: number;
  totalProposals: number;
  monthlyRevenue: number;
  activeUsers: number;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
  status: 'success' | 'warning' | 'error';
}

export default function Admin() {
  const navigate = useNavigate();
  const { counts, loading: countsLoading } = useAdminCounts();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalBusinesses: 0,
    totalEvaluations: 0,
    totalPosts: 0,
    totalProjects: 0,
    totalProposals: 0,
    monthlyRevenue: 0,
    activeUsers: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Admin Dashboard - Woorkins';
    loadStats();
    loadRecentActivities();
  }, []);

  const loadStats = async () => {
    try {
      const [usersResult, businessesResult, evaluationsResult, postsResult, projectsResult, proposalsResult] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).is('deleted', false),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('profile_type', 'business').is('deleted', false),
        supabase.from('evaluations').select('id', { count: 'exact', head: true }),
        supabase.from('profile_stories').select('id', { count: 'exact', head: true }),
        supabase.from('projects').select('id', { count: 'exact', head: true }),
        supabase.from('proposals').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        totalUsers: usersResult.count || 0,
        totalBusinesses: businessesResult.count || 0,
        totalEvaluations: evaluationsResult.count || 0,
        totalPosts: postsResult.count || 0,
        totalProjects: projectsResult.count || 0,
        totalProposals: proposalsResult.count || 0,
        monthlyRevenue: 0,
        activeUsers: 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivities = async () => {
    try {
      const { data } = await supabase
        .from('platform_activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        const activities: RecentActivity[] = data.map((activity) => ({
          id: activity.id,
          type: activity.activity_type,
          description: getActivityDescription(activity),
          timestamp: new Date(activity.created_at),
          status: getActivityStatus(activity.activity_type),
        }));
        setRecentActivities(activities);
      }
    } catch (error) {
      console.error('Error loading recent activities:', error);
    }
  };

  const getActivityDescription = (activity: any) => {
    switch (activity.activity_type) {
      case 'project_published':
        return `${activity.profile_name} publicou um novo projeto`;
      case 'story_published':
        return `${activity.profile_name} publicou um story`;
      case 'profile_followed':
        return `${activity.profile_name} seguiu ${activity.target_profile_name}`;
      case 'proposal_sent':
        return `${activity.profile_name} enviou uma proposta`;
      default:
        return `${activity.profile_name} realizou uma ação`;
    }
  };

  const getActivityStatus = (type: string): 'success' | 'warning' | 'error' => {
    if (type.includes('blocked') || type.includes('rejected')) return 'error';
    if (type.includes('pending') || type.includes('review')) return 'warning';
    return 'success';
  };

  const criticalCount = counts.support + counts.withdrawalRequests + counts.pendingProjects + counts.documentVerifications;

  if (loading || countsLoading) {
    return (
      <AdminPageLayout title="Dashboard Administrativo" description="Visão geral das atividades da plataforma">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-[140px]" />
          ))}
        </div>
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout 
      title="Dashboard Administrativo" 
      description="Visão geral das atividades da plataforma"
    >
      <div className="space-y-8">
        {criticalCount > 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-destructive animate-pulse" />
                <CardTitle className="text-destructive">
                  Atenção: {criticalCount} {criticalCount === 1 ? 'Pendência Crítica' : 'Pendências Críticas'}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
            <div className="flex flex-wrap gap-3">
              {counts.support > 0 && (
                <Button variant="destructive" size="sm" onClick={() => navigate('/admin/suporte')}>
                  {counts.support} Suporte{counts.support > 1 ? 's' : ''}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              {counts.withdrawalRequests > 0 && (
                <Button variant="destructive" size="sm" onClick={() => navigate('/admin/financeiro')}>
                  {counts.withdrawalRequests} Saque{counts.withdrawalRequests > 1 ? 's' : ''}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              {counts.pendingProjects > 0 && (
                <Button variant="destructive" size="sm" onClick={() => navigate('/admin/moderacao')}>
                  {counts.pendingProjects} Projeto{counts.pendingProjects > 1 ? 's' : ''}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              {counts.documentVerifications > 0 && (
                <Button variant="destructive" size="sm" onClick={() => navigate('/admin/usuarios')}>
                  {counts.documentVerifications} Verificação{counts.documentVerifications > 1 ? 'ões' : ''}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
               )}
             </div>
           </CardContent>
         </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <AdminCard
          title="Usuários Totais"
          value={stats.totalUsers.toLocaleString()}
          icon={Users}
          description="Usuários registrados na plataforma"
          gradient="blue"
          onClick={() => navigate('/admin/usuarios')}
        />

        <AdminCard
          title="Perfis Profissionais"
          value={stats.totalBusinesses.toLocaleString()}
          icon={Briefcase}
          description="Perfis de negócios ativos"
          gradient="purple"
          onClick={() => navigate('/admin/perfis-profissionais')}
        />

        <AdminCard
          title="Projetos Ativos"
          value={stats.totalProjects.toLocaleString()}
          icon={FileText}
          description="Projetos publicados"
          gradient="green"
          onClick={() => navigate('/admin/moderacao')}
        />

        <AdminCard
          title="Avaliações"
          value={stats.totalEvaluations.toLocaleString()}
          icon={Star}
          description="Avaliações realizadas"
          gradient="orange"
        />

        <AdminCard
          title="Propostas"
          value={stats.totalProposals.toLocaleString()}
          icon={FileText}
          description="Propostas enviadas"
          gradient="blue"
        />

        <AdminCard
          title="Receita Mensal"
          value={`R$ ${stats.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          description="Receita do mês atual"
          gradient="green"
          onClick={() => navigate('/admin/financeiro')}
        />

        <AdminCard
          title="Mensagens Bloqueadas"
          value={counts.moderation.toLocaleString()}
          icon={MessageSquare}
          description="Mensagens em moderação"
          gradient="orange"
          onClick={() => navigate('/admin/moderacao')}
        />

        <AdminCard
          title="Bloqueios Ativos"
          value={counts.systemBlocks.toLocaleString()}
          icon={AlertTriangle}
          description="Usuários bloqueados"
          gradient="purple"
          onClick={() => navigate('/admin/usuarios')}
          />
        </div>

        <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="h-6 w-6 text-primary" />
              <CardTitle>Atividades Recentes</CardTitle>
            </div>
            <Badge variant="outline">{recentActivities.length} atividades</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {recentActivities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma atividade recente
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  {activity.status === 'success' && (
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  )}
                  {activity.status === 'warning' && (
                    <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                  )}
                  {activity.status === 'error' && (
                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.timestamp.toLocaleString('pt-BR')}
                    </p>
                  </div>

                  <Badge variant={activity.status === 'error' ? 'destructive' : 'secondary'}>
                    {activity.type}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          </CardContent>
        </Card>

        <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 p-6 hover:bg-primary/5 hover:border-primary transition-all"
              onClick={() => navigate('/admin/usuarios')}
            >
              <Users className="h-8 w-8 text-primary" />
              <span className="font-semibold">Gerenciar Usuários</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col gap-2 p-6 hover:bg-accent/50 hover:border-accent transition-all"
              onClick={() => navigate('/admin/moderacao')}
            >
              <MessageSquare className="h-8 w-8 text-accent" />
              <span className="font-semibold">Moderação</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col gap-2 p-6 hover:bg-secondary/50 hover:border-secondary transition-all"
              onClick={() => navigate('/admin/financeiro')}
            >
              <DollarSign className="h-8 w-8 text-secondary" />
              <span className="font-semibold">Financeiro</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col gap-2 p-6 hover:bg-orange/10 hover:border-orange transition-all"
              onClick={() => navigate('/admin/relatorios')}
            >
              <TrendingUp className="h-8 w-8 text-orange" />
              <span className="font-semibold">Relatórios</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </AdminPageLayout>
  );
}