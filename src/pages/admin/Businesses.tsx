import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Eye, RotateCcw, UserCog, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Business {
  id: string;
  company_name: string;
  category: string | null;
  average_rating: number;
  total_reviews: number;
  active: boolean;
  slug: string | null;
  deleted: boolean;
  deleted_at: string | null;
  profiles: {
    full_name: string | null;
    id: string;
  };
}

interface Profile {
  id: string;
  full_name: string;
  username: string;
}

export default function AdminBusinesses() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confirmSlug, setConfirmSlug] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from('business_profiles')
        .select(`
          *,
          profiles(id, full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBusinesses(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar empresas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .order('full_name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      console.error('Error loading profiles:', error);
    }
  };

  useEffect(() => {
    loadBusinesses();
    loadProfiles();
  }, []);

  const toggleVerification = async (businessId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('business_profiles')
        .update({ active: !currentStatus })
        .eq('id', businessId);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: `Empresa ${!currentStatus ? 'ativada' : 'desativada'} com sucesso.`,
      });

      loadBusinesses();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRestore = async () => {
    if (!selectedBusiness) return;

    try {
      const { error } = await supabase
        .from('business_profiles')
        .update({
          deleted: false,
          deleted_at: null,
          deleted_by: null,
          profile_id: selectedProfileId || selectedBusiness.profiles.id,
        })
        .eq('id', selectedBusiness.id);

      if (error) throw error;

      toast({
        title: "Perfil restaurado",
        description: "O perfil foi restaurado com sucesso.",
      });

      setShowRestoreDialog(false);
      setSelectedBusiness(null);
      setSelectedProfileId('');
      loadBusinesses();
    } catch (error: any) {
      toast({
        title: "Erro ao restaurar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleMove = async () => {
    if (!selectedBusiness || !selectedProfileId) {
      toast({
        title: "Erro",
        description: "Selecione um usuário para transferir o perfil.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Verificar se o usuário destino já tem um perfil profissional
      const { data: existingBusiness, error: checkError } = await supabase
        .from('business_profiles')
        .select('id, company_name')
        .eq('profile_id', selectedProfileId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingBusiness) {
        toast({
          title: "Erro ao transferir",
          description: `Este usuário já possui um perfil profissional (${existingBusiness.company_name}). Um usuário não pode ter mais de um perfil profissional.`,
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('business_profiles')
        .update({ profile_id: selectedProfileId })
        .eq('id', selectedBusiness.id);

      if (error) throw error;

      toast({
        title: "Perfil transferido",
        description: "O perfil foi transferido para o novo usuário.",
      });

      setShowMoveDialog(false);
      setSelectedBusiness(null);
      setSelectedProfileId('');
      loadBusinesses();
    } catch (error: any) {
      toast({
        title: "Erro ao transferir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedBusiness) return;

    // Verificar se o perfil já está marcado como deletado
    if (!selectedBusiness.deleted) {
      toast({
        title: "Erro",
        description: "Apenas perfis já excluídos podem ser removidos permanentemente.",
        variant: "destructive",
      });
      return;
    }

    if (confirmSlug !== `@${selectedBusiness.slug}`) {
      toast({
        title: "Erro",
        description: "O @ digitado não corresponde ao perfil selecionado.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Exclusão permanente do banco de dados
      const { error } = await supabase
        .from('business_profiles')
        .delete()
        .eq('id', selectedBusiness.id);

      if (error) throw error;

      toast({
        title: "Perfil removido permanentemente",
        description: "O perfil foi excluído definitivamente do sistema.",
      });

      setShowDeleteDialog(false);
      setSelectedBusiness(null);
      setConfirmSlug('');
      loadBusinesses();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  const activeBusinesses = businesses.filter(b => !b.deleted);
  const deletedBusinesses = businesses.filter(b => b.deleted);

  const filteredProfiles = profiles.filter(p => 
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderBusinessTable = (businessList: Business[], showRestoreActions = false) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Empresa</TableHead>
          <TableHead>@Perfil</TableHead>
          <TableHead>Categoria</TableHead>
          <TableHead>Avaliação</TableHead>
          <TableHead>Reviews</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {businessList.map((business) => (
          <TableRow key={business.id}>
            <TableCell>
              <div>
                <div className="font-medium">{business.company_name}</div>
                {business.profiles?.full_name && (
                  <div className="text-sm text-muted-foreground">
                    Proprietário: {business.profiles.full_name}
                  </div>
                )}
              </div>
            </TableCell>
            <TableCell>
              <span className="font-mono text-sm">@{business.slug}</span>
            </TableCell>
            <TableCell>{business.category || '-'}</TableCell>
            <TableCell>{business.average_rating.toFixed(1)}</TableCell>
            <TableCell>{business.total_reviews}</TableCell>
            <TableCell>
              {showRestoreActions ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Excluído
                </span>
              ) : (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  business.active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {business.active ? 'Ativa' : 'Inativa'}
                </span>
              )}
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                {showRestoreActions ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedBusiness(business);
                        setSelectedProfileId(business.profiles.id);
                        setShowRestoreDialog(true);
                      }}
                      title="Restaurar perfil"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedBusiness(business);
                        setShowDeleteDialog(true);
                      }}
                      title="Excluir permanentemente"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/${business.slug}`)}
                      title="Ver perfil"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleVerification(business.id, business.active)}
                      title={business.active ? 'Desativar' : 'Ativar'}
                    >
                      {business.active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedBusiness(business);
                        setShowMoveDialog(true);
                      }}
                      title="Mover para outro usuário"
                    >
                      <UserCog className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/${business.slug}`)}
                      title="Ver perfil"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Perfis Profissionais</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie todos os perfis profissionais da plataforma
        </p>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Ativos ({activeBusinesses.length})</TabsTrigger>
          <TabsTrigger value="deleted">Excluídos ({deletedBusinesses.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card className="p-6">
            {renderBusinessTable(activeBusinesses)}
          </Card>
        </TabsContent>

        <TabsContent value="deleted">
          <Card className="p-6">
            {renderBusinessTable(deletedBusinesses, true)}
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurar Perfil Profissional</DialogTitle>
            <DialogDescription>
              Escolha para qual usuário deseja restaurar este perfil.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Usuário original</Label>
              <p className="text-sm text-muted-foreground">
                {selectedBusiness?.profiles?.full_name}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-select">Restaurar para (opcional)</Label>
              <Input
                placeholder="Buscar usuário por nome ou @username..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (e.target.value === '') setSelectedProfileId('');
                }}
              />
              {searchTerm && (
                <ScrollArea className="h-[200px] border rounded-md">
                  {filteredProfiles.length > 0 ? (
                    <div className="p-2">
                      {filteredProfiles.map((profile) => (
                        <div
                          key={profile.id}
                          onClick={() => {
                            setSelectedProfileId(profile.id);
                            setSearchTerm('');
                          }}
                          className={`p-3 rounded-md cursor-pointer hover:bg-accent transition-colors ${
                            selectedProfileId === profile.id ? 'bg-accent' : ''
                          }`}
                        >
                          <div className="font-medium">{profile.full_name}</div>
                          <div className="text-sm text-muted-foreground">@{profile.username}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      Nenhum usuário encontrado
                    </div>
                  )}
                </ScrollArea>
              )}
              {selectedProfileId && !searchTerm && (
                <div className="p-3 bg-accent rounded-md">
                  <div className="text-sm font-medium">
                    Selecionado: {profiles.find(p => p.id === selectedProfileId)?.full_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    @{profiles.find(p => p.id === selectedProfileId)?.username}
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Deixe em branco para restaurar para o usuário original
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRestore}>
              Restaurar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Permanentemente</DialogTitle>
            <DialogDescription>
              <span className="text-destructive font-medium">ATENÇÃO: Esta ação é irreversível!</span> 
              <br />
              O perfil será removido permanentemente do banco de dados, incluindo todos os dados associados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Perfil a ser excluído permanentemente</Label>
              <p className="text-sm font-medium">{selectedBusiness?.company_name}</p>
              <p className="text-xs text-muted-foreground font-mono">@{selectedBusiness?.slug}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-delete">
                Digite <span className="font-mono">@{selectedBusiness?.slug}</span> para confirmar a exclusão permanente
              </Label>
              <Input
                id="confirm-delete"
                placeholder={`@${selectedBusiness?.slug}`}
                value={confirmSlug}
                onChange={(e) => setConfirmSlug(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDeleteDialog(false);
              setConfirmSlug('');
            }}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={confirmSlug !== `@${selectedBusiness?.slug}`}
            >
              Excluir Permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transferir Perfil Profissional</DialogTitle>
            <DialogDescription>
              Escolha o novo proprietário para este perfil.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Perfil</Label>
              <p className="text-sm font-medium">{selectedBusiness?.company_name}</p>
            </div>
            <div className="space-y-2">
              <Label>Proprietário atual</Label>
              <p className="text-sm text-muted-foreground">
                {selectedBusiness?.profiles?.full_name}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-owner">Novo proprietário</Label>
              <Input
                placeholder="Buscar usuário por nome ou @username..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (e.target.value === '') setSelectedProfileId('');
                }}
              />
              {searchTerm && (
                <ScrollArea className="h-[200px] border rounded-md">
                  {filteredProfiles.length > 0 ? (
                    <div className="p-2">
                      {filteredProfiles.map((profile) => (
                        <div
                          key={profile.id}
                          onClick={() => {
                            setSelectedProfileId(profile.id);
                            setSearchTerm('');
                          }}
                          className={`p-3 rounded-md cursor-pointer hover:bg-accent transition-colors ${
                            selectedProfileId === profile.id ? 'bg-accent' : ''
                          }`}
                        >
                          <div className="font-medium">{profile.full_name}</div>
                          <div className="text-sm text-muted-foreground">@{profile.username}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      Nenhum usuário encontrado
                    </div>
                  )}
                </ScrollArea>
              )}
              {selectedProfileId && !searchTerm && (
                <div className="p-3 bg-accent rounded-md">
                  <div className="text-sm font-medium">
                    Selecionado: {profiles.find(p => p.id === selectedProfileId)?.full_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    @{profiles.find(p => p.id === selectedProfileId)?.username}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMoveDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleMove}>
              Transferir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
