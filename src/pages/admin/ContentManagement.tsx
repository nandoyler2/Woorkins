import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageCircle, FileText } from 'lucide-react';
import AISettings from './AISettings';
import LegalPages from './LegalPages';

export default function ContentManagement() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestão de Conteúdo</h1>
        <p className="text-muted-foreground mt-2">
          Configure o conteúdo da plataforma: IA, FAQ e páginas legais
        </p>
      </div>

      <Tabs defaultValue="ai" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="ai" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            IA & FAQ
          </TabsTrigger>
          <TabsTrigger value="legal" className="gap-2">
            <FileText className="h-4 w-4" />
            Páginas Legais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="space-y-6">
          <AISettings />
        </TabsContent>

        <TabsContent value="legal" className="space-y-6">
          <LegalPages />
        </TabsContent>
      </Tabs>
    </div>
  );
}
