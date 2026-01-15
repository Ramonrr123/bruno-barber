/**
 * Lógica de Disponibilidade - Ordem de Prioridade
 * 
 * Passo A: Verificar Exceções (schedule_overrides)
 * Passo B: Verificar Regra Global (dias da semana padrão)
 * Passo C: Filtrar Agendamentos (appointments)
 */

import { format } from 'date-fns';
import { ScheduleOverride } from '@/types/booking';

// Dias da semana padrão (0 = Domingo, 6 = Sábado)
// Por padrão: Segunda a Sexta (1-5) e Sábado (6) estão abertos
export const DEFAULT_OPEN_DAYS = [1, 2, 3, 4, 5, 6]; // Segunda a Sábado
export const DEFAULT_START_TIME = '09:00';
export const DEFAULT_END_TIME = '19:00';

export interface AvailabilityResult {
  isAvailable: boolean;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
}

/**
 * Verifica se uma data está disponível seguindo a ordem de prioridade
 */
export async function checkDateAvailability(
  date: Date,
  supabase: any
): Promise<AvailabilityResult> {
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayOfWeek = date.getDay(); // 0 = Domingo, 6 = Sábado

  // ============================================
  // PASSO A: Verificar Exceções (schedule_overrides)
  // ============================================
  try {
    const { data: override, error: overrideError } = await supabase
      .from('schedule_overrides')
      .select('*')
      .eq('date', dateStr)
      .maybeSingle(); // Usar maybeSingle para não dar erro se não encontrar

    // Se não houver erro e encontrou uma exceção
    if (!overrideError && override) {
      // Exceção encontrada - tem poder de veto
      if (!override.is_open) {
        // Dia fechado por exceção
        return {
          isAvailable: false,
          startTime: null,
          endTime: null,
          reason: override.reason || 'Dia fechado por exceção',
        };
      } else {
        // Dia aberto por exceção - usar horários da exceção
        return {
          isAvailable: true,
          startTime: override.start_time || DEFAULT_START_TIME,
          endTime: override.end_time || DEFAULT_END_TIME,
          reason: override.reason || 'Dia aberto por exceção',
        };
      }
    }
    
    // Se houver erro mas for 404 ou tabela não existe, continuar com regra global
    // (Isso permite que o sistema funcione mesmo se a tabela ainda não foi criada)
    if (overrideError) {
      // Verificar se é erro de tabela não encontrada
      const isTableNotFound = 
        overrideError.code === 'PGRST116' || 
        overrideError.code === '42P01' || 
        overrideError.code === 'PGRST205' ||
        overrideError.code === '42883' ||
        overrideError.message?.includes('Could not find the table') ||
        overrideError.message?.includes('relation "public.schedule_overrides" does not exist');
      
      if (isTableNotFound) {
        // Tabela não existe - continuar silenciosamente com regra global
        // Não logar nada para não poluir o console
      } else {
        // Outro tipo de erro - logar apenas em modo debug
        console.debug('Erro ao buscar exceções (continuando com regra global):', overrideError);
      }
    }
  } catch (error: any) {
    // Verificar se é erro de tabela não encontrada
    const isTableNotFound = 
      error?.code === 'PGRST116' || 
      error?.code === '42P01' || 
      error?.code === 'PGRST205' ||
      error?.message?.includes('Could not find the table') ||
      error?.message?.includes('relation "public.schedule_overrides" does not exist');
    
    if (!isTableNotFound) {
      // Apenas logar se não for erro de tabela não encontrada
      console.debug('Erro ao verificar exceções (continuando com regra global):', error);
    }
  }

  // ============================================
  // PASSO B: Verificar Regra Global (dias da semana)
  // ============================================
  if (!DEFAULT_OPEN_DAYS.includes(dayOfWeek)) {
    // Dia fechado pela regra global
    return {
      isAvailable: false,
      startTime: null,
      endTime: null,
      reason: 'Dia fechado (regra global)',
    };
  }

  // Dia aberto pela regra global - usar horário padrão
  return {
    isAvailable: true,
    startTime: DEFAULT_START_TIME,
    endTime: DEFAULT_END_TIME,
    reason: null,
  };
}

/**
 * Gera slots de horário baseado na disponibilidade e agendamentos existentes
 */
export function generateAvailableSlots(
  startTime: string,
  endTime: string,
  serviceDuration: number,
  existingAppointments: Array<{ start_time: string; end_time: string }>,
  selectedDate: Date
): Array<{ time: string; available: boolean }> {
  const slots: Array<{ time: string; available: boolean }> = [];
  
  // Converter horários para minutos
  const [startHours, startMins] = startTime.split(':').map(Number);
  const [endHours, endMins] = endTime.split(':').map(Number);
  const startMinutes = startHours * 60 + startMins;
  const endMinutes = endHours * 60 + endMins;
  
  let currentMinutes = startMinutes;
  
  while (currentMinutes + serviceDuration <= endMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const mins = currentMinutes % 60;
    const time = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    
    // Calcular horário de término do slot
    const slotEndMinutes = currentMinutes + serviceDuration;
    const slotEndHours = Math.floor(slotEndMinutes / 60);
    const slotEndMins = slotEndMinutes % 60;
    const slotEndTime = `${slotEndHours.toString().padStart(2, '0')}:${slotEndMins.toString().padStart(2, '0')}`;
    
    // Verificar conflitos com agendamentos existentes
    const hasConflict = existingAppointments.some((apt) => {
      const aptStart = apt.start_time;
      const aptEnd = apt.end_time;
      
      // Verificar sobreposição
      return (
        (time < aptEnd && slotEndTime > aptStart)
      );
    });
    
    // Verificar se o horário já passou (apenas para hoje)
    const now = new Date();
    const isToday = format(selectedDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
    const slotDate = new Date(selectedDate);
    slotDate.setHours(hours, mins, 0, 0);
    const isPast = isToday && slotDate <= now;
    
    slots.push({
      time,
      available: !hasConflict && !isPast,
    });
    
    currentMinutes += serviceDuration;
  }
  
  return slots;
}
