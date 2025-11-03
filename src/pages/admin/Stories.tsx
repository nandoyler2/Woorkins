import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AdminPageLayout } from '@/components/admin/AdminPageLayout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Story {
  id: string;
  created_at: string;
  expires_at: string;
  media_url: string;
  type: string;
  caption?: string | null;
  profile_id: string;
  profiles?: {
    full_name: string;
    username: string;
    avatar_url?: string | null;
  };
}

export default function Stories() {
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStories, setSelectedStories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'single' | 'selected' | 'all'>('single');
  const [storyToDelete, setStoryToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profile_stories' as any)
        .select(`
          id,
          created_at,
          expires_at,
          media_url,
          type,
          text_content,
          profile_id,
          profile:profiles!profile_stories_profile_id_fkey (
            full_name,
            username,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedData = (data || []).map((story: any) => ({
        ...story,
        caption: story.text_content ?? null,
        profiles: story.profile
      }));
      
      setStories(formattedData as Story[]);
    } catch (error) {
      console.error('Error loading stories:', error);
      toast({
        title: 'Erro ao carregar stories',
        description: 'Não foi possível carregar a lista de stories.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStories(new Set(stories.map(s => s.id)));
    } else {
      setSelectedStories(new Set());
    }
  };

  const handleSelectStory = (storyId: string, checked: boolean) => {
    const newSelected = new Set(selectedStories);
    if (checked) {
      newSelected.add(storyId);
    } else {
      newSelected.delete(storyId);
    }
    setSelectedStories(newSelected);
  };

  const openDeleteDialog = (type: 'single' | 'selected' | 'all', storyId?: string) => {
    setDeleteType(type);
    setStoryToDelete(storyId || null);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      let storyIds: string[] = [];

      if (deleteType === 'single' && storyToDelete) {
        storyIds = [storyToDelete];
      } else if (deleteType === 'selected') {
        storyIds = Array.from(selectedStories);
      } else if (deleteType === 'all') {
        storyIds = stories.map(s => s.id);
      }

      if (storyIds.length === 0) {
        toast({
          title: 'Nenhum story selecionado',
          description: 'Selecione pelo menos um story para excluir.',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('profile_stories' as any)
        .delete()
        .in('id', storyIds);

      if (error) throw error;

      toast({
        title: 'Stories excluídos',
        description: `${storyIds.length} story(s) excluído(s) com sucesso.`,
      });

      setSelectedStories(new Set());
      await loadStories();
    } catch (error) {
      console.error('Error deleting stories:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir os stories.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const getDeleteDialogDescription = () => {
    if (deleteType === 'single') {
      return 'Tem certeza que deseja excluir este story? Esta ação não pode ser desfeita.';
    } else if (deleteType === 'selected') {
      return `Tem certeza que deseja excluir ${selectedStories.size} story(s) selecionado(s)? Esta ação não pode ser desfeita.`;
    } else {
      return `Tem certeza que deseja excluir TODOS os ${stories.length} stories? Esta ação não pode ser desfeita.`;
    }
  };

  if (loading) {
    return (
      <AdminPageLayout
        title="Stories"
        description="Gerenciar todos os stories da plataforma"
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminPageLayout>
    );
  }

  return (
    <>
      <AdminPageLayout
        title="Stories"
        description="Gerenciar todos os stories da plataforma"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => openDeleteDialog('selected')}
              disabled={selectedStories.size === 0 || deleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Selecionados ({selectedStories.size})
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => openDeleteDialog('all')}
              disabled={stories.length === 0 || deleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Todos ({stories.length})
            </Button>
          </div>

          {stories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum story encontrado
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedStories.size === stories.length && stories.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Mídia</TableHead>
                    <TableHead>Autor</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Legenda</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Expira em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stories.map((story) => (
                    <TableRow key={story.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedStories.has(story.id)}
                          onCheckedChange={(checked) => handleSelectStory(story.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        {story.type === 'image' ? (
                          <img
                            src={story.media_url}
                            alt="Story"
                            className="h-16 w-16 object-cover rounded-lg"
                          />
                        ) : (
                          <video
                            src={story.media_url}
                            className="h-16 w-16 object-cover rounded-lg"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {story.profiles ? (
                          <div className="flex items-center gap-2">
                            {story.profiles.avatar_url && (
                              <img
                                src={story.profiles.avatar_url}
                                alt={story.profiles.full_name}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            )}
                            <div>
                              <div className="font-medium">{story.profiles.full_name}</div>
                              <div className="text-sm text-muted-foreground">@{story.profiles.username}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Usuário não encontrado</span>
                        )}
                      </TableCell>
                      <TableCell className="capitalize">{story.type}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {story.caption || '-'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(story.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {format(new Date(story.expires_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog('single', story.id)}
                          disabled={deleting}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </AdminPageLayout>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {getDeleteDialogDescription()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
