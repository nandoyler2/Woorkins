import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Eye } from 'lucide-react';

export default function AdminBusinesses() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from('business_profiles')
        .select(`
          *,
          profiles (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBusinesses(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar negócios',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleVerification = async (profileId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ verified: !currentStatus })
        .eq('id', profileId);

      if (error) throw error;

      toast({
        title: currentStatus ? 'Verificação removida' : 'Negócio verificado',
        description: 'Status de verificação atualizado com sucesso.',
      });
      
      loadBusinesses();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar verificação',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    loadBusinesses();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gerenciamento de Negócios</h1>
        <p className="text-muted-foreground">Gerencie e verifique perfis de negócios</p>
      </div>

      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome da Empresa</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Avaliação</TableHead>
              <TableHead>Reviews</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {businesses.map((business) => (
              <TableRow key={business.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{business.company_name}</div>
                    <div className="text-sm text-muted-foreground">{business.email}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{business.category || 'N/A'}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    ⭐ {business.average_rating?.toFixed(1) || '0.0'}
                  </div>
                </TableCell>
                <TableCell>{business.total_reviews || 0}</TableCell>
                <TableCell>
                  {business.profiles?.verified ? (
                    <Badge className="bg-green-500">Verificado</Badge>
                  ) : (
                    <Badge variant="secondary">Não verificado</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant={business.profiles?.verified ? "outline" : "default"}
                      size="sm"
                      onClick={() => toggleVerification(business.profile_id, business.profiles?.verified)}
                    >
                      {business.profiles?.verified ? (
                        <XCircle className="h-4 w-4" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
