import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { Service, TimeSlot } from '@/types/booking';
import { DateCarousel } from './DateCarousel';
import { TimeGrid } from './TimeGrid';
import { supabase } from '@/integrations/supabase/client';
import { checkDateAvailability, generateAvailableSlots } from '@/lib/availability';

interface DateTimeSelectionProps {
  service: Service;
  selectedDate: Date | null;
  selectedTime: string | null;
  onSelectDate: (date: Date) => void;
  onSelectTime: (time: string) => void;
  onBack: () => void;
}

// Generate time slots based on service duration
function generateTimeSlots(duration: number): string[] {
  const slots: string[] = [];
  const startHour = 9; // 09:00
  const endHour = 19; // 19:00
  
  let currentMinutes = startHour * 60;
  const endMinutes = endHour * 60;
  
  while (currentMinutes + duration <= endMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const mins = currentMinutes % 60;
    slots.push(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
    currentMinutes += duration;
  }
  
  return slots;
}

// Calculate end time
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, mins] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60);
  const endMins = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
}

export function DateTimeSelection({
  service,
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
  onBack,
}: DateTimeSelectionProps) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!selectedDate) return;

    const fetchAvailability = async () => {
      setIsLoading(true);
      
      try {
        // ============================================
        // PASSO A e B: Verificar disponibilidade da data
        // ============================================
        const availability = await checkDateAvailability(selectedDate, supabase);
        
        console.log('Disponibilidade verificada:', {
          date: format(selectedDate, 'yyyy-MM-dd'),
          dayOfWeek: selectedDate.getDay(),
          isAvailable: availability.isAvailable,
          reason: availability.reason,
          startTime: availability.startTime,
          endTime: availability.endTime,
        });
        
        if (!availability.isAvailable) {
          // Dia não disponível - retornar vazio
          console.log('Dia não disponível:', availability.reason);
          setSlots([]);
          setIsLoading(false);
          return;
        }

        if (!availability.startTime || !availability.endTime) {
          console.error('Horários não definidos para dia disponível');
          setSlots([]);
          setIsLoading(false);
          return;
        }

        // ============================================
        // PASSO C: Buscar agendamentos existentes
        // ============================================
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const { data: appointments, error } = await supabase
          .from('appointments')
          .select('start_time, end_time')
          .eq('appointment_date', dateStr)
          .in('status', ['scheduled', 'confirmed', 'blocked']);

        if (error) {
          console.error('Erro ao buscar agendamentos:', error);
          throw error;
        }

        // ============================================
        // Gerar slots baseado na disponibilidade
        // ============================================
        const availableSlots = generateAvailableSlots(
          availability.startTime!,
          availability.endTime!,
          service.duration,
          appointments || [],
          selectedDate
        );

        setSlots(availableSlots);
      } catch (error) {
        console.error('Error fetching availability:', error);
        // Fallback: retornar vazio em caso de erro
        setSlots([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailability();
  }, [selectedDate, service.duration]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="pb-8"
    >
      <div className="px-4 mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </button>
        
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">{service.icon}</span>
          <div>
            <h3 className="font-semibold text-foreground">{service.name}</h3>
            <p className="text-sm text-muted-foreground">
              {service.duration} min • R$ {service.price}
            </p>
          </div>
        </div>
      </div>

      <DateCarousel 
        selectedDate={selectedDate} 
        onSelectDate={onSelectDate} 
      />
      
      {selectedDate && (
        <TimeGrid
          slots={slots}
          selectedTime={selectedTime}
          onSelectTime={onSelectTime}
          isLoading={isLoading}
        />
      )}
    </motion.div>
  );
}
