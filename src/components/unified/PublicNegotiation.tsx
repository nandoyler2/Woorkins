import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';

interface PublicNegotiationProps {
  entityType: 'user' | 'business';
  entityId: string;
  username?: string;
  inline?: boolean;
}

export function PublicNegotiation({ entityType, entityId, username, inline = false }: PublicNegotiationProps) {
  return (
    <Card className={inline ? "" : "mb-6"}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Negociação
        </CardTitle>
        {!inline && <CardDescription>Inicie uma conversa para negociar</CardDescription>}
      </CardHeader>
      <CardContent>
        <Button onClick={() => {/* TODO: implementar navegação para chat de negociação */}} className="w-full">
          <MessageSquare className="h-4 w-4 mr-2" />
          Iniciar Negociação
        </Button>
      </CardContent>
    </Card>
  );
}
