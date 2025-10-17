import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Ban, Clock, Search, Edit, Trash2, ShieldOff, AlertCircle } from 'lucide-react';
import { EditBlockDialog } from '@/components/admin/EditBlockDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SystemBlock {
  id: string;
  profile_id: string;
  block_type: 'messaging' | 'system';
  reason: string;
  blocked_until: string | null;
  is_permanent: boolean;
  created_at: string;
  profiles?: {
    full_name: string;
    username: string;
  };
}

export default function SystemBlocks() {
  const [blocks, setBlocks] = useState<SystemBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBlock, setSelectedBlock] = useState<SystemBlock | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadBlocks();
  }, []);

  const loadBlocks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_blocks')
        .select(`
          *,
          profiles!system_blocks_profile_id_fkey (
            full_name,
            username
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBlocks(data as any || []);
    } catch (error) {
      console.error('Error loading blocks:', error);
      toast({
        title: 'Erro ao carregar bloqueios',
        description: 'Não foi possível carregar a lista de bloqueios.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (blockId: string) => {
    try {
      const { error } = await supabase
        .from('system_blocks')
        .delete()
        .eq('id', blockId);

      if (error) throw error;

      toast({
        title: 'Usuário desbloqueado',
        description: 'O bloqueio foi removido com sucesso.',
      });

      loadBlocks();
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast({
        title: 'Erro ao desbloquear',
        description: 'Não foi possível remover o bloqueio.',
        variant: 'destructive',
      });
    }
  };

  const filteredBlocks = blocks.filter(block => {
    const searchLower = searchTerm.toLowerCase();
    const userName = block.profiles?.full_name?.toLowerCase() || '';
    const username = block.profiles?.username?.toLowerCase() || '';
    const reason = block.reason?.toLowerCase() || '';
    
    return userName.includes(searchLower) || 
           username.includes(searchLower) || 
           reason.includes(searchLower);
  });

  const getBlockTypeLabel = (type: string) => {
    switch (type) {
      case 'messaging': return 'Mensagens';
      case 'system': return 'Sistema';
      default: return type;
    }
  };

  const isExpired = (blockedUntil: string | null) => {
    if (!blockedUntil) return false;
    return new Date(blockedUntil) < new Date();
  };

  const getTimeRemaining = (blockedUntil: string | null) => {
    if (!blockedUntil) return null;
    const now = new Date();
    const until = new Date(blockedUntil);
    const diff = until.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expirado';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bloqueios do Sistema</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie todos os bloqueios progressivos e temporários do sistema
        </p>
      </div>

      {/* Busca */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por usuário ou motivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={loadBlocks} variant="outline">
          Atualizar
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Bloqueios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{blocks.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {blocks.filter(b => !isExpired(b.blocked_until)).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Permanentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {blocks.filter(b => b.is_permanent).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Expirados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {blocks.filter(b => isExpired(b.blocked_until)).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Bloqueios */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Bloqueios</CardTitle>
          <CardDescription>
            {filteredBlocks.length} bloqueio(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : filteredBlocks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum bloqueio encontrado
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBlocks.map((block) => (
                <div
                  key={block.id}
                  className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Ban className="h-4 w-4 text-destructive" />
                        <span className="font-semibold">
                          {block.profiles?.full_name || 'Usuário Desconhecido'}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          @{block.profiles?.username || 'unknown'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {getBlockTypeLabel(block.block_type)}
                        </Badge>
                        {block.is_permanent ? (
                          <Badge variant="destructive">Permanente</Badge>
                        ) : isExpired(block.blocked_until) ? (
                          <Badge variant="secondary">Expirado</Badge>
                        ) : (
                          <Badge variant="default" className="bg-orange-500">
                            <Clock className="h-3 w-3 mr-1" />
                            {getTimeRemaining(block.blocked_until)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedBlock(block);
                          setEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleUnblock(block.id)}
                      >
                        <ShieldOff className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="pl-6 space-y-2">
                    <div className="flex items-start gap-2 text-sm">
                      <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <div className="font-medium text-muted-foreground">Motivo:</div>
                        <div className="text-sm">{block.reason}</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Bloqueado em:</span>{' '}
                        {format(new Date(block.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                      {!block.is_permanent && block.blocked_until && (
                        <div>
                          <span className="font-medium">
                            {isExpired(block.blocked_until) ? 'Expirou em:' : 'Expira em:'}
                          </span>{' '}
                          {format(new Date(block.blocked_until), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedBlock && (
        <EditBlockDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          block={selectedBlock}
          onSuccess={loadBlocks}
        />
      )}
    </div>
  );
}
