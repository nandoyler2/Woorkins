import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Flag } from 'lucide-react';

export default function AdminModeration() {
  const [posts, setPosts] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadContent = async () => {
    try {
      const [postsData, projectsData, evaluationsData] = await Promise.all([
        supabase.from('posts').select('*, profiles(*)').order('created_at', { ascending: false }).limit(50),
        supabase.from('projects').select('*, profiles(*)').order('created_at', { ascending: false }).limit(50),
        supabase.from('evaluations').select('*').order('created_at', { ascending: false }).limit(50)
      ]);

      setPosts(postsData.data || []);
      setProjects(projectsData.data || []);
      setEvaluations(evaluationsData.data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar conteúdo',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const deletePost = async (id: string) => {
    try {
      const { error } = await supabase.from('posts').delete().eq('id', id);
      if (error) throw error;
      
      toast({ title: 'Post removido com sucesso' });
      loadContent();
    } catch (error: any) {
      toast({ title: 'Erro ao remover post', description: error.message, variant: 'destructive' });
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      
      toast({ title: 'Projeto removido com sucesso' });
      loadContent();
    } catch (error: any) {
      toast({ title: 'Erro ao remover projeto', description: error.message, variant: 'destructive' });
    }
  };

  useEffect(() => {
    loadContent();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Moderação de Conteúdo</h1>
        <p className="text-muted-foreground">Revise e modere conteúdo da plataforma</p>
      </div>

      <Tabs defaultValue="posts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="posts">Posts ({posts.length})</TabsTrigger>
          <TabsTrigger value="projects">Projetos ({projects.length})</TabsTrigger>
          <TabsTrigger value="evaluations">Avaliações ({evaluations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id} className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">@{post.profiles?.username}</span>
                    <Badge variant="outline">{new Date(post.created_at).toLocaleDateString()}</Badge>
                  </div>
                  <p className="text-sm">{post.content}</p>
                  {post.media_urls && post.media_urls.length > 0 && (
                    <Badge className="mt-2">Contém {post.media_urls.length} mídia(s)</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    <Flag className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deletePost(post.id)}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          {projects.map((project) => (
            <Card key={project.id} className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold">{project.title}</span>
                    <Badge>{project.status}</Badge>
                    <Badge variant="outline">{new Date(project.created_at).toLocaleDateString()}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{project.description}</p>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{project.category}</Badge>
                    <Badge variant="outline">{project.proposals_count} propostas</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    <Flag className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteProject(project.id)}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="evaluations" className="space-y-4">
          {evaluations.map((evaluation) => (
            <Card key={evaluation.id} className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold">{evaluation.title}</span>
                    <Badge>⭐ {evaluation.rating}/5</Badge>
                    {evaluation.is_verified && <Badge variant="secondary">Verificado</Badge>}
                  </div>
                  <p className="text-sm">{evaluation.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tipo: {evaluation.evaluation_type}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm">
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
