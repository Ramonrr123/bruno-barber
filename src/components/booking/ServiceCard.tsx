import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { Service } from '@/types/booking';

interface ServiceCardProps {
  service: Service;
  onSelect: (service: Service) => void;
  index: number;
}

export function ServiceCard({ service, onSelect, index }: ServiceCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(service)}
      className="w-full glass-card rounded-xl p-5 text-left transition-all hover:border-primary/50 hover:neon-glow active:neon-glow-strong"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-3xl">{service.icon}</span>
        <span className="text-primary font-bold text-xl">
          R$ {service.price}
        </span>
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mb-1">
        {service.name}
      </h3>
      
      <p className="text-muted-foreground text-sm mb-3">
        {service.description}
      </p>
      
      <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
        <Clock className="w-4 h-4" />
        <span>{service.duration} min</span>
      </div>
    </motion.button>
  );
}
