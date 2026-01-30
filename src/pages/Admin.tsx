import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays, subDays, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Clock, 
  User, 
  Phone, 
  Check, 
  X,
  Loader2,
  Plus,
  LogOut,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Ban,
  Scissors
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Appointment, Service } from '@/types/booking';
import { notification } from '@/hooks/useNotification';
import { showConfirm as confirm } from '@/hooks/useConfirm';
import { BlockTimeManager } from '@/components/admin/BlockTimeManager';
import { ServicesManager } from '@/components/admin/ServicesManager';
import { DashboardStats } from '@/components/admin/DashboardStats';
import { sendTelegramNotification, getWhatsAppReminderLink } from '@/lib/telegram';

export default function Admin() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showManualBookingModal, setShowManualBookingModal] = useState(false);
  const [manualBooking, setManualBooking] = useState({
    clientName: '',
    clientPhone: '',
    serviceType: '',
    appointmentDate: '',
    startTime: '09:00',
    duration: 30,
  });
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [showBlockTimeManager, setShowBlockTimeManager] = useState(false);
  const [showServicesManager, setShowServicesManager] = useState(false);
  const [services, setServices] = useState<Service[]>([]);

  // Verificar autenticação
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate('/login', { replace: true });
          return;
        }
        setCheckingAuth(false);
      } catch (error) {
        console.error('Error checking auth:', error);
        navigate('/login', { replace: true });
      }
    };

    checkAuth();

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/login', { replace: true });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Buscar agendamentos da data selecionada
  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const now = new Date();
      const isToday = dateStr === format(now, 'yyyy-MM-dd');
      
      // Buscando agendamentos para a data
      
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('appointment_date', dateStr)
        .in('status', ['scheduled', 'confirmed', 'blocked'])
        .order('start_time', { ascending: true });

      if (error) throw error;
      
      // Filtrar apenas agendamentos ativos (não mostrar completed, cancelled, no_show)
      const filteredData = (data as Appointment[]).filter((apt) => {
        // Não mostrar agendamentos finalizados
        if (apt.status === 'completed' || apt.status === 'cancelled' || apt.status === 'no_show') {
          return false;
        }
        return true;
      });
      
      // Agendamentos encontrados
      setAppointments(filteredData);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      notification.error('Erro ao carregar agenda');
    } finally {
      setIsLoading(false);
    }
  };

  // Buscar serviços do banco
  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, duration, price, description, icon, image_url')
        .order('name', { ascending: true });

      if (error) throw error;
      
      const formattedServices: Service[] = (data || []).map((service) => ({
        id: service.id,
        name: service.name,
        duration: service.duration,
        price: typeof service.price === 'number' ? service.price : parseFloat(String(service.price)),
        description: service.description || '',
        icon: service.icon || 'scissors',
        image_url: service.image_url || null,
      }));
      
      setServices(formattedServices);
    } catch (error) {
      console.error('Error fetching services:', error);
      // Fallback: manter array vazio se houver erro
      setServices([]);
    }
  };

  useEffect(() => {
    if (!checkingAuth) {
      fetchAppointments();
      fetchServices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkingAuth, selectedDate]);

  // Atualizar automaticamente quando houver mudanças na tabela (Supabase Realtime)
  useEffect(() => {
    if (checkingAuth) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    const channel = supabase
      .channel(`appointments-changes-${dateStr}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `appointment_date=eq.${dateStr}`,
        },
        (payload) => {
          // Mudança detectada na tabela appointments
          // Recarregar agendamentos quando houver qualquer mudança
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkingAuth, selectedDate]);

  // Logout
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login', { replace: true });
      notification.success('Logout realizado com sucesso');
    } catch (error) {
      console.error('Error logging out:', error);
      notification.error('Erro ao fazer logout');
    }
  };

  // Concluir agendamento
  const handleComplete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', id);

      if (error) throw error;
      notification.success('Marcado como concluído');
      fetchAppointments();
    } catch (error) {
      console.error('Error completing appointment:', error);
      notification.error('Erro ao atualizar');
    }
  };

  // Cancelar agendamento
  const handleCancel = async (id: string) => {
    const confirmed = await confirm('Tem certeza que deseja cancelar este agendamento?');
    if (!confirmed) return;
    
    try {
      // Buscar dados do agendamento antes de cancelar (para enviar notificação)
      const { data: appointmentData, error: fetchError } = await supabase
        .from('appointments')
        .select('client_name, client_phone, service_type, appointment_date, start_time')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Erro ao buscar dados do agendamento:', fetchError);
      }

      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;

      // Enviar notificação do Telegram (fire-and-forget, não bloqueia a resposta)
      if (appointmentData) {
        const formattedDate = format(parseISO(appointmentData.appointment_date), 'dd/MM', { locale: ptBR });
        const formattedDateTime = `${formattedDate} às ${appointmentData.start_time.slice(0, 5)}`;
        
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

      notification.success('Agendamento cancelado');
      fetchAppointments();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      notification.error('Erro ao cancelar');
    }
  };

  // Lembrete rápido: abre WhatsApp com o cliente e a mensagem de confirmação já preenchida
  const handleQuickReminder = (apt: Appointment) => {
    if (!apt.client_phone?.trim()) {
      notification.error('Telefone do cliente não informado');
      return;
    }
    const dateFormatted = `${format(parseISO(apt.appointment_date), 'dd/MM', { locale: ptBR })} às ${apt.start_time.slice(0, 5)}`;
    const link = getWhatsAppReminderLink(
      apt.client_phone,
      apt.client_name || 'Cliente',
      apt.service_type,
      dateFormatted
    );
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  // Verificar se agendamento está atrasado
  const isAppointmentOverdue = (apt: Appointment): boolean => {
    const today = format(selectedDate, 'yyyy-MM-dd');
    const isToday = today === format(new Date(), 'yyyy-MM-dd');
    
    if (!isToday) return false;
    if (apt.status !== 'confirmed' && apt.status !== 'scheduled') return false;
    
    const now = new Date();
    const appointmentTime = new Date(`${apt.appointment_date}T${apt.start_time}`);
    
    return now > appointmentTime;
  };

  // Verificar se agendamento já foi concluído automaticamente (passou do horário de término)
  const isAppointmentAutoCompleted = (apt: Appointment): boolean => {
    // Apenas verificar para agendamentos com status 'scheduled' ou 'confirmed'
    if (apt.status !== 'scheduled' && apt.status !== 'confirmed') {
      return false;
    }
    
    // Criar data/hora do término do agendamento
    const appointmentEndDateTime = new Date(`${apt.appointment_date}T${apt.end_time}`);
    const now = new Date();
    
    // Se o horário de término já passou, considerar auto-concluído
    return now > appointmentEndDateTime;
  };

  // Verificar conflitos de horário
  const checkTimeConflict = async (date: string, startTime: string, duration: number) => {
    try {
      const [hours, mins] = startTime.split(':').map(Number);
      const totalMinutes = hours * 60 + mins + duration;
      const endHours = Math.floor(totalMinutes / 60);
      const endMins = totalMinutes % 60;
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('appointment_date', date)
        .in('status', ['scheduled', 'confirmed', 'blocked']);

      if (error) throw error;

      const conflicts = (data as Appointment[]).filter(apt => {
        const aptStart = apt.start_time;
        const aptEnd = apt.end_time;
        
        // Verifica se há sobreposição de horários
        return (
          (startTime >= aptStart && startTime < aptEnd) ||
          (endTime > aptStart && endTime <= aptEnd) ||
          (startTime <= aptStart && endTime >= aptEnd)
        );
      });

      if (conflicts.length > 0) {
        const conflictNames = conflicts.map(c => 
          `${c.start_time.slice(0, 5)} - ${c.client_name || 'Bloqueado'}`
        ).join(', ');
        setConflictWarning(`⚠️ Conflito detectado: ${conflictNames}. Você pode prosseguir mesmo assim.`);
        return true;
      } else {
        setConflictWarning(null);
        return false;
      }
    } catch (error) {
      console.error('Error checking conflict:', error);
      return false;
    }
  };

  // Salvar encaixe manual
  const handleManualBooking = async () => {
    if (!manualBooking.clientName || !manualBooking.clientPhone || !manualBooking.serviceType) {
      notification.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const [hours, mins] = manualBooking.startTime.split(':').map(Number);
      const totalMinutes = hours * 60 + mins + manualBooking.duration;
      const endHours = Math.floor(totalMinutes / 60);
      const endMins = totalMinutes % 60;
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

      const { error } = await supabase
        .from('appointments')
        .insert({
          client_name: manualBooking.clientName,
          client_phone: manualBooking.clientPhone,
          service_type: manualBooking.serviceType,
          appointment_date: manualBooking.appointmentDate,
          start_time: manualBooking.startTime,
          end_time: endTime,
          status: 'confirmed',
        });

      if (error) throw error;
      
      notification.success('Encaixe criado com sucesso!');
      setShowManualBookingModal(false);
      setManualBooking({
        clientName: '',
        clientPhone: '',
        serviceType: '',
        appointmentDate: format(selectedDate, 'yyyy-MM-dd'),
        startTime: '09:00',
        duration: 30,
      });
      setConflictWarning(null);
      fetchAppointments();
    } catch (error: any) {
      console.error('Error creating manual booking:', error);
      notification.error(error.message || 'Erro ao criar encaixe');
    }
  };

  // Verificar conflito quando mudar horário/data
  useEffect(() => {
    if (showManualBookingModal && manualBooking.appointmentDate && manualBooking.startTime && manualBooking.duration) {
      checkTimeConflict(manualBooking.appointmentDate, manualBooking.startTime, manualBooking.duration);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualBooking.appointmentDate, manualBooking.startTime, manualBooking.duration, showManualBookingModal]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'blocked': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'cancelled': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'no_show': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-primary/20 text-primary border-primary/30';
    }
  };


  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-24 relative">
      {/* Logo do sapo no fundo - discreto para não competir com o conteúdo (UX) */}
      <div
        className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none"
        aria-hidden
      >
        <div
          className="w-[min(70vw,320px)] h-[min(70vw,320px)] max-w-[320px] max-h-[320px] rounded-full"
          style={{
            backgroundImage: `url(${import.meta.env.BASE_URL}logo.png)`,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: 0.38,
            filter: 'blur(3px)',
            transform: 'scale(2.2)',
          }}
        />
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header Mobile-First */}
        <div className="mb-6 space-y-3">
          {/* Barra Superior - Logo e Sair */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base">🐸</span>
              <h1 className="text-lg sm:text-xl font-bold text-foreground">Agenda</h1>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto sm:px-3 sm:py-2 bg-secondary/50 text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors sm:gap-2 border border-border"
              aria-label="Sair"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline text-sm font-medium">Sair</span>
            </button>
          </div>
          
          {/* Grid de Configurações - Mobile-First */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {/* Botão de Serviços */}
            <button
              onClick={() => setShowServicesManager(true)}
              className="flex flex-col items-center justify-center gap-1.5 sm:flex-row sm:gap-2 px-3 py-3 sm:py-2.5 bg-primary/10 text-primary border border-primary/20 rounded-xl hover:bg-primary/20 active:scale-95 transition-all font-medium text-xs sm:text-sm min-h-[64px] sm:min-h-0"
              aria-label="Gerenciar Serviços"
              title="Gerenciar serviços oferecidos"
            >
              <Scissors className="w-5 h-5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-center">Serviços</span>
            </button>
            
            {/* Botão de Bloqueios de Horário - Destaque */}
            <button
              onClick={() => setShowBlockTimeManager(true)}
              className="flex flex-col items-center justify-center gap-1.5 sm:flex-row sm:gap-2 px-3 py-3 sm:py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 active:scale-95 transition-all font-medium text-xs sm:text-sm shadow-md shadow-primary/20 min-h-[64px] sm:min-h-0"
              aria-label="Bloqueios de Horário"
              title="Bloquear horários ou dias inteiros"
            >
              <Ban className="w-5 h-5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-center">Bloquear</span>
            </button>
          </div>
        </div>

        {/* Dashboard Financeiro (Mês Atual) */}
        <DashboardStats />

        {/* Navegação de Datas */}
        <div className="flex items-center justify-between glass-card rounded-xl p-4 mb-6">
          <button 
            onClick={() => setSelectedDate(subDays(selectedDate, 1))}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Dia anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="text-center flex-1">
            <button
              onClick={() => setSelectedDate(new Date())}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                isToday(selectedDate) 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {isToday(selectedDate) ? 'Hoje' : 'Ir para Hoje'}
            </button>
            <p className="text-lg font-semibold text-foreground capitalize mt-2">
              {format(selectedDate, "EEEE", { locale: ptBR })}
            </p>
            <p className="text-muted-foreground">
              {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          
          <button 
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Próximo dia"
          >
            <ChevronRight className="w-5 h-5" />
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
              {appointments.map((apt, index) => {
                const isOverdue = isAppointmentOverdue(apt);
                return (
                <motion.div
                  key={apt.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className={`glass-card rounded-xl p-4 border ${
                    isOverdue 
                      ? 'border-yellow-500/50 bg-yellow-500/5' 
                      : 'border-border'
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
                        <h3 className="font-semibold text-foreground text-base">
                          {apt.service_type}
                        </h3>
                        {apt.status !== 'blocked' && (
                          <>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                              <User className="w-3 h-3" />
                              {apt.client_name}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              <span>{apt.client_phone}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      {isOverdue && (
                        <span className="px-2 py-1 text-xs rounded-full border border-yellow-500/50 bg-yellow-500/20 text-yellow-400">
                          Atrasado / Pendente
                        </span>
                      )}
                      <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(apt.status)}`}>
                        {apt.status === 'scheduled' && 'Agendado'}
                        {apt.status === 'confirmed' && 'Confirmado'}
                        {apt.status === 'completed' && 'Concluído'}
                        {apt.status === 'blocked' && 'Bloqueado'}
                        {apt.status === 'cancelled' && 'Cancelado pelo Cliente'}
                        {apt.status === 'no_show' && 'Não Compareceu'}
                      </span>
                    </div>
                  </div>

                  {(apt.status === 'scheduled' || apt.status === 'confirmed') && (
                    <div className="pt-3 border-t border-border">
                      {(() => {
                        const isAutoCompleted = isAppointmentAutoCompleted(apt);
                        
                        if (isAutoCompleted) {
                          // Agendamento passado - Auto-concluído visualmente
                          return (
                            <div className="space-y-2">
                              {/* Badge de Auto-Conclusão */}
                              <div className="flex items-center justify-center gap-2 py-2">
                                <span className="px-3 py-1.5 text-sm rounded-full border border-emerald-500/50 bg-emerald-500/20 text-emerald-400 font-medium flex items-center gap-2">
                                  <Check className="w-4 h-4" />
                                  Concluído (Auto)
                                </span>
                              </div>
                              
                              {/* Botões de correção - Lembrete rápido e Cancelar */}
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleQuickReminder(apt)}
                                  className="flex-1 bg-primary/20 text-primary py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-primary/30 transition-colors font-medium text-sm"
                                  title="Abrir WhatsApp com lembrete já preenchido"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                  Lembrete rápido
                                </button>
                                <button
                                  onClick={() => handleCancel(apt.id)}
                                  className="flex-1 bg-destructive/20 text-destructive py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-destructive/30 transition-colors font-medium text-sm"
                                >
                                  <X className="w-4 h-4" />
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          );
                        } else {
                          // Agendamento futuro - Botões normais
                          return (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleComplete(apt.id)}
                                className="flex-1 bg-emerald-500/20 text-emerald-400 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-emerald-500/30 transition-colors font-medium"
                              >
                                <Check className="w-4 h-4" />
                                Concluir
                              </button>
                              <button
                                onClick={() => handleQuickReminder(apt)}
                                className="bg-primary/20 text-primary py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-primary/30 transition-colors font-medium text-sm"
                                title="Abrir WhatsApp com lembrete já preenchido"
                              >
                                <MessageCircle className="w-4 h-4" />
                                Lembrete rápido
                              </button>
                              <button
                                onClick={() => handleCancel(apt.id)}
                                className="flex-1 bg-destructive/20 text-destructive py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-destructive/30 transition-colors font-medium"
                              >
                                <X className="w-4 h-4" />
                                Cancelar
                              </button>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  )}
                </motion.div>
              )})}
            </AnimatePresence>
          )}
        </div>

        {/* FAB Button - Encaixe Manual */}
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setManualBooking({
              ...manualBooking,
              appointmentDate: format(selectedDate, 'yyyy-MM-dd'),
            });
            setShowManualBookingModal(true);
          }}
          className="fixed bottom-6 right-6 w-16 h-16 bg-primary text-primary-foreground rounded-full shadow-lg neon-glow flex items-center justify-center z-40 hover:opacity-90 transition-opacity"
        >
          <Plus className="w-8 h-8" />
        </motion.button>

        {/* Modal Encaixe Manual */}
        <AnimatePresence>
          {showManualBookingModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
              onClick={() => {
                setShowManualBookingModal(false);
                setConflictWarning(null);
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-card rounded-xl p-6 w-full max-w-md border border-border"
              >
                <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
                  Encaixe Manual
                </h2>
                
                {conflictWarning && (
                  <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-400">{conflictWarning}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-base font-medium text-foreground mb-2">
                      Nome do Cliente
                    </label>
                    <input
                      type="text"
                      value={manualBooking.clientName}
                      onChange={(e) => setManualBooking({ ...manualBooking, clientName: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Nome completo"
                    />
                  </div>

                  <div>
                    <label className="block text-base font-medium text-foreground mb-2">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      value={manualBooking.clientPhone}
                      onChange={(e) => setManualBooking({ ...manualBooking, clientPhone: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  <div>
                    <label className="block text-base font-medium text-foreground mb-2">
                      Serviço
                    </label>
                    <select
                      value={manualBooking.serviceType}
                      onChange={(e) => {
                        const service = services.find(s => s.name === e.target.value);
                        setManualBooking({ 
                          ...manualBooking, 
                          serviceType: e.target.value,
                          duration: service?.duration || 30
                        });
                      }}
                      className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">Selecione um serviço</option>
                      {services.map((service) => (
                        <option key={service.id} value={service.name}>
                          {service.name} ({service.duration} min)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-base font-medium text-foreground mb-2">
                      Data
                    </label>
                    <input
                      type="date"
                      value={manualBooking.appointmentDate}
                      onChange={(e) => setManualBooking({ ...manualBooking, appointmentDate: e.target.value })}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-base font-medium text-foreground mb-2">
                      Horário
                    </label>
                    <input
                      type="time"
                      value={manualBooking.startTime}
                      onChange={(e) => setManualBooking({ ...manualBooking, startTime: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowManualBookingModal(false);
                      setConflictWarning(null);
                    }}
                    className="flex-1 bg-secondary text-secondary-foreground py-4 rounded-xl font-semibold text-base hover:bg-secondary/80 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleManualBooking}
                    className="flex-1 bg-primary text-primary-foreground py-4 rounded-xl font-semibold text-base hover:opacity-90 transition-opacity"
                  >
                    Salvar Encaixe
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Gerenciador de Bloqueios de Horário */}
        <BlockTimeManager
          isOpen={showBlockTimeManager}
          onClose={() => setShowBlockTimeManager(false)}
        />

        {/* Gerenciador de Serviços */}
        <ServicesManager
          isOpen={showServicesManager}
          onClose={() => setShowServicesManager(false)}
        />
      </div>
    </div>
  );
}
