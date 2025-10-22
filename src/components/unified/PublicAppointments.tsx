import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PublicAppointmentsProps {
  entityType: 'user' | 'business';
  username: string;
}

export function PublicAppointments({ entityType, username }: PublicAppointmentsProps) {
  const navigate = useNavigate();

  const handleBookAppointment = () => {
    navigate(`/${username}/agendamento`);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Agendamento
        </CardTitle>
        <CardDescription>Agende um horário para atendimento</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleBookAppointment} className="w-full">
          <Calendar className="h-4 w-4 mr-2" />
          Agendar Horário
        </Button>
      </CardContent>
    </Card>
  );
}
