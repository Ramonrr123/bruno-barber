import { motion } from 'framer-motion';
import { TimeSlot } from '@/types/booking';

interface TimeGridProps {
  slots: TimeSlot[];
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
  isLoading: boolean;
}

export function TimeGrid({ slots, selectedTime, onSelectTime, isLoading }: TimeGridProps) {
  if (isLoading) {
    return (
      <div className="px-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Horários disponíveis
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div 
              key={i} 
              className="h-12 rounded-lg bg-muted animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  // Filtrar apenas os slots disponíveis - não mostrar os agendados/concluídos
  const availableSlots = slots.filter(slot => slot.available);

  return (
    <div className="px-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">
        Horários disponíveis ({availableSlots.length})
      </h3>
      
      {availableSlots.length === 0 ? (
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-muted-foreground py-8"
        >
          Nenhum horário disponível nesta data.
          <br />
          <span className="text-sm">Tente outra data!</span>
        </motion.p>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {availableSlots.map((slot, index) => {
            const isSelected = selectedTime === slot.time;
            
            return (
              <motion.button
                key={slot.time}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelectTime(slot.time)}
                className={`h-12 rounded-lg font-medium text-sm transition-all ${
                  isSelected 
                    ? 'bg-primary text-primary-foreground neon-glow' 
                    : 'bg-card border border-border hover:border-primary/50 text-foreground'
                }`}
              >
                {slot.time}
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
