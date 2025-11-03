import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Flag, AlertTriangle, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAdminCounts } from '@/hooks/useAdminCounts';
import AdminModeration from './Moderation';
import AdminReports from './Reports';
import ProjectModeration from './ProjectModeration';

export default function ModerationManagement() {
  const { counts } = useAdminCounts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Moderação</h1>
        <p className="text-muted-foreground mt-2">
          Moderação de conteúdo e análise de denúncias
        </p>
      </div>

      <Tabs defaultValue="moderation" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="moderation" className="gap-2">
            <Flag className="h-4 w-4" />
            Mensagens Bloqueadas
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Denúncias
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-2">
            <FileText className="h-4 w-4" />
            Projetos
            {counts.pendingProjects > 0 && (
              <Badge variant="destructive" className="ml-2">
                {counts.pendingProjects}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="moderation" className="space-y-6">
          <AdminModeration />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <AdminReports />
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          <ProjectModeration />
        </TabsContent>
      </Tabs>
    </div>
  );
}
