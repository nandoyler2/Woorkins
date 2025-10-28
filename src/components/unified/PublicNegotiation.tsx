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
    <Button 
      onClick={() => {/* TODO: implementar navegação para chat de negociação */}} 
      className={`${inline ? "" : ""} bg-gradient-to-r from-green-500 to-green-600 hover:shadow-lg transition-all duration-300 text-white`}
      size={inline ? "sm" : "default"}
    >
      <MessageSquare className="h-4 w-4 mr-2" />
      Iniciar Negociação
    </Button>
  );
}
