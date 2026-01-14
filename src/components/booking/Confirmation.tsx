import { motion } from 'framer-motion';
import { Check, MessageCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BookingData } from '@/types/booking';

interface ConfirmationProps {
  bookingData: BookingData;
  onNewBooking: () => void;
}

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, mins] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60);
  const endMins = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
}

export function Confirmation({ bookingData, onNewBooking }: ConfirmationProps) {
  const { service, date, time, clientName } = bookingData;
  
  if (!service || !date || !time) return null;

  const formattedDate = format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
  const endTime = calculateEndTime(time, service.duration);
  
  // WhatsApp message
  const whatsappMessage = encodeURIComponent(
    `Olá! Sou ${clientName} e acabei de agendar:\n\n` +
    `📋 ${service.name}\n` +
    `📅 ${formattedDate}\n` +
    `🕐 ${time} às ${endTime}\n\n` +
    `Confirmado pelo app da Barbearia do Sapo 🐸`
  );
  
  // Replace with actual barbershop number
  const whatsappNumber = '5511999999999';
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="px-4 pb-8 flex flex-col items-center"
    >
      {/* Success Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.2 }}
        className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mb-6 neon-glow-strong"
      >
        <Check className="w-10 h-10 text-primary-foreground" strokeWidth={3} />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-bold text-foreground mb-2 text-center"
      >
        Agendado! 🎉
      </motion.h1>
      
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-muted-foreground text-center mb-6"
      >
        {clientName}, seu horário está reservado
      </motion.p>

      {/* Appointment Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full glass-card rounded-xl p-5 mb-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{service.icon}</span>
          <div>
            <h3 className="font-bold text-lg text-foreground">{service.name}</h3>
            <p className="text-primary font-semibold">R$ {service.price}</p>
          </div>
        </div>
        
        <div className="space-y-2 border-t border-border pt-4">
          <div className="flex items-center gap-2 text-foreground">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="capitalize">{formattedDate}</span>
          </div>
          <div className="flex items-center gap-2 text-foreground">
            <span className="text-primary text-lg">🕐</span>
            <span className="font-semibold">{time} - {endTime}</span>
          </div>
        </div>
      </motion.div>

      {/* WhatsApp Button */}
      <motion.a
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full bg-[#25D366] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all hover:brightness-110"
      >
        <MessageCircle className="w-5 h-5" />
        Abrir WhatsApp do Barbeiro
      </motion.a>

      {/* New Booking */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        onClick={onNewBooking}
        className="mt-4 text-muted-foreground hover:text-foreground transition-colors"
      >
        Fazer novo agendamento
      </motion.button>
    </motion.div>
  );
}
