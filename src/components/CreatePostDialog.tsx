import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MediaUpload } from './MediaUpload';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Send } from 'lucide-react';

interface CreatePostDialogProps {
  businessId: string;
  onPostCreated: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function CreatePostDialog({ businessId, onPostCreated, open: controlledOpen, onOpenChange, trigger }: CreatePostDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [content, setContent] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaTypes, setMediaTypes] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const { toast } = useToast();

  const handleMediaUpload = (url: string, type: string) => {
    setMediaUrls([...mediaUrls, url]);
    setMediaTypes([...mediaTypes, type]);
  };

  const handleSubmit = async () => {
    if (!content.trim() && mediaUrls.length === 0) {
      toast({
        title: 'Post vazio',
        description: 'Adicione texto ou mídia ao post',
        variant: 'destructive',
      });
      return;
    }

    setPosting(true);
    try {
      const { error } = await supabase
        .from('business_posts' as any)
        .insert({
          business_id: businessId,
          content: content.trim(),
          media_urls: mediaUrls.length > 0 ? mediaUrls : null,
          media_types: mediaTypes.length > 0 ? mediaTypes : null,
        });

      if (error) throw error;

      toast({
        title: 'Post publicado!',
        description: 'Seu post foi compartilhado.',
      });

      setContent('');
      setMediaUrls([]);
      setMediaTypes([]);
      setOpen(false);
      onPostCreated();
    } catch (error: any) {
      toast({
        title: 'Erro ao publicar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setPosting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder="O que você quer compartilhar?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <MediaUpload onUpload={handleMediaUpload} folder={businessId} />
          {mediaUrls.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {mediaUrls.length} {mediaUrls.length === 1 ? 'arquivo' : 'arquivos'} adicionado(s)
            </div>
          )}
          <Button 
            onClick={handleSubmit} 
            disabled={posting || (!content.trim() && mediaUrls.length === 0)}
            className="w-full bg-gradient-primary hover:shadow-glow"
          >
            <Send className="w-4 h-4 mr-2" />
            {posting ? 'Publicando...' : 'Publicar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
