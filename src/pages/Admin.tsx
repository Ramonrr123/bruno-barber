import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays, subDays, isToday, parseISO, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
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
  Scissors,
  Calendar,
  Lock,
  Pencil
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Appointment, Service } from '@/types/booking';
import { notification } from '@/hooks/useNotification';
import { showConfirm as confirm } from '@/hooks/useConfirm';
import { BlockTimeManager } from '@/components/admin/BlockTimeManager';
import { ServicesManager } from '@/components/admin/ServicesManager';
import { AdminSummaryCards } from '@/components/admin/AdminSummaryCards';
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
  const [userDisplayName, setUserDisplayName] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [editForm, setEditForm] = useState({
    clientName: '',
    clientPhone: '',
    serviceType: '',
    appointmentDate: '',
    startTime: '09:00',
    duration: 30,
  });
  const [editConflictWarning, setEditConflictWarning] = useState<string | null>(null);

  // Verificar autenticação
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate('/login', { replace: true });
          return;
        }
        const name =
          (session.user?.user_metadata?.full_name as string) ||
          (session.user?.email?.split('@')[0] ?? '');
        setUserDisplayName(name || '');
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

  // Verificar conflitos ao editar (exclui o próprio agendamento)
  const checkEditConflict = async (
    date: string,
    startTime: string,
    duration: number,
    excludeAppointmentId: string
  ) => {
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
        if (apt.id === excludeAppointmentId) return false;
        const aptStart = apt.start_time;
        const aptEnd = apt.end_time;
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
        setEditConflictWarning(`⚠️ Conflito: ${conflictNames}. Você pode prosseguir mesmo assim.`);
        return true;
      } else {
        setEditConflictWarning(null);
        return false;
      }
    } catch (error) {
      console.error('Error checking edit conflict:', error);
      return false;
    }
  };

  const handleOpenEdit = (apt: Appointment) => {
    const service = services.find(s => s.name === apt.service_type);
    const duration = service?.duration ?? 30;
    setEditingAppointment(apt);
    setEditForm({
      clientName: apt.client_name ?? '',
      clientPhone: apt.client_phone ?? '',
      serviceType: apt.service_type ?? '',
      appointmentDate: apt.appointment_date ?? '',
      startTime: apt.start_time?.slice(0, 5) ?? '09:00',
      duration,
    });
    setEditConflictWarning(null);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingAppointment) return;
    if (!editForm.clientName?.trim() || !editForm.clientPhone?.trim() || !editForm.serviceType) {
      notification.error('Preencha nome, telefone e serviço');
      return;
    }

    try {
      const [hours, mins] = editForm.startTime.split(':').map(Number);
      const totalMinutes = hours * 60 + mins + editForm.duration;
      const endHours = Math.floor(totalMinutes / 60);
      const endMins = totalMinutes % 60;
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

      const { error } = await supabase
        .from('appointments')
        .update({
          client_name: editForm.clientName.trim(),
          client_phone: editForm.clientPhone.trim(),
          service_type: editForm.serviceType,
          appointment_date: editForm.appointmentDate,
          start_time: editForm.startTime,
          end_time: endTime,
        })
        .eq('id', editingAppointment.id);

      if (error) throw error;

      notification.success('Agendamento atualizado');
      setShowEditModal(false);
      setEditingAppointment(null);
      setEditConflictWarning(null);
      fetchAppointments();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar';
      notification.error(message);
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

  // Verificar conflito quando mudar horário/data (encaixe manual)
  useEffect(() => {
    if (showManualBookingModal && manualBooking.appointmentDate && manualBooking.startTime && manualBooking.duration) {
      checkTimeConflict(manualBooking.appointmentDate, manualBooking.startTime, manualBooking.duration);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualBooking.appointmentDate, manualBooking.startTime, manualBooking.duration, showManualBookingModal]);

  // Verificar conflito ao editar agendamento
  useEffect(() => {
    if (
      showEditModal &&
      editingAppointment &&
      editForm.appointmentDate &&
      editForm.startTime &&
      editForm.duration
    ) {
      checkEditConflict(
        editForm.appointmentDate,
        editForm.startTime,
        editForm.duration,
        editingAppointment.id
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEditModal, editingAppointment?.id, editForm.appointmentDate, editForm.startTime, editForm.duration]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'blocked': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'cancelled': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'no_show': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-primary/20 text-primary border-primary/30';
    }
  };

  // Função para obter a hora cheia de um horário (ex: "09:30" -> "09:00")
  const getHourSlot = (startTime: string): string => {
    const [hours] = startTime.split(':').map(Number);
    return `${hours.toString().padStart(2, '0')}:00`;
  };

  // Função para formatar o label do horário (ex: "09:00" -> "09h")
  const formatHourLabel = (hourSlot: string): string => {
    const [hours] = hourSlot.split(':').map(Number);
    return `${hours}h`;
  };

  // Função para agrupar agendamentos por horário
  const groupAppointmentsByHour = (appointments: Appointment[]) => {
    const grouped: Record<string, Appointment[]> = {};

    appointments.forEach((apt) => {
      const hourSlot = getHourSlot(apt.start_time);
      if (!grouped[hourSlot]) {
        grouped[hourSlot] = [];
      }
      grouped[hourSlot].push(apt);
    });

    // Ordenar agendamentos dentro de cada horário por horário de início
    Object.keys(grouped).forEach((hourSlot) => {
      grouped[hourSlot].sort((a, b) => 
        a.start_time.localeCompare(b.start_time)
      );
    });

    // Retornar ordenado por horário
    return Object.keys(grouped)
      .sort((a, b) => a.localeCompare(b))
      .reduce((acc, hourSlot) => {
        acc[hourSlot] = grouped[hourSlot];
        return acc;
      }, {} as Record<string, Appointment[]>);
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
        {/* Header - Saudação e ações */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              Olá, Danilo
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Você está em sua agenda.</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowServicesManager(true)}
              className="p-3 rounded-lg bg-muted/80 hover:bg-muted border border-border transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Serviços"
              title="Serviços"
            >
              <Scissors className="w-6 h-6 text-foreground" />
            </button>
            <button
              onClick={() => setShowBlockTimeManager(true)}
              className="p-3 rounded-lg bg-muted/80 hover:bg-muted border border-border transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Bloquear horários"
              title="Bloquear horários"
            >
              <Lock className="w-6 h-6 text-foreground" />
            </button>
            <button
              onClick={() => {
                setManualBooking({
                  ...manualBooking,
                  appointmentDate: format(selectedDate, 'yyyy-MM-dd'),
                });
                setShowManualBookingModal(true);
              }}
              className="p-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Novo agendamento"
              title="Novo agendamento"
            >
              <Plus className="w-6 h-6" />
            </button>
            <button
              onClick={handleLogout}
              className="p-3 rounded-lg bg-muted/80 hover:bg-muted border border-border transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Sair"
              title="Sair"
            >
              <LogOut className="w-6 h-6 text-foreground" />
            </button>
          </div>
        </div>

        {/* Seletor de semana - faixa de datas + setas */}
        <div className="glass-card rounded-xl p-3 mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setSelectedDate((d) => subWeeks(d, 1))}
            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-muted rounded-lg transition-colors"
            aria-label="Semana anterior"
          >
            <ChevronLeft className="w-6 h-6 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
            <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-medium text-foreground truncate">
              {format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: ptBR })} à{' '}
              {format(endOfWeek(selectedDate, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: ptBR })}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedDate((d) => addWeeks(d, 1))}
            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-muted rounded-lg transition-colors"
            aria-label="Próxima semana"
          >
            <ChevronRight className="w-6 h-6 text-muted-foreground" />
          </button>
        </div>

        {/* Cartões dos dias da semana - clicáveis */}
        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
          {(() => {
            const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
            return Array.from({ length: 7 }, (_, i) => {
              const d = addDays(weekStart, i);
              const dayStr = format(d, 'EEE', { locale: ptBR }).toUpperCase().slice(0, 3);
              const dayNum = format(d, 'd');
              const isSelected =
                format(d, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
              return (
                <button
                  key={d.getTime()}
                  type="button"
                  onClick={() => setSelectedDate(d)}
                  className={`flex flex-col items-center justify-center min-w-[48px] py-2.5 px-2 rounded-xl border transition-all flex-shrink-0 ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'glass-card border-border hover:border-primary/40 text-foreground'
                  }`}
                >
                  <span className="text-xs font-medium opacity-90">{dayStr}</span>
                  <span className="text-base font-bold mt-0.5">{dayNum}</span>
                </button>
              );
            });
          })()}
        </div>

        {/* Resumo Hoje + Esta semana */}
        <AdminSummaryCards weekAnchor={selectedDate} />

        {/* Agenda do dia - oculta agendamentos já concluídos automaticamente (passou o horário de término) */}
        {(() => {
          const appointmentsToShow = appointments.filter((apt) => !isAppointmentAutoCompleted(apt));
          const groupedByHour = groupAppointmentsByHour(appointmentsToShow);
          const hourSlots = Object.keys(groupedByHour);
          const hasAnyAppointments = appointmentsToShow.length > 0;
          
          return (
        <div className="glass-card rounded-xl border border-border overflow-hidden mb-8">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </h2>
          </div>
          <div
            className={`min-h-[200px] ${!hasAnyAppointments && !isLoading ? 'bg-[repeating-linear-gradient(-45deg,transparent,transparent_8px,hsl(var(--muted)/0.15)_8px,hsl(var(--muted)/0.15)_16px)]' : ''}`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : !hasAnyAppointments ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Nenhum agendamento para esta data</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {hourSlots.map((hourSlot) => {
                  const hourAppointments = groupedByHour[hourSlot];
                  if (hourAppointments.length === 0) return null;
                  
                  const hourLabel = formatHourLabel(hourSlot);
                  
                  return (
                    <div key={hourSlot} className="p-3">
                      {/* Cabeçalho do horário */}
                      <div className="flex items-center gap-2 mb-3 px-2">
                        <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                        <h3 className="text-sm font-semibold text-foreground">
                          {hourLabel}
                        </h3>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {hourAppointments.length} {hourAppointments.length === 1 ? 'agendamento' : 'agendamentos'}
                        </span>
                      </div>
                      
                      {/* Lista de agendamentos do horário */}
                      <div className="space-y-2.5">
                        <AnimatePresence>
                          {hourAppointments.map((apt, index) => {
                            const isOverdue = isAppointmentOverdue(apt);
                            return (
                              <motion.div
                                key={apt.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ delay: index * 0.03 }}
                                className={`glass-card rounded-xl p-4 border ${
                                  isOverdue 
                                    ? 'border-yellow-500/50 bg-yellow-500/5' 
                                    : 'border-border'
                                }`}
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="flex flex-col items-center text-primary font-bold flex-shrink-0">
                                      <Clock className="w-4 h-4 mb-1" />
                                      <span className="text-sm">{apt.start_time.slice(0, 5)}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {apt.end_time.slice(0, 5)}
                                      </span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <h3 className="font-semibold text-foreground text-base truncate">
                                        {apt.service_type}
                                      </h3>
                                      {apt.status !== 'blocked' && (
                                        <>
                                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                            <User className="w-3 h-3 flex-shrink-0" />
                                            <span className="truncate">{apt.client_name}</span>
                                          </div>
                                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                            <Phone className="w-3 h-3 flex-shrink-0" />
                                            <span className="truncate">{apt.client_phone}</span>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0 ml-2">
                                    {isOverdue && (
                                      <span className="px-2 py-1 text-xs rounded-full border border-yellow-500/50 bg-yellow-500/20 text-yellow-400 whitespace-nowrap">
                                        Atrasado
                                      </span>
                                    )}
                                    <span className={`px-2 py-1 text-xs rounded-full border whitespace-nowrap ${getStatusColor(apt.status)}`}>
                                      {apt.status === 'scheduled' && 'Agendado'}
                                      {apt.status === 'confirmed' && 'Confirmado'}
                                      {apt.status === 'completed' && 'Concluído'}
                                      {apt.status === 'blocked' && 'Bloqueado'}
                                      {apt.status === 'cancelled' && 'Cancelado'}
                                      {apt.status === 'no_show' && 'Não Compareceu'}
                                    </span>
                                    {(apt.status === 'scheduled' || apt.status === 'confirmed') && (
                                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap justify-end">
                                        <button
                                          onClick={() => handleOpenEdit(apt)}
                                          className="p-2 rounded-md bg-muted text-foreground hover:bg-muted/80 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                                          title="Editar agendamento"
                                          aria-label="Editar agendamento"
                                        >
                                          <Pencil className="w-5 h-5" />
                                        </button>
                                        <button
                                          onClick={() => handleComplete(apt.id)}
                                          className="p-2 rounded-md bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                                          title="Concluir"
                                          aria-label="Concluir"
                                        >
                                          <Check className="w-5 h-5" />
                                        </button>
                                        <button
                                          onClick={() => handleQuickReminder(apt)}
                                          className="p-2 rounded-md bg-primary/20 text-primary hover:bg-primary/30 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                                          title="Lembrete rápido"
                                          aria-label="Lembrete rápido"
                                        >
                                          <MessageCircle className="w-5 h-5" />
                                        </button>
                                        <button
                                          onClick={() => handleCancel(apt.id)}
                                          className="p-2 rounded-md bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                                          title="Cancelar"
                                          aria-label="Cancelar"
                                        >
                                          <X className="w-5 h-5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
          );
        })()}

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

        {/* Modal Editar Agendamento */}
        <AnimatePresence>
          {showEditModal && editingAppointment && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
              onClick={() => {
                setShowEditModal(false);
                setEditingAppointment(null);
                setEditConflictWarning(null);
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
                  Editar Agendamento
                </h2>

                {editConflictWarning && (
                  <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-400">{editConflictWarning}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-base font-medium text-foreground mb-2">
                      Nome do Cliente
                    </label>
                    <input
                      type="text"
                      value={editForm.clientName}
                      onChange={(e) => setEditForm({ ...editForm, clientName: e.target.value })}
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
                      value={editForm.clientPhone}
                      onChange={(e) => setEditForm({ ...editForm, clientPhone: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  <div>
                    <label className="block text-base font-medium text-foreground mb-2">
                      Serviço
                    </label>
                    <select
                      value={editForm.serviceType}
                      onChange={(e) => {
                        const service = services.find(s => s.name === e.target.value);
                        setEditForm({
                          ...editForm,
                          serviceType: e.target.value,
                          duration: service?.duration ?? 30,
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
                      value={editForm.appointmentDate}
                      onChange={(e) => setEditForm({ ...editForm, appointmentDate: e.target.value })}
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
                      value={editForm.startTime}
                      onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingAppointment(null);
                      setEditConflictWarning(null);
                    }}
                    className="flex-1 bg-secondary text-secondary-foreground py-4 rounded-xl font-semibold text-base hover:bg-secondary/80 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 bg-primary text-primary-foreground py-4 rounded-xl font-semibold text-base hover:opacity-90 transition-opacity"
                  >
                    Salvar alterações
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
