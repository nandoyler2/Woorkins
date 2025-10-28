import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PublicAppointmentsProps {
  entityType: 'user' | 'business';
  entityId: string;
  username?: string;
}

export function PublicAppointments({ entityType, entityId, username }: PublicAppointmentsProps) {
  const navigate = useNavigate();

  const handleBookAppointment = () => {
    navigate(`/${username}/agendamento`);
  };

  return (
    <Card className="mb-6 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-l-4 border-l-blue-500 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-6 w-6 text-blue-500" />
          Agendamento
        </CardTitle>
        <CardDescription>Agende um horário para atendimento</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleBookAppointment} className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:shadow-lg transition-all duration-300">
          <Calendar className="h-4 w-4 mr-2" />
          Agendar Horário
        </Button>
      </CardContent>
    </Card>
  );
}
