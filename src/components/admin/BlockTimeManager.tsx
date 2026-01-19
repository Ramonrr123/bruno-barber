import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Clock, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Exception } from '@/types/booking';
import { toast } from 'sonner';

interface BlockTimeManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Verificar se a tabela existe antes de fazer queries
async function checkTableExists(supabase: any): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('exceptions')
      .select('id')
      .limit(1);
    
    // Verificar se é erro de tabela não encontrada
    const isTableNotFound = 
      error?.code === 'PGRST116' || 
      error?.code === '42P01' || 
      error?.code === 'PGRST205' ||
      error?.message?.includes('Could not find the table') ||
      error?.message?.includes('relation "public.exceptions" does not exist');
    
    // Se não houver erro ou erro não for de tabela não encontrada, tabela existe
    return !error || !isTableNotFound;
  } catch {
    return false;
  }
}

export function BlockTimeManager({ isOpen, onClose }: BlockTimeManagerProps) {
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [exceptionForm, setExceptionForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    is_all_day: false,
    start_time: '14:00',
    end_time: '15:00',
    note: '',
  });

  // Buscar bloqueios futuros
  const fetchExceptions = async () => {
    setIsLoading(true);
    try {
      // Verificar se a tabela existe primeiro (silenciosamente)
      const tableExists = await checkTableExists(supabase);
      if (!tableExists) {
        // Tabela não existe - retornar vazio sem logar erro
        setExceptions([]);
        setIsLoading(false);
        return;
      }

      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('exceptions')
        .select('*')
        .gte('date', today)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        // Se a tabela não existe ainda, apenas mostrar aviso silenciosamente
        if (error.code === 'PGRST116' || error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          // Tabela não existe - não logar erro, apenas retornar vazio
          setExceptions([]);
          return;
        }
        throw error;
      }
      setExceptions(data as Exception[] || []);
    } catch (error: any) {
      // Verificar se é erro de tabela não encontrada
      const isTableNotFound = 
        error?.code === 'PGRST116' || 
        error?.code === '42P01' || 
        error?.code === 'PGRST205' ||
        error?.message?.includes('Could not find the table') ||
        error?.message?.includes('relation "public.exceptions" does not exist');
      
      if (!isTableNotFound) {
        console.error('Erro ao buscar bloqueios:', error);
        toast.error('Erro ao carregar bloqueios');
      }
      // Sempre retornar vazio em caso de erro
      setExceptions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchExceptions();
    }
  }, [isOpen]);

  const handleSaveException = async () => {
    if (!exceptionForm.date) {
      toast.error('Data é obrigatória');
      return;
    }

    if (!exceptionForm.is_all_day && (!exceptionForm.start_time || !exceptionForm.end_time)) {
      toast.error('Horários são obrigatórios quando não é dia inteiro');
      return;
    }

    // Validar que end_time > start_time quando não for dia inteiro
    if (!exceptionForm.is_all_day) {
      const [startHours, startMins] = exceptionForm.start_time.split(':').map(Number);
      const [endHours, endMins] = exceptionForm.end_time.split(':').map(Number);
      const startMinutes = startHours * 60 + startMins;
      const endMinutes = endHours * 60 + endMins;

      if (endMinutes <= startMinutes) {
        toast.error('Horário de término deve ser maior que o horário de início');
        return;
      }
    }

    try {
      // Verificar se a tabela existe
      const tableExists = await checkTableExists(supabase);
      if (!tableExists) {
        toast.error('Tabela exceptions não existe. Execute a migration primeiro.');
        return;
      }

      const exceptionData: any = {
        date: exceptionForm.date,
        is_all_day: exceptionForm.is_all_day,
        note: exceptionForm.note || null,
      };

      if (exceptionForm.is_all_day) {
        exceptionData.start_time = null;
        exceptionData.end_time = null;
      } else {
        exceptionData.start_time = exceptionForm.start_time;
        exceptionData.end_time = exceptionForm.end_time;
      }

      const { error } = await supabase
        .from('exceptions')
        .insert(exceptionData);

      if (error) throw error;

      toast.success('Bloqueio criado com sucesso');
      
      // Limpar formulário
      setExceptionForm({
        date: format(new Date(), 'yyyy-MM-dd'),
        is_all_day: false,
        start_time: '14:00',
        end_time: '15:00',
        note: '',
      });
      
      setShowAddModal(false);
      fetchExceptions();
    } catch (error: any) {
      console.error('Erro ao salvar bloqueio:', error);
      toast.error(error.message || 'Erro ao salvar bloqueio');
    }
  };

  const handleDeleteException = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este bloqueio? Isso liberará o horário para agendamentos.')) return;

    try {
      const { error } = await supabase
        .from('exceptions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Bloqueio removido - horário liberado!');
      fetchExceptions();
    } catch (error: any) {
      console.error('Erro ao deletar bloqueio:', error);
      toast.error('Erro ao remover bloqueio');
    }
  };

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
              className="bg-card rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-border"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Bloqueios de Horário</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Bloqueie horários específicos ou dias inteiros para evitar agendamentos
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Botão Adicionar */}
              <button
                onClick={() => setShowAddModal(true)}
                className="w-full mb-6 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Novo Bloqueio
              </button>

              {/* Lista de Bloqueios */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : exceptions.length === 0 ? (
                <div className="text-center py-12 glass-card rounded-xl">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground">Nenhum bloqueio futuro</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Clique em "Novo Bloqueio" para bloquear um horário
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {exceptions.map((exception) => (
                    <motion.div
                      key={exception.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-card rounded-xl p-4 flex items-center justify-between border border-border"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span className="font-semibold text-foreground">
                            {format(parseISO(exception.date), "EEEE, d 'de' MMMM", { locale: ptBR })}
                          </span>
                          {exception.is_all_day ? (
                            <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400 border border-red-500/50">
                              Dia Inteiro
                            </span>
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <span>{exception.start_time} - {exception.end_time}</span>
                            </div>
                          )}
                        </div>
                        {exception.note && (
                          <p className="text-sm text-muted-foreground ml-7">
                            {exception.note}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteException(exception.id)}
                        className="p-2 hover:bg-destructive/20 text-destructive rounded-lg transition-colors ml-4"
                        title="Remover bloqueio e liberar horário"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Adicionar Bloqueio */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-xl p-6 w-full max-w-md border border-border"
            >
              <h3 className="text-xl font-bold mb-4">Novo Bloqueio</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Data</label>
                  <input
                    type="date"
                    value={exceptionForm.date}
                    onChange={(e) => setExceptionForm({ ...exceptionForm, date: e.target.value })}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exceptionForm.is_all_day}
                      onChange={(e) => setExceptionForm({ ...exceptionForm, is_all_day: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">Dia Inteiro</span>
                  </label>
                </div>

                {!exceptionForm.is_all_day && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">Horário Início</label>
                      <input
                        type="time"
                        value={exceptionForm.start_time}
                        onChange={(e) => setExceptionForm({ ...exceptionForm, start_time: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Horário Fim</label>
                      <input
                        type="time"
                        value={exceptionForm.end_time}
                        onChange={(e) => setExceptionForm({ ...exceptionForm, end_time: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">Observação (Opcional)</label>
                  <input
                    type="text"
                    value={exceptionForm.note}
                    onChange={(e) => setExceptionForm({ ...exceptionForm, note: e.target.value })}
                    placeholder="Ex: Médico, Consulta, etc..."
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-secondary text-secondary-foreground py-2 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveException}
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
