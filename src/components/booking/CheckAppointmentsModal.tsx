import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, Loader2, Calendar, Clock, Scissors, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Appointment } from '@/types/booking';
import { format, parseISO, isAfter, startOfToday } from 'date-fns';
import { BARBER_NAME } from '@/data/constants';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { sendTelegramNotification } from '@/lib/telegram';

interface CheckAppointmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CheckAppointmentsModal({ isOpen, onClose }: CheckAppointmentsModalProps) {
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Sanitizar telefone (remover espaços, traços, parênteses)
  const sanitizePhone = (phoneNumber: string): string => {
    return phoneNumber.replace(/\D/g, '');
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone.trim()) {
      toast.error('Digite seu número de WhatsApp');
      return;
    }

    setIsLoading(true);
    setHasSearched(false);
    setAppointments([]);

    try {
      const cleanPhone = sanitizePhone(phone);
      
      if (cleanPhone.length < 10) {
        toast.error('Número de telefone inválido');
        setIsLoading(false);
        return;
      }

      // Buscar agendamentos futuros com status 'confirmed' ou 'scheduled'
      const today = format(startOfToday(), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('client_phone', cleanPhone)
        .in('status', ['confirmed', 'scheduled'])
        .gte('appointment_date', today)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      setAppointments((data as Appointment[]) || []);
      setHasSearched(true);

      if (!data || data.length === 0) {
        toast.info('Nenhum agendamento futuro encontrado');
      }
    } catch (error) {
      console.error('Error searching appointments:', error);
      toast.error('Erro ao buscar agendamentos. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPhone('');
    setAppointments([]);
    setHasSearched(false);
    onClose();
  };

  const handleCancelAppointment = async (appointmentId: string, appointmentDate: string, appointmentTime: string) => {
    if (!confirm('Tem certeza que deseja cancelar este agendamento? O horário ficará disponível para outros clientes.')) return;

    try {
      // Verificar se o horário já passou
      const appointmentDateTime = parseISO(`${appointmentDate}T${appointmentTime}`);
      const now = new Date();
      const isBeforeAppointment = now < appointmentDateTime;

      if (!isBeforeAppointment) {
        toast.error('Não é possível cancelar um agendamento que já passou.');
        return;
      }

      // Buscar dados do agendamento antes de cancelar (para enviar notificação)
      const { data: appointmentData, error: fetchError } = await supabase
        .from('appointments')
        .select('client_name, client_phone, service_type')
        .eq('id', appointmentId)
        .single();

      if (fetchError) {
        console.error('Erro ao buscar dados do agendamento:', fetchError);
      }

      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);

      if (error) throw error;

      // Enviar notificação do Telegram (fire-and-forget, não bloqueia a resposta)
      if (appointmentData) {
        const formattedDate = format(parseISO(appointmentDate), 'dd/MM', { locale: ptBR });
        const formattedDateTime = `${formattedDate} às ${appointmentTime.slice(0, 5)}`;
        
        sendTelegramNotification({
          type: 'CANCELED',
          clientName: appointmentData.client_name,
          phone: appointmentData.client_phone,
          serviceName: appointmentData.service_type,
          date: formattedDateTime,
        }).catch((error) => {
          console.error('Erro ao enviar notificação do Telegram:', error);
          // Não mostra erro para o usuário, pois a operação principal já foi bem-sucedida
        });
      }

      toast.success('Agendamento cancelado! O horário está disponível novamente.');
      
      // Recarregar a lista
      const cleanPhone = sanitizePhone(phone);
      const today = format(startOfToday(), 'yyyy-MM-dd');
      
      const { data, error: refreshError } = await supabase
        .from('appointments')
        .select('*')
        .eq('client_phone', cleanPhone)
        .in('status', ['confirmed', 'scheduled'])
        .gte('appointment_date', today)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (!refreshError) {
        setAppointments((data as Appointment[]) || []);
      }

      // O horário agora está disponível automaticamente (não aparece mais nas buscas de disponibilidade)
      console.log(`✅ Horário liberado: ${appointmentDate} às ${appointmentTime} está disponível novamente`);
      
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('Erro ao cancelar agendamento. Tente novamente.');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card rounded-xl p-6 w-full max-w-md border border-border"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">
              Meus agendamentos
            </h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                WhatsApp
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-background border border-border rounded-lg px-4 py-3 pl-11 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Digite o número usado no agendamento
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Buscando...
                </>
              ) : (
                'Buscar Meus Agendamentos'
              )}
            </button>
          </form>

          {/* Results */}
          {hasSearched && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {appointments.length === 0 ? (
                <div className="text-center py-8 glass-card rounded-xl">
                  <p className="text-muted-foreground">
                    Nenhum agendamento futuro encontrado para este número
                  </p>
                </div>
              ) : (
                appointments.map((apt) => {
                  const appointmentDateTime = parseISO(`${apt.appointment_date}T${apt.start_time}`);
                  const isFuture = isAfter(appointmentDateTime, new Date());
                  const canCancel = isFuture && (apt.status === 'confirmed' || apt.status === 'scheduled');
                  
                  return (
                    <motion.div
                      key={apt.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-card rounded-xl p-4 border border-border"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex-shrink-0">
                          <Scissors className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground mb-2">
                            {apt.service_type}
                          </h3>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {format(parseISO(apt.appointment_date), "EEEE, d 'de' MMMM", { locale: ptBR })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>
                                {apt.start_time.slice(0, 5)} - {apt.end_time.slice(0, 5)} • Profissional: {BARBER_NAME}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {canCancel && (
                        <div className="pt-3 border-t border-border">
                          <button
                            onClick={() => handleCancelAppointment(apt.id, apt.appointment_date, apt.start_time)}
                            className="w-full bg-destructive/20 text-destructive py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-destructive/30 transition-colors font-medium text-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                            Cancelar Agendamento
                          </button>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
