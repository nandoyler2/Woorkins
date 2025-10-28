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
    <Card className={`${inline ? "" : "mb-6"} bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-l-4 border-l-purple-500 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 backdrop-blur-sm`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-purple-500" />
          Negociação
        </CardTitle>
        {!inline && <CardDescription>Inicie uma conversa para negociar</CardDescription>}
      </CardHeader>
      <CardContent>
        <Button onClick={() => {/* TODO: implementar navegação para chat de negociação */}} className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:shadow-lg transition-all duration-300">
          <MessageSquare className="h-4 w-4 mr-2" />
          Iniciar Negociação
        </Button>
      </CardContent>
    </Card>
  );
}
