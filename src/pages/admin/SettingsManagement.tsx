import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings as SettingsIcon, BarChart3 } from 'lucide-react';
import AdminSettings from './Settings';
import AdminAnalytics from './Analytics';

export default function SettingsManagement() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground mt-2">
          Configurações gerais da plataforma e analytics
        </p>
      </div>

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="settings" className="gap-2">
            <SettingsIcon className="h-4 w-4" />
            Configurações
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <AdminSettings />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <AdminAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
