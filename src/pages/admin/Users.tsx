import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { Search, Shield, User, Ban, MoreVertical, Coins, ShieldOff, Info, History } from 'lucide-react';
import { ManageWoorkoinsDialog } from '@/components/admin/ManageWoorkoinsDialog';
import { BlockUserDialog } from '@/components/admin/BlockUserDialog';
import { BlockDetailsDialog } from '@/components/admin/BlockDetailsDialog';
import { UserHistoryDialog } from '@/components/admin/UserHistoryDialog';

export default function AdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUserProfileId, setCurrentUserProfileId] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [woorkoinsDialogOpen, setWoorkoinsDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockDetailsDialogOpen, setBlockDetailsDialogOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<any>(null);
  const [unblockLoading, setUnblockLoading] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadCurrentProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (data) setCurrentUserProfileId(data.id);
    };
    loadCurrentProfile();
  }, [user]);

  const loadUsers = async () => {
    try {
      // Buscar profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Buscar roles, woorkoins e bloqueios separadamente para cada usuário
      const usersWithData = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.user_id);
          
          const { data: woorkoins } = await supabase
            .from('woorkoins_balance')
            .select('balance')
            .eq('profile_id', profile.id)
            .maybeSingle();

          const { data: systemBlocks } = await supabase
            .from('system_blocks')
            .select('*')
            .eq('profile_id', profile.id);

          // Buscar bloqueios temporários de moderação
          const { data: violations } = await supabase
            .from('moderation_violations')
            .select('*')
            .eq('profile_id', profile.id)
            .maybeSingle();

          // Criar bloqueio sintético se há violação ativa
          const blocks = [...(systemBlocks || [])];
          
          if (violations?.blocked_until) {
            const blockedUntil = new Date(violations.blocked_until);
            const now = new Date();
            
            // Só adicionar se o bloqueio ainda está ativo
            if (blockedUntil > now) {
              blocks.push({
                id: violations.id,
                profile_id: profile.id,
                block_type: 'messaging',
                reason: `Bloqueio automático por ${violations.violation_count} violações de moderação`,
                blocked_until: violations.blocked_until,
                is_permanent: false,
                created_at: violations.last_violation_at || violations.created_at,
                blocked_by: null,
                updated_at: violations.updated_at
              });
            }
          }
          
          return {
            ...profile,
            user_roles: roles || [],
            woorkoins_balance: woorkoins?.balance || 0,
            blocks: blocks,
            violations: violations
          };
        })
      );

      setUsers(usersWithData);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar usuários',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnblockUser = async (profileId: string, blockId: string, isViolation: boolean = false) => {
    setUnblockLoading(true);
    try {
      if (isViolation) {
        // Se for um bloqueio de violação, resetar a contagem
        const { error } = await supabase
          .from('moderation_violations')
          .update({ 
            violation_count: 0, 
            blocked_until: null 
          })
          .eq('id', blockId);

        if (error) throw error;
      } else {
        // Se for um bloqueio manual do sistema
        const { error } = await supabase
          .from('system_blocks')
          .delete()
          .eq('id', blockId);

        if (error) throw error;
      }

      toast({
        title: 'Usuário desbloqueado',
        description: 'O bloqueio foi removido com sucesso',
      });

      setBlockDetailsDialogOpen(false);
      loadUsers();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Não foi possível desbloquear o usuário',
      });
    } finally {
      setUnblockLoading(false);
    }
  };

  const updateUserRole = async (userId: string, role: 'admin' | 'moderator' | 'user') => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role }, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: 'Role atualizada',
        description: 'A permissão do usuário foi alterada com sucesso.',
      });
      
      loadUsers();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar role',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = users.filter(user => 
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gerenciamento de Usuários</h1>
        <p className="text-muted-foreground">Gerencie usuários e suas permissões</p>
      </div>

      <Card className="p-6">
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por nome ou username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Woorkoins</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((usr) => {
              const messagingBlock = usr.blocks.find((b: any) => b.block_type === 'messaging');
              const systemBlock = usr.blocks.find((b: any) => b.block_type === 'system');
              const hasActiveBlock = messagingBlock || systemBlock;

              return (
                <TableRow key={usr.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{usr.full_name || usr.username}</div>
                      <div className="text-sm text-muted-foreground">@{usr.username}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Coins className="h-4 w-4 text-primary" />
                      <span className="font-medium">{usr.woorkoins_balance}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{usr.user_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={usr.user_roles?.[0]?.role || 'user'}
                      onValueChange={(value) => updateUserRole(usr.user_id, value as any)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            User
                          </div>
                        </SelectItem>
                        <SelectItem value="moderator">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Moderator
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" />
                            Admin
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {hasActiveBlock ? (
                      <div className="space-y-1">
                        {messagingBlock && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 hover:bg-transparent"
                            onClick={() => {
                              setSelectedBlock(messagingBlock);
                              setBlockDetailsDialogOpen(true);
                            }}
                          >
                            <Badge variant="destructive" className="text-xs cursor-pointer hover:bg-destructive/90">
                              🚫 Bloqueado (Mensagens)
                              <Info className="ml-1 h-3 w-3" />
                            </Badge>
                          </Button>
                        )}
                        {systemBlock && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 hover:bg-transparent"
                            onClick={() => {
                              setSelectedBlock(systemBlock);
                              setBlockDetailsDialogOpen(true);
                            }}
                          >
                            <Badge variant="destructive" className="text-xs cursor-pointer hover:bg-destructive/90">
                              🚫 Bloqueado (Sistema)
                              <Info className="ml-1 h-3 w-3" />
                            </Badge>
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-xs">Ativo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(usr);
                            setHistoryDialogOpen(true);
                          }}
                        >
                          <History className="mr-2 h-4 w-4" />
                          Ver Histórico Completo
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(usr);
                            setWoorkoinsDialogOpen(true);
                          }}
                        >
                          <Coins className="mr-2 h-4 w-4" />
                          Gerenciar Woorkoins
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(usr);
                            setBlockDialogOpen(true);
                          }}
                        >
                          <Ban className="mr-2 h-4 w-4" />
                          Bloquear Usuário
                        </DropdownMenuItem>
                        {messagingBlock && (
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedBlock(messagingBlock);
                              setBlockDetailsDialogOpen(true);
                            }}
                          >
                            <Info className="mr-2 h-4 w-4" />
                            Ver Detalhes do Bloqueio
                          </DropdownMenuItem>
                        )}
                        {systemBlock && (
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedBlock(systemBlock);
                              setBlockDetailsDialogOpen(true);
                            }}
                          >
                            <Info className="mr-2 h-4 w-4" />
                            Ver Detalhes do Bloqueio
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {selectedUser && (
          <>
            <UserHistoryDialog
              open={historyDialogOpen}
              onOpenChange={setHistoryDialogOpen}
              user={selectedUser}
            />
            <ManageWoorkoinsDialog
              open={woorkoinsDialogOpen}
              onOpenChange={setWoorkoinsDialogOpen}
              user={selectedUser}
              onSuccess={loadUsers}
            />
            <BlockUserDialog
              open={blockDialogOpen}
              onOpenChange={setBlockDialogOpen}
              user={selectedUser}
              currentUserProfileId={currentUserProfileId}
              onSuccess={loadUsers}
            />
          </>
        )}

        {selectedBlock && (
          <BlockDetailsDialog
            open={blockDetailsDialogOpen}
            onOpenChange={setBlockDetailsDialogOpen}
            block={selectedBlock}
            onUnblock={() => {
              const user = users.find(u => u.id === selectedBlock.profile_id);
              const isViolation = user?.violations?.id === selectedBlock.id;
              handleUnblockUser(selectedBlock.profile_id, selectedBlock.id, isViolation);
            }}
            loading={unblockLoading}
          />
        )}
      </Card>
    </div>
  );
}
