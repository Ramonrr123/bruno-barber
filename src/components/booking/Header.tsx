import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin } from 'lucide-react';
import { CheckAppointmentsModal } from './CheckAppointmentsModal';

// Dados do endereço da barbearia
const BARBERSHOP_ADDRESS_SHORT = 'Chakel Ruthemberg, 310 - União da Vitória';

export function Header() {
  const [showCheckModal, setShowCheckModal] = useState(false);

  return (
    <>
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-6 px-4 relative"
      >
        <picture>
          <img
            src="/brunologo.png"
            alt="Logo Bruno Barber"
            width={160}
            height={160}
            fetchPriority="high"
            decoding="async"
            className="w-32 md:w-40 mx-auto rounded-full object-cover border-2 border-primary/40 drop-shadow-[0_0_15px_rgba(147,68,25,0.45)] mb-3 block"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </picture>
        <p className="text-muted-foreground text-sm mb-2">
          Agende seu horário em segundos
        </p>
        
        {/* Address Badge */}
        <div className="flex items-center justify-center gap-1.5 mb-3 text-xs text-zinc-400">
          <MapPin className="w-3 h-3" />
          <span>{BARBERSHOP_ADDRESS_SHORT}</span>
        </div>

        <motion.button
          onClick={() => setShowCheckModal(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="mx-auto flex items-center gap-1.5 px-3 py-1.5 bg-primary/15 hover:bg-primary/25 border border-primary/40 rounded-lg text-primary font-semibold text-xs transition-all hover:shadow-md hover:shadow-primary/30 neon-text"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Meus agendamentos</span>
        </motion.button>
      </motion.header>
      
      <CheckAppointmentsModal 
        isOpen={showCheckModal}
        onClose={() => setShowCheckModal(false)}
      />
    </>
  );
}
