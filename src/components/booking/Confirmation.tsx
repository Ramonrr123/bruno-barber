import { motion } from 'framer-motion';
import { Check, Calendar, Clock, MapPin, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BookingData } from '@/types/booking';
import { BARBER_NAME } from '@/data/constants';
import { getServiceIcon } from '@/lib/serviceIcons';

// Dados do endereço da barbearia
const BARBERSHOP_ADDRESS = {
  street: 'Rua Henrique Sorg, 310',
  neighborhood: 'Jardim Esperança',
  city: 'Canoinhas - SC',
  fullAddress: 'Rua Henrique Sorg, 310, Jardim Esperança, Canoinhas - SC',
  googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Rua+Henrique+Sorg,+310,+Jardim+Esperança,+Canoinhas+SC'
};

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
        Agendado com sucesso!
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
        className="w-full glass-card rounded-xl p-5 mb-6 border border-white/10"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center border border-white/5 flex-shrink-0">
            {(() => {
              const IconComponent = getServiceIcon(service.icon);
              return <IconComponent className="w-6 h-6 text-primary/80" />;
            })()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-foreground">{service.name}</h3>
            <p className="text-primary font-semibold neon-text">R$ {service.price.toFixed(2).replace('.', ',')}</p>
          </div>
        </div>
        
        <div className="space-y-2 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2 text-foreground">
            <Calendar className="w-4 h-4 text-primary/80" />
            <span className="capitalize">{formattedDate}</span>
          </div>
          <div className="flex items-center gap-2 text-foreground">
            <Clock className="w-4 h-4 text-primary/80" />
            <span className="font-semibold">{time} - {endTime} • Profissional: {BARBER_NAME}</span>
          </div>
        </div>
      </motion.div>

      {/* Location Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="w-full bg-zinc-900/50 rounded-xl p-5 mb-6 border border-zinc-800"
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-lg bg-green-600/20 flex items-center justify-center border border-green-600/30">
              <MapPin className="w-6 h-6 text-green-500" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground mb-2 text-base">
              Nossa Localização
            </h3>
            <div className="space-y-1 text-sm text-muted-foreground mb-4">
              <p>{BARBERSHOP_ADDRESS.street}</p>
              <p>{BARBERSHOP_ADDRESS.neighborhood}</p>
              <p>{BARBERSHOP_ADDRESS.city}</p>
            </div>
            <a
              href={BARBERSHOP_ADDRESS.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all hover:shadow-lg hover:shadow-green-600/30 active:scale-[0.98]"
            >
              <MapPin className="w-4 h-4" />
              <span>Como Chegar</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </motion.div>

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
