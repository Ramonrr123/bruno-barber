import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { Service } from '@/types/booking';
import { getServiceIcon } from '@/lib/serviceIcons';
import { formatDuration } from '@/lib/formatDuration';

interface ServiceCardProps {
  service: Service;
  onSelect: (service: Service) => void;
  index: number;
}

export function ServiceCard({ service, onSelect, index }: ServiceCardProps) {
  const IconComponent = getServiceIcon(service.icon);
  
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(service)}
      className="w-full glass-card rounded-xl p-5 text-left transition-all border border-white/10 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 active:scale-[0.98] backdrop-blur-xl"
    >
      <div className="flex items-start gap-4">
        {/* Imagem ou ícone profissional em destaque à esquerda */}
        <div className="flex-shrink-0 pt-1">
          {service.image_url ? (
            <div className="w-14 h-14 rounded-lg overflow-hidden border border-white/5 bg-primary/10">
              <img 
                src={service.image_url} 
                alt={service.name}
                width={56}
                height={56}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center border border-white/5">
              <IconComponent className="w-7 h-7 text-primary/80" />
            </div>
          )}
        </div>

        {/* Conteúdo principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-lg font-semibold text-foreground flex-1">
              {service.name}
            </h3>
            <span className="text-primary font-bold text-xl flex-shrink-0 whitespace-nowrap neon-text">
              R$ {service.price.toFixed(2).replace('.', ',')}
            </span>
          </div>

          {/* Description em cinza elegante */}
          {service.description && (
            <p className="text-gray-400 text-sm mb-3 leading-relaxed">
              {service.description}
            </p>
          )}

          {/* Duração */}
          <div className="flex items-center gap-1.5 text-gray-400 text-sm">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>{formatDuration(service.duration)}</span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}
