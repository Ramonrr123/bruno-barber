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
// Domingo (0) NÃO está incluído - sempre fechado por padrão
export const DEFAULT_OPEN_DAYS = [1, 2, 3, 4, 5, 6]; // Segunda a Sexta e Sábado (Domingo = 0 está fechado)

// Horários padrão para dias da semana
// Segunda a Sexta: 09:30 - 19:30
// Sábado: 08:30 - 20:00
export const WEEKDAY_START_TIME = '09:30'; // Segunda a Sexta
export const WEEKDAY_END_TIME = '19:30';   // Segunda a Sexta
export const SATURDAY_START_TIME = '08:30'; // Sábado
export const SATURDAY_END_TIME = '20:00';   // Sábado

// Horário de almoço
// Segunda a Quinta: 12:00 - 13:30
// Sexta e Sábado: 12:00 - 13:00
export const LUNCH_START_TIME = '12:00';
export const LUNCH_END_TIME_WEEKDAYS = '13:30'; // Segunda a Quinta
export const LUNCH_END_TIME_WEEKEND = '13:00';   // Sexta e Sábado

// Função auxiliar para obter horários baseados no dia da semana
export function getDaySchedule(dayOfWeek: number): { startTime: string; endTime: string } | null {
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    // Segunda a Sexta
    return {
      startTime: WEEKDAY_START_TIME,
      endTime: WEEKDAY_END_TIME,
    };
  } else if (dayOfWeek === 6) {
    // Sábado
    return {
      startTime: SATURDAY_START_TIME,
      endTime: SATURDAY_END_TIME,
    };
  }
  // Domingo ou outro dia - fechado
  return null;
}

// Função auxiliar para obter horário de almoço baseado no dia da semana
export function getLunchSchedule(dayOfWeek: number): { startTime: string; endTime: string } | null {
  if (dayOfWeek >= 1 && dayOfWeek <= 4) {
    // Segunda a Quinta
    return {
      startTime: LUNCH_START_TIME,
      endTime: LUNCH_END_TIME_WEEKDAYS,
    };
  } else if (dayOfWeek === 5 || dayOfWeek === 6) {
    // Sexta e Sábado
    return {
      startTime: LUNCH_START_TIME,
      endTime: LUNCH_END_TIME_WEEKEND,
    };
  }
  // Domingo - sem horário de almoço (dia fechado)
  return null;
}

// Função auxiliar para verificar se um slot conflita com o horário de almoço
function isSlotInLunchTime(
  slotStartTime: string,
  slotEndTime: string,
  lunchStartTime: string,
  lunchEndTime: string
): boolean {
  // Converter para minutos para facilitar comparação
  const [slotStartHours, slotStartMins] = slotStartTime.split(':').map(Number);
  const [slotEndHours, slotEndMins] = slotEndTime.split(':').map(Number);
  const [lunchStartHours, lunchStartMins] = lunchStartTime.split(':').map(Number);
  const [lunchEndHours, lunchEndMins] = lunchEndTime.split(':').map(Number);
  
  const slotStartMinutes = slotStartHours * 60 + slotStartMins;
  const slotEndMinutes = slotEndHours * 60 + slotEndMins;
  const lunchStartMinutes = lunchStartHours * 60 + lunchStartMins;
  const lunchEndMinutes = lunchEndHours * 60 + lunchEndMins;
  
  // Verificar se há sobreposição: o slot conflita se começar antes do fim do almoço E terminar depois do início do almoço
  return slotStartMinutes < lunchEndMinutes && slotEndMinutes > lunchStartMinutes;
}

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
        // Dia aberto por exceção - usar horários da exceção ou horário padrão do dia
        const daySchedule = getDaySchedule(dayOfWeek);
        return {
          isAvailable: true,
          startTime: override.start_time || daySchedule?.startTime || WEEKDAY_START_TIME,
          endTime: override.end_time || daySchedule?.endTime || WEEKDAY_END_TIME,
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
  // Domingo (0) e outros dias não incluídos em DEFAULT_OPEN_DAYS estão fechados
  if (!DEFAULT_OPEN_DAYS.includes(dayOfWeek)) {
    // Dia fechado pela regra global (ex: Domingo = 0 não está em DEFAULT_OPEN_DAYS)
    return {
      isAvailable: false,
      startTime: null,
      endTime: null,
      reason: dayOfWeek === 0 ? 'Domingo - fechado' : 'Dia fechado (regra global)',
    };
  }

  // Dia aberto pela regra global - usar horário padrão do dia
  const daySchedule = getDaySchedule(dayOfWeek);
  if (!daySchedule) {
    // Não deveria acontecer, mas por segurança
    return {
      isAvailable: false,
      startTime: null,
      endTime: null,
      reason: 'Dia fechado (regra global)',
    };
  }

  return {
    isAvailable: true,
    startTime: daySchedule.startTime,
    endTime: daySchedule.endTime,
    reason: null,
  };
}

/**
 * Verifica se um slot conflita com um bloqueio
 * Trabalha apenas com strings (HH:MM) para evitar problemas de timezone
 */
