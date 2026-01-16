import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Service } from '@/types/booking';
import { supabase } from '@/integrations/supabase/client';
import { ServiceCard } from './ServiceCard';
import { Loader2 } from 'lucide-react';

interface ServiceSelectionProps {
  onSelect: (service: Service) => void;
}

export function ServiceSelection({ onSelect }: ServiceSelectionProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const { data, error: fetchError } = await supabase
          .from('services')
          .select('id, name, duration, price, description, icon')
          .order('name', { ascending: true });

        if (fetchError) {
          console.error('Erro ao buscar serviços:', fetchError);
          setError('Erro ao carregar serviços. Tente novamente.');
          return;
        }

        // Converter os dados do banco para o formato Service
        const formattedServices: Service[] = (data || []).map((service) => ({
          id: service.id,
          name: service.name,
          duration: service.duration,
          price: typeof service.price === 'number' ? service.price : parseFloat(String(service.price)),
          description: service.description || '',
          icon: service.icon || 'scissors', // Fallback para 'scissors' ao invés de emoji
        }));

        setServices(formattedServices);
      } catch (err) {
        console.error('Erro inesperado ao buscar serviços:', err);
        setError('Erro inesperado ao carregar serviços.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchServices();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="px-4 pb-8 flex flex-col h-full"
    >
      <h2 className="text-lg font-semibold text-foreground mb-4">
        Escolha seu serviço
      </h2>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>{error}</p>
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhum serviço disponível no momento.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden min-h-0">
          <div className="services-scroll-container space-y-4 pr-2">
            {services.map((service, index) => (
              <ServiceCard
                key={service.id}
                service={service}
                onSelect={onSelect}
                index={index}
              />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
