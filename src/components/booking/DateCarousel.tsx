import { useRef } from 'react';
import { motion } from 'framer-motion';
import { format, addDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DateCarouselProps {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
}

export function DateCarousel({ selectedDate, onSelectDate }: DateCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Generate next 14 days (excluding Sundays)
  const dates: Date[] = [];
  let currentDate = new Date();
  
  while (dates.length < 14) {
    if (currentDate.getDay() !== 0) { // Exclude Sundays
      dates.push(new Date(currentDate));
    }
    currentDate = addDays(currentDate, 1);
  }

  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-3 px-4">
        Escolha a data
      </h3>
      
      <div 
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {dates.map((date, index) => {
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const isToday = isSameDay(date, new Date());
          
          return (
            <motion.button
              key={date.toISOString()}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelectDate(date)}
              className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-xl border transition-all ${
                isSelected 
                  ? 'bg-primary text-primary-foreground border-primary neon-glow' 
                  : 'bg-card border-border hover:border-primary/50'
              }`}
            >
              <span className={`text-xs uppercase ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                {format(date, 'EEE', { locale: ptBR })}
              </span>
              <span className={`text-2xl font-bold ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>
                {format(date, 'd')}
              </span>
              <span className={`text-xs ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                {format(date, 'MMM', { locale: ptBR })}
              </span>
              {isToday && (
                <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-primary-foreground' : 'text-primary'}`}>
                  Hoje
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
