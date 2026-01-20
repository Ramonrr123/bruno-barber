import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, X, Plus, Trash2, Clock, AlertCircle } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { ScheduleOverride } from '@/types/booking';
import { notification } from '@/hooks/useNotification';
import { showConfirm as confirm } from '@/hooks/useConfirm';
import { DEFAULT_OPEN_DAYS } from '@/lib/availability';

// Função auxiliar para normalizar data para meio-dia (evita problemas de timezone)
// Garante que mesmo com timezone GMT-3, a data continue no dia correto
const normalizeToNoon = (date: Date): Date => {
  const normalized = new Date(date);
  normalized.setHours(12, 0, 0, 0); // Força 12:00:00
  return normalized;
};

// Função auxiliar para obter o dia da semana de forma segura (sem problemas de timezone)
const getSafeDayOfWeek = (date: Date): number => {
  const normalized = normalizeToNoon(date);
  return normalized.getDay(); // Agora sempre retorna o dia correto
};

// Verificar se a tabela existe antes de fazer queries
async function checkTableExists(supabase: any): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('schedule_overrides')
      .select('id')
      .limit(1);
    
    // Verificar se é erro de tabela não encontrada
    const isTableNotFound = 
      error?.code === 'PGRST116' || 
      error?.code === '42P01' || 
      error?.code === 'PGRST205' ||
      error?.message?.includes('Could not find the table') ||
      error?.message?.includes('relation "public.schedule_overrides" does not exist');
    
    // Se não houver erro ou erro não for de tabela não encontrada, tabela existe
    return !error || !isTableNotFound;
  } catch {
    return false;
  }
}

