import {
  AlertTriangle,
  Eye,
  MessagesSquare,
  Shield,
  Users,
  Zap,
} from 'lucide-react';
import { useRouter } from 'next/router';
import React, { useState } from 'react';

import BusinessFeature from '@/components/business/BusinessFeature';
import BusinessForm from '@/components/business/BusinessForm';
import SectionHeader from '@/components/SectionHeader';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { Business } from '@/types';

type Section = 'posts' | 'evaluations' | 'settings' | 'tools' | 'profile-cover' | 'admin';

interface BusinessEditProps {
  business: Business;
  features: Omit<BusinessFeature, 'isActive'>[];
}

const BusinessEdit: React.FC<BusinessEditProps> = ({ business, features }) => {
  const router = useRouter();
  const { toast } = useToast();
  const [section, setSection] = useState<Section>('posts');

  const menuItems = [
    { id: 'posts' as Section, label: 'Posts', icon: MessagesSquare, color: 'text-orange-500' },
    { id: 'evaluations' as Section, label: 'Avaliações', icon: Users, color: 'text-pink-500' },
    { id: 'settings' as Section, label: 'Configurações', icon: AlertTriangle, color: 'text-red-500' },
  ];

  const customizationItems = [
    { id: 'tools' as Section, label: 'Ferramentas', icon: Zap, color: 'text-yellow-500' },
    { id: 'profile-cover' as Section, label: 'Perfile Capa', icon: Eye, color: 'text-blue-500' },
  ];

  const adminItems = [
    { id: 'admin' as Section, label: 'Administradores', icon: Shield, color: 'text-purple-500' },
  ];

  const availableFeatures: Omit<BusinessFeature, 'isActive'>[] = [
    {
      id: 'blog',
      label: 'Blog',
      description: 'Crie posts para o seu negócio',
      price: 0,
    },
    {
      id: 'online_store',
      label: 'Loja Online',
      description: 'Venda seus produtos online',
      price: 29.90,
    },
    {
      id: 'scheduling',
      label: 'Agendamento',
      description: 'Agende horários com seus clientes',
      price: 19.90,
    },
    {
      id: 'menu',
      label: 'Cardápio Digital',
      description: 'Mostre seu cardápio online',
      price: 9.90,
    },
  ];

  return (
    <div className="w-full">
      <SectionHeader
        title="Editar negócio"
        description="Altere as informações do seu negócio"
      />
      <Separator />

      <BusinessForm business={business} />

      <Separator />

      <SectionHeader
        title="Funcionalidades"
        description="Adicione funcionalidades ao seu negócio"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {availableFeatures.map((feature) => (
          <BusinessFeature
            key={feature.id}
            id={feature.id}
            label={feature.label}
            description={feature.description}
            price={feature.price}
            isActive={false}
          />
        ))}
      </div>
    </div>
  );
};

export default BusinessEdit;
