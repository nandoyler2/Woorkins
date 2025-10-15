import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Eye, FileText, User, Calendar, CheckCircle, XCircle, Clock, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Verification {
  id: string;
  profile_id: string;
  document_front_url: string;
  document_back_url: string;
  selfie_url: string;
  extracted_name: string;
  extracted_cpf: string;
  extracted_birth_date: string;
  verification_status: string;
  verification_result: any;
  ai_analysis: any;
  verified_at: string;
  created_at: string;
  profile: {
    full_name: string;
    cpf: string;
    avatar_url: string;
    user_id: string;
  };
}

export default function DocumentVerifications() {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadVerifications();
  }, []);

  const loadVerifications = async () => {
    try {
      const { data, error } = await supabase
        .from('document_verifications')
        .select(`
          *,
          profile:profiles!inner(
            full_name,
            cpf,
            avatar_url,
            user_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVerifications(data || []);
    } catch (error) {
      console.error('Error loading verifications:', error);
      toast({
        title: 'Erro ao carregar verificações',
        description: 'Tente novamente mais tarde',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      approved: { variant: 'default', icon: CheckCircle, label: 'Aprovado' },
      rejected: { variant: 'destructive', icon: XCircle, label: 'Rejeitado' },
      pending: { variant: 'secondary', icon: Clock, label: 'Pendente' }
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const downloadDocument = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: 'Erro ao baixar documento',
        description: 'Não foi possível fazer o download',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Verificações de Documentos</h1>
        <p className="text-muted-foreground">
          Visualize todas as verificações de identidade submetidas pelos usuários
        </p>
      </div>

      <div className="grid gap-4">
        {verifications.map((verification) => (
          <Card key={verification.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={verification.profile.avatar_url} />
                    <AvatarFallback>
                      <User className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{verification.profile.full_name}</CardTitle>
                    <CardDescription>
                      CPF: {verification.profile.cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                    </CardDescription>
                  </div>
                </div>
                {getStatusBadge(verification.verification_status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Nome Extraído:</span>
                    <span>{verification.extracted_name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">CPF Extraído:</span>
                    <span>{verification.extracted_cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Data de Nascimento:</span>
                    <span>{verification.extracted_birth_date || 'N/A'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Submetido:</span>
                    <span>
                      {formatDistanceToNow(new Date(verification.created_at), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </span>
                  </div>
                  {verification.verified_at && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Verificado:</span>
                      <span>
                        {formatDistanceToNow(new Date(verification.verified_at), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedVerification(verification)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Detalhes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadDocument(verification.document_front_url, `doc_frente_${verification.profile.full_name}.jpg`)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Frente
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadDocument(verification.document_back_url, `doc_verso_${verification.profile.full_name}.jpg`)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Verso
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadDocument(verification.selfie_url, `selfie_${verification.profile.full_name}.jpg`)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Selfie
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {verifications.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma verificação encontrada</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={!!selectedVerification} onOpenChange={() => setSelectedVerification(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Verificação</DialogTitle>
            <DialogDescription>
              Análise completa realizada pela IA
            </DialogDescription>
          </DialogHeader>

          {selectedVerification && (
            <div className="space-y-6">
              {/* Images */}
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium mb-2">Documento - Frente</p>
                  <img 
                    src={selectedVerification.document_front_url} 
                    alt="Documento Frente"
                    className="w-full rounded-lg border"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Documento - Verso</p>
                  <img 
                    src={selectedVerification.document_back_url} 
                    alt="Documento Verso"
                    className="w-full rounded-lg border"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Selfie</p>
                  <img 
                    src={selectedVerification.selfie_url} 
                    alt="Selfie"
                    className="w-full rounded-lg border"
                  />
                </div>
              </div>

              {/* Rejection Reasons */}
              {selectedVerification.verification_result?.rejectionReasons && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <h3 className="font-semibold text-red-800 mb-2">Motivos da Rejeição:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                    {selectedVerification.verification_result.rejectionReasons.map((reason: string, i: number) => (
                      <li key={i}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI Analysis */}
              {selectedVerification.ai_analysis && (
                <div className="space-y-4">
                  <h3 className="font-semibold">Análise da IA</h3>
                  <pre className="bg-secondary p-4 rounded-lg text-xs overflow-auto">
                    {JSON.stringify(selectedVerification.ai_analysis, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
