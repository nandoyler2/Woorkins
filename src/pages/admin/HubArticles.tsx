import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Eye, Search, Image as ImageIcon } from 'lucide-react';
import { SafeImage } from '@/components/ui/safe-image';
import { toast } from 'sonner';
import { RichTextEditor } from '@/components/RichTextEditor';
import { ImageUpload } from '@/components/ImageUpload';

interface Article {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  cover_image: string | null;
  category: string;
  tags: string[];
  views_count: number;
  published: boolean;
  featured: boolean;
  published_at: string | null;
  created_at: string;
}

const CATEGORIES = [
  'negócios',
  'empreendedorismo',
  'carreiras',
  'freelancing',
  'tecnologia',
  'produtividade',
  'finanças',
  'networking',
];

export default function HubArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [profileId, setProfileId] = useState<string>('');

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCoverImage, setFormCoverImage] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formPublished, setFormPublished] = useState(false);
  const [formFeatured, setFormFeatured] = useState(false);

  useEffect(() => {
    loadArticles();
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (data) setProfileId(data.id);
    }
  };

  const loadArticles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hub_articles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setArticles(data);
    } catch (error) {
      console.error('Erro ao carregar artigos:', error);
      toast.error('Erro ao carregar artigos');
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleTitleChange = (value: string) => {
    setFormTitle(value);
    if (!editingArticle) {
      setFormSlug(generateSlug(value));
    }
  };

  const openCreateDialog = () => {
    setEditingArticle(null);
    setFormTitle('');
    setFormSlug('');
    setFormSummary('');
    setFormContent('');
    setFormCoverImage('');
    setFormCategory('');
    setFormTags('');
    setFormPublished(false);
    setFormFeatured(false);
    setDialogOpen(true);
  };

  const openEditDialog = (article: Article) => {
    setEditingArticle(article);
    setFormTitle(article.title);
    setFormSlug(article.slug);
    setFormSummary(article.summary);
    setFormContent(article.content);
    setFormCoverImage(article.cover_image || '');
    setFormCategory(article.category);
    setFormTags(article.tags.join(', '));
    setFormPublished(article.published);
    setFormFeatured(article.featured);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formTitle || !formSlug || !formSummary || !formContent || !formCategory) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!profileId) {
      toast.error('Erro ao identificar usuário');
      return;
    }

    const tags = formTags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag);

    const articleData = {
      title: formTitle,
      slug: formSlug,
      summary: formSummary,
      content: formContent,
      cover_image: formCoverImage || null,
      category: formCategory,
      tags,
      published: formPublished,
      featured: formFeatured,
      author_profile_id: profileId,
      published_at: formPublished ? (editingArticle?.published_at || new Date().toISOString()) : null,
    };

    try {
      if (editingArticle) {
        const { error } = await supabase
          .from('hub_articles')
          .update(articleData)
          .eq('id', editingArticle.id);

        if (error) throw error;
        toast.success('Artigo atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('hub_articles')
          .insert([articleData]);

        if (error) throw error;
        toast.success('Artigo criado com sucesso!');
      }

      setDialogOpen(false);
      loadArticles();
    } catch (error: any) {
      console.error('Erro ao salvar artigo:', error);
      toast.error(error.message || 'Erro ao salvar artigo');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este artigo?')) return;

    try {
      const { error } = await supabase
        .from('hub_articles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Artigo excluído com sucesso!');
      loadArticles();
    } catch (error) {
      console.error('Erro ao excluir artigo:', error);
      toast.error('Erro ao excluir artigo');
    }
  };

  const handleTogglePublish = async (article: Article) => {
    try {
      const { error } = await supabase
        .from('hub_articles')
        .update({
          published: !article.published,
          published_at: !article.published ? new Date().toISOString() : article.published_at,
        })
        .eq('id', article.id);

      if (error) throw error;
      toast.success(article.published ? 'Artigo despublicado' : 'Artigo publicado');
      loadArticles();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status do artigo');
    }
  };

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || article.category === filterCategory;
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'published' && article.published) ||
      (filterStatus === 'draft' && !article.published);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Artigos do HUB</h2>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Artigo
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar artigos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="published">Publicados</SelectItem>
                <SelectItem value="draft">Rascunhos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Articles Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Imagem</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-center">Views</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredArticles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum artigo encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredArticles.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell>
                      {article.cover_image ? (
                        <SafeImage
                          src={article.cover_image}
                          alt={article.title}
                          className="w-20 h-14 object-cover rounded"
                        />
                      ) : (
                        <div className="w-20 h-14 bg-muted rounded flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold">{article.title}</p>
                        {article.featured && (
                          <Badge className="bg-red-600 text-white text-xs mt-1">Destaque</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{article.category}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Eye className="w-4 h-4 text-muted-foreground" />
                        {article.views_count}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {article.published ? (
                        <Badge className="bg-green-600 text-white">Publicado</Badge>
                      ) : (
                        <Badge variant="outline">Rascunho</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTogglePublish(article)}
                        >
                          {article.published ? 'Despublicar' : 'Publicar'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(article)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(article.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Editor Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingArticle ? 'Editar Artigo' : 'Novo Artigo'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Digite o título do artigo"
              />
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL) *</Label>
              <Input
                id="slug"
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
                placeholder="url-amigavel-do-artigo"
              />
            </div>

            {/* Cover Image */}
            <div className="space-y-2">
              <Label>Imagem de Capa</Label>
              <ImageUpload
                currentImageUrl={formCoverImage}
                onUpload={setFormCoverImage}
                bucket="business-media"
                folder="hub-articles"
                type="cover"
              />
            </div>

            {/* Summary */}
            <div className="space-y-2">
              <Label htmlFor="summary">Resumo *</Label>
              <Textarea
                id="summary"
                value={formSummary}
                onChange={(e) => setFormSummary(e.target.value)}
                placeholder="Breve resumo do artigo (até 200 caracteres)"
                maxLength={200}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">{formSummary.length}/200</p>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">Conteúdo (Markdown) *</Label>
              <RichTextEditor
                value={formContent}
                onChange={setFormContent}
                placeholder="Escreva o conteúdo do artigo em Markdown..."
                maxLength={50000}
                className="min-h-[400px]"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Categoria *</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
              <Input
                id="tags"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                placeholder="ex: marketing, vendas, estratégia"
              />
            </div>

            {/* Switches */}
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <Switch
                  id="published"
                  checked={formPublished}
                  onCheckedChange={setFormPublished}
                />
                <Label htmlFor="published" className="cursor-pointer">Publicar</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="featured"
                  checked={formFeatured}
                  onCheckedChange={setFormFeatured}
                />
                <Label htmlFor="featured" className="cursor-pointer">Destacar</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingArticle ? 'Atualizar' : 'Criar'} Artigo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
