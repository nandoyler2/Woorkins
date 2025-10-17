import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Ban, FileCheck } from 'lucide-react';
import AdminUsers from './Users';
import SystemBlocks from './SystemBlocks';
import AdminDocumentVerifications from './DocumentVerifications';

export default function UsersManagement() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestão de Usuários</h1>
        <p className="text-muted-foreground mt-2">
          Gerenciamento completo de usuários, bloqueios e verificações
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="blocks" className="gap-2">
            <Ban className="h-4 w-4" />
            Bloqueios
          </TabsTrigger>
          <TabsTrigger value="verifications" className="gap-2">
            <FileCheck className="h-4 w-4" />
            Verificações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <AdminUsers />
        </TabsContent>

        <TabsContent value="blocks" className="space-y-6">
          <SystemBlocks />
        </TabsContent>

        <TabsContent value="verifications" className="space-y-6">
          <AdminDocumentVerifications />
        </TabsContent>
      </Tabs>
    </div>
  );
}
