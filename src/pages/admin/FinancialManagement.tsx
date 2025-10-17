import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, DollarSign } from 'lucide-react';
import PlansSettings from './PlansSettings';
import AdminPaymentGateway from './PaymentGateway';

export default function FinancialManagement() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestão Financeira</h1>
        <p className="text-muted-foreground mt-2">
          Configure planos de assinatura e gateway de pagamento
        </p>
      </div>

      <Tabs defaultValue="plans" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="plans" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Planos
          </TabsTrigger>
          <TabsTrigger value="gateway" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Gateway
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-6">
          <PlansSettings />
        </TabsContent>

        <TabsContent value="gateway" className="space-y-6">
          <AdminPaymentGateway />
        </TabsContent>
      </Tabs>
    </div>
  );
}
