import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { Service, TimeSlot } from '@/types/booking';
import { DateCarousel } from './DateCarousel';
import { TimeGrid } from './TimeGrid';
import { supabase } from '@/integrations/supabase/client';
import { checkDateAvailability, generateAvailableSlots } from '@/lib/availability';
import { getServiceIcon } from '@/lib/serviceIcons';
import { formatDuration } from '@/lib/formatDuration';
interface DateTimeSelectionProps {
  service: Service;
  professionalName: string;
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
  professionalName,
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
        
        // Disponibilidade verificada
        
        if (!availability.isAvailable) {
          // Dia não disponível - retornar vazio
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
        // PASSO D: Buscar bloqueios (exceptions) do dia
        // ============================================
        let exceptions: Array<{ is_all_day: boolean; start_time: string | null; end_time: string | null }> = [];
        try {
          const { data: exceptionsData, error: exceptionsError } = await supabase
            .from('exceptions')
            .select('is_all_day, start_time, end_time')
            .eq('date', dateStr);

          // Se não encontrar tabela ou não houver bloqueios, continuar normalmente
          if (!exceptionsError && exceptionsData) {
            exceptions = exceptionsData;
            
            // Se houver bloqueio de dia inteiro, retornar 0 slots
            if (exceptionsData.some(ex => ex.is_all_day)) {
              // Dia inteiro bloqueado por exceção
              setSlots([]);
              setIsLoading(false);
              return;
            }
          }
        } catch (error) {
          // Se tabela não existir ainda, apenas continuar sem bloqueios
          console.debug('Tabela exceptions não encontrada ou erro ao buscar bloqueios:', error);
        }

        // ============================================
        // Gerar slots baseado na disponibilidade
        // ============================================
        const availableSlots = generateAvailableSlots(
          availability.startTime!,
          availability.endTime!,
          service.duration,
          appointments || [],
          selectedDate,
          exceptions
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
        
        <div className="glass-card rounded-xl p-4 flex items-center gap-3 border border-white/10">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center border border-white/5 flex-shrink-0">
            {(() => {
              const IconComponent = getServiceIcon(service.icon);
              return <IconComponent className="w-6 h-6 text-primary/80" />;
            })()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">{service.name}</h3>
            <p className="text-sm text-muted-foreground">
              {formatDuration(service.duration)} • <span className="text-primary font-semibold neon-text">R$ {service.price.toFixed(2).replace('.', ',')}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Profissional: <span className="text-foreground font-medium">{professionalName}</span>
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
