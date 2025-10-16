import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SafeImage } from '@/components/ui/safe-image';
import { ImageViewer } from '@/components/ImageViewer';
import { FileText, Trash2, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DocumentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    full_name: string;
    username: string;
    approved_document: any;
  };
  onUpdate: () => void;
}

export function DocumentsDialog({ open, onOpenChange, user, onUpdate }: DocumentsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [viewerImage, setViewerImage] = useState<{ url: string; name: string } | null>(null);

  // Detectar se é documento completo (frente e verso juntos) ou separado
  const isCompleteDocument = user.approved_document?.document_front_url && 
                             !user.approved_document?.document_back_url;

  const handleImageClick = (url: string, name: string) => {
    setViewerImage({ url, name });
  };

  const handleDeleteDocuments = async () => {
    try {
      setLoading(true);

      // Atualizar o status da verificação para rejected (a trigger cuidará da exclusão dos arquivos)
      const { error: updateError } = await supabase
        .from('document_verifications')
        .update({ verification_status: 'rejected' })
        .eq('id', user.approved_document.id);

      if (updateError) throw updateError;

      // Atualizar o perfil para remover a verificação
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          document_verified: false,
          document_verification_status: 'pending'
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      toast({
        title: 'Documentos excluídos',
        description: 'Os documentos foram removidos e a verificação foi revertida',
      });

      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error deleting documents:', error);
      toast({
        title: 'Erro ao excluir documentos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setShowDeleteAlert(false);
    }
  };

  if (!user.approved_document) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Documentos</DialogTitle>
            <DialogDescription>
              Nenhum documento encontrado para este usuário.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Documentos de {user.full_name}</DialogTitle>
            <DialogDescription>
              Visualize os documentos verificados do usuário
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Informações Extraídas */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Informações Extraídas
              </h3>
              <div className="grid gap-2 text-sm">
                {user.approved_document.extracted_name && (
                  <div>
                    <span className="font-medium">Nome:</span> {user.approved_document.extracted_name}
                  </div>
                )}
                {user.approved_document.extracted_cpf && (
                  <div>
                    <span className="font-medium">CPF:</span> {user.approved_document.extracted_cpf}
                  </div>
                )}
                {user.approved_document.extracted_birth_date && (
                  <div>
                    <span className="font-medium">Data de Nascimento:</span>{' '}
                    {new Date(user.approved_document.extracted_birth_date).toLocaleDateString('pt-BR')}
                  </div>
                )}
                {user.approved_document.verified_at && (
                  <div>
                    <span className="font-medium">Verificado em:</span>{' '}
                    {new Date(user.approved_document.verified_at).toLocaleDateString('pt-BR')}
                  </div>
                )}
              </div>
            </div>

            {/* Documentos */}
            <div className="space-y-4">
              <h3 className="font-semibold">Documentos Enviados</h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                {/* Documento Completo ou Frente/Verso Separado */}
                {isCompleteDocument ? (
                  // Documento completo (frente e verso juntos)
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Documento Completo</p>
                    <div 
                      className="border rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handleImageClick(user.approved_document.document_front_url, 'documento-completo.jpg')}
                    >
                      <SafeImage
                        src={user.approved_document.document_front_url}
                        alt="Documento completo"
                        className="w-full h-auto"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Frente do Documento */}
                    {user.approved_document.document_front_url && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Frente do Documento</p>
                        <div 
                          className="border rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => handleImageClick(user.approved_document.document_front_url, 'documento-frente.jpg')}
                        >
                          <SafeImage
                            src={user.approved_document.document_front_url}
                            alt="Frente do documento"
                            className="w-full h-auto"
                          />
                        </div>
                      </div>
                    )}

                    {/* Verso do Documento */}
                    {user.approved_document.document_back_url && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Verso do Documento</p>
                        <div 
                          className="border rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => handleImageClick(user.approved_document.document_back_url, 'documento-verso.jpg')}
                        >
                          <SafeImage
                            src={user.approved_document.document_back_url}
                            alt="Verso do documento"
                            className="w-full h-auto"
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Selfie */}
                {user.approved_document.selfie_url && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Selfie com Documento</p>
                    <div 
                      className="border rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handleImageClick(user.approved_document.selfie_url, 'selfie-documento.jpg')}
                    >
                      <SafeImage
                        src={user.approved_document.selfie_url}
                        alt="Selfie com documento"
                        className="w-full h-auto"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="destructive"
                onClick={() => setShowDeleteAlert(true)}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Documentos e Tirar Verificação
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog de Confirmação */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Excluir documentos e remover verificação?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Excluir permanentemente todos os documentos enviados</li>
                <li>Remover a verificação do usuário</li>
                <li>O usuário precisará enviar novos documentos para verificar novamente</li>
              </ul>
              <p className="mt-3 font-semibold">Esta ação não pode ser desfeita.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDocuments}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Excluindo...' : 'Sim, excluir documentos'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Visualizador de Imagem em Tela Cheia */}
      {viewerImage && (
        <ImageViewer
          imageUrl={viewerImage.url}
          imageName={viewerImage.name}
          onClose={() => setViewerImage(null)}
        />
      )}
    </>
  );
}
