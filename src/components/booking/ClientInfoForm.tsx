import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Phone, Loader2 } from 'lucide-react';
import InputMask from 'react-input-mask';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Service } from '@/types/booking';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ClientInfoFormProps {
  service: Service;
  date: Date;
  time: string;
  onBack: () => void;
  onConfirm: () => void;
  onUpdateClientInfo: (name: string, phone: string) => void;
}

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, mins] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60);
  const endMins = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
}

export function ClientInfoForm({
  service,
  date,
  time,
  onBack,
  onConfirm,
  onUpdateClientInfo,
}: ClientInfoFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  const validateForm = () => {
    const newErrors: { name?: string; phone?: string } = {};
    
    if (!name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Nome muito curto';
    }
    
    const phoneDigits = phone.replace(/\D/g, '');
    if (!phone.trim()) {
      newErrors.phone = 'WhatsApp é obrigatório';
    } else if (phoneDigits.length < 10) {
      newErrors.phone = 'Número incompleto';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const endTime = calculateEndTime(time, service.duration);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Double-check availability before inserting
      const { data: conflicts, error: checkError } = await supabase
        .from('appointments')
        .select('id')
        .eq('appointment_date', dateStr)
        .in('status', ['scheduled', 'blocked'])
        .lt('start_time', endTime)
        .gt('end_time', time);

      if (checkError) throw checkError;
      
      if (conflicts && conflicts.length > 0) {
        toast.error('Este horário já foi reservado. Escolha outro horário.');
        onBack();
        return;
      }

      // Insert the appointment
      const { error: insertError } = await supabase
        .from('appointments')
        .insert({
          client_name: name.trim(),
          client_phone: phone.replace(/\D/g, ''),
          service_type: service.name,
          appointment_date: dateStr,
          start_time: time,
          end_time: endTime,
          status: 'scheduled',
        });

      if (insertError) throw insertError;

      onUpdateClientInfo(name.trim(), phone);
      toast.success('Agendamento confirmado!');
      onConfirm();
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error('Erro ao agendar. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="px-4 pb-8"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar</span>
      </button>

      {/* Summary Card */}
      <div className="glass-card rounded-xl p-4 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">{service.icon}</span>
          <div>
            <h3 className="font-semibold text-foreground">{service.name}</h3>
            <p className="text-sm text-muted-foreground">
              {service.duration} min • R$ {service.price}
            </p>
          </div>
        </div>
        <div className="border-t border-border pt-3">
          <p className="text-sm text-foreground">
            📅 {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
          <p className="text-sm text-primary font-semibold mt-1">
            🕐 {time} - {calculateEndTime(time, service.duration)}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Seus dados
        </h2>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Nome
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              className={`w-full bg-card border rounded-xl py-3 pl-11 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all ${
                errors.name ? 'border-destructive' : 'border-border'
              }`}
            />
          </div>
          {errors.name && (
            <p className="text-destructive text-sm mt-1">{errors.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            WhatsApp
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <InputMask
              mask="(99) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            >
              {(inputProps: React.InputHTMLAttributes<HTMLInputElement>) => (
                <input
                  {...inputProps}
                  type="tel"
                  placeholder="(11) 99999-9999"
                  className={`w-full bg-card border rounded-xl py-3 pl-11 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all ${
                    errors.phone ? 'border-destructive' : 'border-border'
                  }`}
                />
              )}
            </InputMask>
          </div>
          {errors.phone && (
            <p className="text-destructive text-sm mt-1">{errors.phone}</p>
          )}
        </div>

        <motion.button
          type="submit"
          disabled={isSubmitting}
          whileTap={{ scale: 0.98 }}
          className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl mt-6 transition-all hover:neon-glow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Agendando...
            </>
          ) : (
            'Confirmar Agendamento'
          )}
        </motion.button>
      </form>
    </motion.div>
  );
}