interface ScheduleOverridesManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ScheduleOverridesManager({ isOpen, onClose }: ScheduleOverridesManagerProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideForm, setOverrideForm] = useState({
    date: '',
    is_open: true,
    start_time: '09:00',
    end_time: '19:00',
    reason: '',
  });

  // Buscar exceções do mês selecionado
  useEffect(() => {
    if (!isOpen) return;

    const fetchOverrides = async () => {
      setIsLoading(true);
      try {
        // Verificar se a tabela existe primeiro (silenciosamente)
        const tableExists = await checkTableExists(supabase);
        if (!tableExists) {
          // Tabela não existe - retornar vazio sem logar erro
          setOverrides([]);
          setIsLoading(false);
          return;
        }

        const start = startOfMonth(selectedMonth);
        const end = endOfMonth(selectedMonth);
        
        const { data, error } = await supabase
          .from('schedule_overrides')
          .select('*')
          .gte('date', format(start, 'yyyy-MM-dd'))
          .lte('date', format(end, 'yyyy-MM-dd'))
          .order('date', { ascending: true });

        if (error) {
          // Se a tabela não existe ainda, apenas mostrar aviso silenciosamente
          if (error.code === 'PGRST116' || error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
            // Tabela não existe - não logar erro, apenas retornar vazio
            setOverrides([]);
            return;
          }
          throw error;
        }
        setOverrides(data as ScheduleOverride[] || []);
      } catch (error: any) {
        // Verificar se é erro de tabela não encontrada
        const isTableNotFound = 
          error?.code === 'PGRST116' || 
          error?.code === '42P01' || 
          error?.code === 'PGRST205' ||
          error?.message?.includes('Could not find the table') ||
          error?.message?.includes('relation "public.schedule_overrides" does not exist');
        
        if (!isTableNotFound) {
          console.error('Erro ao buscar exceções:', error);
          notification.error('Erro ao carregar exceções');
        }
        // Sempre retornar vazio em caso de erro
        setOverrides([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOverrides();
  }, [isOpen, selectedMonth]);

  const handleDateClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const existingOverride = overrides.find(o => o.date === dateStr);
    const dayOfWeek = getSafeDayOfWeek(date); // Usar função segura para evitar problemas de timezone
    const isDefaultOpen = DEFAULT_OPEN_DAYS.includes(dayOfWeek);

    setSelectedDate(date);
    
    if (existingOverride) {
      // Editar exceção existente
      setOverrideForm({
        date: existingOverride.date,
        is_open: existingOverride.is_open,
        start_time: existingOverride.start_time || '09:00',
        end_time: existingOverride.end_time || '19:00',
        reason: existingOverride.reason || '',
      });
    } else {
      // Criar nova exceção
      setOverrideForm({
        date: dateStr,
        is_open: !isDefaultOpen, // Inverter o estado padrão
        start_time: '09:00',
        end_time: '19:00',
        reason: '',
      });
    }
    
    setShowOverrideModal(true);
  };

  const handleSaveOverride = async () => {
    if (!overrideForm.date) return;

    try {
      // Verificar se a tabela existe
      const tableExists = await checkTableExists(supabase);
      if (!tableExists) {
        notification.error('Tabela schedule_overrides não existe. Execute a migration primeiro.');
        return;
      }

      if (overrideForm.is_open && (!overrideForm.start_time || !overrideForm.end_time)) {
        notification.error('Horários são obrigatórios quando o dia está aberto');
        return;
      }

      const overrideData: any = {
        date: overrideForm.date,
        is_open: overrideForm.is_open,
        reason: overrideForm.reason || null,
      };

      if (overrideForm.is_open) {
        overrideData.start_time = overrideForm.start_time;
        overrideData.end_time = overrideForm.end_time;
      } else {
        overrideData.start_time = null;
        overrideData.end_time = null;
      }

      // Verificar se já existe
      const existing = overrides.find(o => o.date === overrideForm.date);
      
      if (existing) {
        // Atualizar
        const { error } = await supabase
          .from('schedule_overrides')
          .update(overrideData)
          .eq('id', existing.id);

        if (error) throw error;
        notification.success('Exceção atualizada com sucesso');
      } else {
        // Criar
        const { error } = await supabase
          .from('schedule_overrides')
          .insert(overrideData);

        if (error) throw error;
        notification.success('Exceção criada com sucesso');
      }

      // Recarregar exceções
      const start = startOfMonth(selectedMonth);
      const end = endOfMonth(selectedMonth);
      const { data } = await supabase
        .from('schedule_overrides')
        .select('*')
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      setOverrides(data as ScheduleOverride[] || []);
      setShowOverrideModal(false);
    } catch (error: any) {
      console.error('Erro ao salvar exceção:', error);
      notification.error(error.message || 'Erro ao salvar exceção');
    }
  };

  const handleDeleteOverride = async (id: string) => {
    const confirmed = await confirm('Tem certeza que deseja remover esta exceção?');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('schedule_overrides')
        .delete()
        .eq('id', id);

      if (error) throw error;
      notification.success('Exceção removida');
      
      // Recarregar
      const start = startOfMonth(selectedMonth);
      const end = endOfMonth(selectedMonth);
      const { data } = await supabase
        .from('schedule_overrides')
        .select('*')
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      setOverrides(data as ScheduleOverride[] || []);
    } catch (error: any) {
      console.error('Erro ao deletar exceção:', error);
      notification.error('Erro ao remover exceção');
    }
  };

  const getDateOverride = (date: Date): ScheduleOverride | undefined => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return overrides.find(o => o.date === dateStr);
  };

  const getDateStatus = (date: Date) => {
    const override = getDateOverride(date);
    const dayOfWeek = getSafeDayOfWeek(date); // Usar função segura para evitar problemas de timezone
    // Domingo (0) é sempre fechado por padrão
    const isDefaultOpen = DEFAULT_OPEN_DAYS.includes(dayOfWeek);

    if (override) {
      return override.is_open ? 'open-exception' : 'closed-exception';
    }
    // Retornar 'default-closed' para domingos e outros dias não abertos
    return isDefaultOpen ? 'default-open' : 'default-closed';
  };

  // Gerar dias do mês e normalizar para meio-dia (evita problemas de timezone)
  const monthDays = eachDayOfInterval({
    start: startOfMonth(selectedMonth),
    end: endOfMonth(selectedMonth),
  }).map(normalizeToNoon); // Normalizar cada data para meio-dia antes de usar

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-border"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Exceções de Agenda</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Gerencie dias especiais (abrir domingos, fechar feriados, etc.)
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navegação de Mês */}
              <div className="flex items-center justify-between mb-6 glass-card rounded-xl p-4">
                <button
                  onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}
                  className="p-2 hover:bg-muted rounded-lg"
                >
                  ←
                </button>
                <h3 className="text-lg font-semibold capitalize">
                  {format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                </h3>
                <button
                  onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}
                  className="p-2 hover:bg-muted rounded-lg"
                >
                  →
                </button>
              </div>

              {/* Calendário */}
              <div className="grid grid-cols-7 gap-2 mb-6">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                  <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
                {monthDays.map((day) => {
                  const status = getDateStatus(day);
                  // Normalizar a data de hoje também para comparação correta
                  const today = normalizeToNoon(new Date());
                  const isToday = isSameDay(day, today);
                  
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => handleDateClick(day)}
                      className={`
                        aspect-square rounded-lg p-2 text-sm font-medium transition-all
                        ${isToday ? 'ring-2 ring-primary' : ''}
                        ${status === 'open-exception' 
                          ? 'bg-primary/20 text-primary border border-primary/50' 
                          : status === 'closed-exception'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                          : status === 'default-open'
                          ? 'bg-card border border-border hover:border-primary/50 text-foreground'
                          : 'bg-muted/50 text-muted-foreground border border-border cursor-not-allowed opacity-60'
                        }
                      `}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
              </div>

              {/* Legenda */}
              <div className="flex flex-wrap gap-4 mb-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-card border border-border rounded"></div>
                  <span className="text-muted-foreground">Aberto (padrão)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-muted/50 rounded"></div>
                  <span className="text-muted-foreground">Fechado (padrão)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-primary/20 border border-primary/50 rounded"></div>
                  <span className="text-muted-foreground">Aberto (exceção)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500/20 border border-red-500/50 rounded"></div>
                  <span className="text-muted-foreground">Fechado (exceção)</span>
                </div>
              </div>

              {/* Lista de Exceções do Mês */}
              {overrides.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground mb-3">Exceções deste mês:</h3>
                  {overrides.map((override) => (
                    <div
                      key={override.id}
                      className="glass-card rounded-xl p-4 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span className="font-semibold">
                            {format(parseISO(override.date), "EEEE, d 'de' MMMM", { locale: ptBR })}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            override.is_open
                              ? 'bg-primary/20 text-primary'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {override.is_open ? 'Aberto' : 'Fechado'}
                          </span>
                        </div>
                        {override.is_open && (
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {override.start_time} - {override.end_time}
                          </div>
                        )}
                        {override.reason && (
                          <p className="text-sm text-muted-foreground mt-1">{override.reason}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteOverride(override.id)}
                        className="p-2 hover:bg-destructive/20 text-destructive rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Criar/Editar Exceção */}
      <AnimatePresence>
        {showOverrideModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4"
            onClick={() => setShowOverrideModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-xl p-6 w-full max-w-md border border-border"
            >
              <h3 className="text-xl font-bold mb-4">
                {overrides.find(o => o.date === overrideForm.date) ? 'Editar' : 'Criar'} Exceção
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Data</label>
                  <input
                    type="date"
                    value={overrideForm.date}
                    onChange={(e) => setOverrideForm({ ...overrideForm, date: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2"
                    disabled
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overrideForm.is_open}
                      onChange={(e) => setOverrideForm({ ...overrideForm, is_open: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">
                      {overrideForm.is_open ? 'Dia Aberto' : 'Dia Fechado'}
                    </span>
                  </label>
                </div>

                {overrideForm.is_open && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">Horário Início</label>
                      <input
                        type="time"
                        value={overrideForm.start_time}
                        onChange={(e) => setOverrideForm({ ...overrideForm, start_time: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-4 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Horário Fim</label>
                      <input
                        type="time"
                        value={overrideForm.end_time}
                        onChange={(e) => setOverrideForm({ ...overrideForm, end_time: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-4 py-2"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">Motivo (opcional)</label>
                  <input
                    type="text"
                    value={overrideForm.reason}
                    onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                    placeholder="Ex: Plantão de Natal, Feriado Local..."
                    className="w-full bg-background border border-border rounded-lg px-4 py-2"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowOverrideModal(false)}
                  className="flex-1 bg-secondary text-secondary-foreground py-2 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveOverride}
                  className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg font-medium"
                >
                  Salvar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
