import { motion } from 'framer-motion';
import { Service } from '@/types/booking';
import { services } from '@/data/services';
import { ServiceCard } from './ServiceCard';

interface ServiceSelectionProps {
  onSelect: (service: Service) => void;
}

export function ServiceSelection({ onSelect }: ServiceSelectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="px-4 pb-8"
    >
      <h2 className="text-lg font-semibold text-foreground mb-4">
        Escolha seu serviço
      </h2>
      
      <div className="space-y-4">
        {services.map((service, index) => (
          <ServiceCard
            key={service.id}
            service={service}
            onSelect={onSelect}
            index={index}
          />
        ))}
      </div>
    </motion.div>
  );
}
