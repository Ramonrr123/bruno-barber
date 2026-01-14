import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  User, 
  Phone, 
  Check, 
  Trash2,
  Ban,
  Loader2,
  Plus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Appointment } from '@/types/booking';
import { toast } from 'sonner';

export default function Admin() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockTime, setBlockTime] = useState('09:00');
  const [blockDuration, setBlockDuration] = useState(60);

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('appointment_date', dateStr)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setAppointments((data as Appointment[]) || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Erro ao carregar agenda');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate]);

  const handleComplete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', id);

      if (error) throw error;
      toast.success('Marcado como concluído');
      fetchAppointments();
    } catch (error) {
      console.error('Error completing appointment:', error);
      toast.error('Erro ao atualizar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este agendamento?')) return;
    
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Agendamento excluído');
      fetchAppointments();
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast.error('Erro ao excluir');
    }
  };

  const handleBlockTime = async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const [hours, mins] = blockTime.split(':').map(Number);
      const totalMinutes = hours * 60 + mins + blockDuration;
      const endHours = Math.floor(totalMinutes / 60);
      const endMins = totalMinutes % 60;
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

      const { error } = await supabase
        .from('appointments')
        .insert({
          client_name: 'BLOQUEADO',
          client_phone: '0000000000',
          service_type: 'Horário Bloqueado',
          appointment_date: dateStr,
          start_time: blockTime,
          end_time: endTime,
          status: 'blocked',
        });

      if (error) throw error;
      toast.success('Horário bloqueado');
      setShowBlockModal(false);
      fetchAppointments();
    } catch (error) {
      console.error('Error blocking time:', error);
      toast.error('Erro ao bloquear horário');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'blocked': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'cancelled': return 'bg-muted text-muted-foreground border-muted';
      default: return 'bg-primary/20 text-primary border-primary/30';
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐸</span>
            <h1 className="text-xl font-bold text-foreground">Admin</h1>
          </div>
          <a 
            href="/" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Ver agendamento
          </a>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-between glass-card rounded-xl p-4 mb-6">
          <button 
            onClick={() => setSelectedDate(subDays(selectedDate, 1))}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground capitalize">
              {format(selectedDate, "EEEE", { locale: ptBR })}
            </p>
            <p className="text-muted-foreground">
              {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          
          <button 
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setShowBlockModal(true)}
            className="flex-1 bg-secondary text-secondary-foreground font-medium py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors"
          >
            <Ban className="w-4 h-4" />
            Bloquear Horário
          </button>
          <button
            onClick={fetchAppointments}
            className="bg-card border border-border px-4 rounded-xl hover:border-primary/50 transition-colors"
          >
            Atualizar
          </button>
        </div>

        {/* Appointments List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-12 glass-card rounded-xl">
              <p className="text-muted-foreground">Nenhum agendamento para esta data</p>
            </div>
          ) : (
            <AnimatePresence>
              {appointments.map((apt, index) => (
                <motion.div
                  key={apt.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className={`glass-card rounded-xl p-4 border ${
                    apt.status === 'completed' ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center text-primary font-bold">
                        <Clock className="w-4 h-4 mb-1" />
                        <span className="text-sm">{apt.start_time.slice(0, 5)}</span>
                        <span className="text-xs text-muted-foreground">
                          {apt.end_time.slice(0, 5)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {apt.service_type}
                        </h3>
                        {apt.status !== 'blocked' && (
                          <>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <User className="w-3 h-3" />
                              {apt.client_name}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              {apt.client_phone}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(apt.status)}`}>
                      {apt.status === 'scheduled' && 'Agendado'}
                      {apt.status === 'completed' && 'Concluído'}
                      {apt.status === 'blocked' && 'Bloqueado'}
                      {apt.status === 'cancelled' && 'Cancelado'}
                    </span>
                  </div>

                  {apt.status === 'scheduled' && (
                    <div className="flex gap-2 pt-3 border-t border-border">
                      <button
                        onClick={() => handleComplete(apt.id)}
                        className="flex-1 bg-emerald-500/20 text-emerald-400 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-emerald-500/30 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        Concluir
                      </button>
                      <button
                        onClick={() => handleDelete(apt.id)}
                        className="bg-destructive/20 text-destructive px-4 py-2 rounded-lg flex items-center justify-center hover:bg-destructive/30 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {apt.status === 'blocked' && (
                    <div className="pt-3 border-t border-border">
                      <button
                        onClick={() => handleDelete(apt.id)}
                        className="w-full bg-destructive/20 text-destructive py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-destructive/30 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Desbloquear
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Block Time Modal */}
        <AnimatePresence>
          {showBlockModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
              onClick={() => setShowBlockModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-card rounded-xl p-6 w-full max-w-sm"
              >
                <h2 className="text-lg font-bold text-foreground mb-4">
                  Bloquear Horário
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">
                      Horário de início
                    </label>
                    <input
                      type="time"
                      value={blockTime}
                      onChange={(e) => setBlockTime(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">
                      Duração (minutos)
                    </label>
                    <select
                      value={blockDuration}
                      onChange={(e) => setBlockDuration(Number(e.target.value))}
                      className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground"
                    >
                      <option value={30}>30 min</option>
                      <option value={60}>1 hora</option>
                      <option value={120}>2 horas</option>
                      <option value={240}>4 horas</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowBlockModal(false)}
                    className="flex-1 bg-secondary text-secondary-foreground py-3 rounded-xl font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleBlockTime}
                    className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-medium"
                  >
                    Bloquear
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
