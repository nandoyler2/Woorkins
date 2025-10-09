import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

export default function AdminSettings() {
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: 'Configurações salvas',
      description: 'As configurações foram atualizadas com sucesso.',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações do Sistema</h1>
        <p className="text-muted-foreground">Configure parâmetros da plataforma</p>
      </div>

      <Card className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Taxas e Comissões</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Taxa de Serviço (%)</Label>
                <Input type="number" placeholder="10" />
              </div>
              <div className="space-y-2">
                <Label>Taxa de Saque (%)</Label>
                <Input type="number" placeholder="2" />
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-lg font-semibold mb-4">Categorias</h3>
          <div className="space-y-2">
            <Label>Categorias de Negócios</Label>
            <Input placeholder="Design, Desenvolvimento, Marketing..." />
            <p className="text-sm text-muted-foreground">Separe as categorias por vírgula</p>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-lg font-semibold mb-4">Integrações</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Chave API Stripe</Label>
              <Input type="password" placeholder="sk_test_..." />
            </div>
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <Input placeholder="https://..." />
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-lg font-semibold mb-4">Limites de Conteúdo</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Máximo de caracteres por post</Label>
              <Input type="number" placeholder="500" />
            </div>
            <div className="space-y-2">
              <Label>Máximo de mídias por post</Label>
              <Input type="number" placeholder="10" />
            </div>
          </div>
        </div>

        <Button onClick={handleSave} className="w-full">
          Salvar Configurações
        </Button>
      </Card>
    </div>
  );
}
