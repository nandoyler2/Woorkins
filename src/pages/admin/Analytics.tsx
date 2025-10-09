import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Users, Briefcase, FileText, Star, TrendingUp, DollarSign } from 'lucide-react';

export default function AdminAnalytics() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBusinesses: 0,
    totalProjects: 0,
    totalEvaluations: 0,
    activeNegotiations: 0,
    totalTransactions: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      const [users, businesses, projects, evaluations, negotiations, transactions] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('business_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('projects').select('id', { count: 'exact', head: true }),
        supabase.from('evaluations').select('id', { count: 'exact', head: true }),
        supabase.from('negotiations').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('transactions').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        totalUsers: users.count || 0,
        totalBusinesses: businesses.count || 0,
        totalProjects: projects.count || 0,
        totalEvaluations: evaluations.count || 0,
        activeNegotiations: negotiations.count || 0,
        totalTransactions: transactions.count || 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const statCards = [
    { title: 'Total de Usuários', value: stats.totalUsers, icon: Users, color: 'text-blue-500' },
    { title: 'Negócios Cadastrados', value: stats.totalBusinesses, icon: Briefcase, color: 'text-purple-500' },
    { title: 'Projetos Criados', value: stats.totalProjects, icon: FileText, color: 'text-green-500' },
    { title: 'Avaliações', value: stats.totalEvaluations, icon: Star, color: 'text-yellow-500' },
    { title: 'Negociações Ativas', value: stats.activeNegotiations, icon: TrendingUp, color: 'text-orange-500' },
    { title: 'Total de Transações', value: stats.totalTransactions, icon: DollarSign, color: 'text-emerald-500' },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics & Relatórios</h1>
        <p className="text-muted-foreground">Visão geral da plataforma</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.title} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <h3 className="text-3xl font-bold mt-2">{stat.value}</h3>
              </div>
              <stat.icon className={`h-12 w-12 ${stat.color}`} />
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Gráficos e Métricas Detalhadas</h3>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          Gráficos serão implementados aqui
        </div>
      </Card>
    </div>
  );
}
