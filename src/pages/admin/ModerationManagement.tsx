import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Flag, AlertTriangle } from 'lucide-react';
import AdminModeration from './Moderation';
import AdminReports from './Reports';

export default function ModerationManagement() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Moderação</h1>
        <p className="text-muted-foreground mt-2">
          Moderação de conteúdo e análise de denúncias
        </p>
      </div>

      <Tabs defaultValue="moderation" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="moderation" className="gap-2">
            <Flag className="h-4 w-4" />
            Mensagens Bloqueadas
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Denúncias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="moderation" className="space-y-6">
          <AdminModeration />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <AdminReports />
        </TabsContent>
      </Tabs>
    </div>
  );
}