function isSlotBlocked(
  slotStartTime: string,
  slotEndTime: string,
  exception: { is_all_day: boolean; start_time: string | null; end_time: string | null }
): boolean {
  // Se for dia inteiro, sempre bloqueado
  if (exception.is_all_day) {
    return true;
  }

  // Se não tiver horários, não há bloqueio parcial
  if (!exception.start_time || !exception.end_time) {
    return false;
  }

  // Converter para minutos para facilitar comparação (trabalhar apenas com strings)
  const [slotStartHours, slotStartMins] = slotStartTime.split(':').map(Number);
  const [slotEndHours, slotEndMins] = slotEndTime.split(':').map(Number);
  const [blockStartHours, blockStartMins] = exception.start_time.split(':').map(Number);
  const [blockEndHours, blockEndMins] = exception.end_time.split(':').map(Number);
  
  const slotStartMinutes = slotStartHours * 60 + slotStartMins;
  const slotEndMinutes = slotEndHours * 60 + slotEndMins;
  const blockStartMinutes = blockStartHours * 60 + blockStartMins;
  const blockEndMinutes = blockEndHours * 60 + blockEndMins;
  
  // Verificar se há sobreposição: o slot conflita se começar antes do fim do bloqueio E terminar depois do início do bloqueio
  // Isso garante que qualquer minuto que toque o bloqueio torna o slot indisponível
  return slotStartMinutes < blockEndMinutes && slotEndMinutes > blockStartMinutes;
}

/**
 * Gera slots de horário baseado na disponibilidade e agendamentos existentes
 * 
 * Gera horários em intervalos de 30 minutos para oferecer mais opções,
 * verificando se cada slot pode acomodar o serviço completo
 * Agora também considera bloqueios (exceptions)
 */
export function generateAvailableSlots(
  startTime: string,
  endTime: string,
  serviceDuration: number,
  existingAppointments: Array<{ start_time: string; end_time: string }>,
  selectedDate: Date,
  exceptions: Array<{ is_all_day: boolean; start_time: string | null; end_time: string | null }> = []
): Array<{ time: string; available: boolean }> {
  const slots: Array<{ time: string; available: boolean }> = [];
  
  // Obter horário de almoço para o dia selecionado
  const dayOfWeek = selectedDate.getDay();
  const lunchSchedule = getLunchSchedule(dayOfWeek);
  
  // Converter horários para minutos
  const [startHours, startMins] = startTime.split(':').map(Number);
  const [endHours, endMins] = endTime.split(':').map(Number);
  const startMinutes = startHours * 60 + startMins;
  const endMinutes = endHours * 60 + endMins;
  
  // Intervalo padrão para geração de slots (30 minutos)
  // Isso oferece mais opções mesmo para serviços longos
  const SLOT_INTERVAL = 30;
  
  let currentMinutes = startMinutes;
  
  // Gerar slots a cada 30 minutos (ou duração do serviço se for menor que 30min)
  const interval = Math.min(SLOT_INTERVAL, serviceDuration);
  
  while (currentMinutes + serviceDuration <= endMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const mins = currentMinutes % 60;
    const time = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    
    // Calcular horário de término do slot
    const slotEndMinutes = currentMinutes + serviceDuration;
    const slotEndHours = Math.floor(slotEndMinutes / 60);
    const slotEndMins = slotEndMinutes % 60;
    const slotEndTime = `${slotEndHours.toString().padStart(2, '0')}:${slotEndMins.toString().padStart(2, '0')}`;
    
    // Verificar se o horário de término ultrapassa o horário de fechamento
    if (slotEndMinutes > endMinutes) {
      currentMinutes += interval;
      continue;
    }
    
    // Verificar se o slot conflita com o horário de almoço
    let isInLunchTime = false;
    if (lunchSchedule) {
      isInLunchTime = isSlotInLunchTime(
        time,
        slotEndTime,
        lunchSchedule.startTime,
        lunchSchedule.endTime
      );
    }
    
    // Se estiver no horário de almoço, pular este slot
    if (isInLunchTime) {
      // Pular para depois do horário de almoço
      const [lunchEndHours, lunchEndMins] = lunchSchedule!.endTime.split(':').map(Number);
      const lunchEndMinutes = lunchEndHours * 60 + lunchEndMins;
      
      // Se ainda estiver dentro do horário de almoço, avançar para depois dele
      if (currentMinutes < lunchEndMinutes) {
        currentMinutes = lunchEndMinutes;
        continue;
      }
    }
    
    // Verificar se o slot está bloqueado por uma exceção
    const isBlocked = exceptions.some((exception) =>
      isSlotBlocked(time, slotEndTime, exception)
    );

    // Se estiver bloqueado, marcar como indisponível e continuar
    if (isBlocked) {
      slots.push({
        time,
        available: false,
      });
      currentMinutes += interval;
      continue;
    }
    
    // Verificar conflitos com agendamentos existentes
    const hasConflict = existingAppointments.some((apt) => {
      const aptStart = apt.start_time;
      const aptEnd = apt.end_time;
      
      // Verificar sobreposição de horários
      // Conflito se: início do slot está dentro do agendamento OU
      //             fim do slot está dentro do agendamento OU
      //             slot envolve completamente o agendamento
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
    
    // Incrementar pelo intervalo (30min ou duração se menor)
    currentMinutes += interval;
  }
  
  return slots;
}
