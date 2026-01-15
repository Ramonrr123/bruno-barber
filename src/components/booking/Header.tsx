import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { CheckAppointmentsModal } from './CheckAppointmentsModal';

export function Header() {
  const [showCheckModal, setShowCheckModal] = useState(false);

  return (
    <>
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-6 px-4 relative"
      >
        <img 
          src="/logo.png" 
          alt="Logo Barbearia Sapo do Corte - Agendamento Online"
          className="w-32 md:w-40 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(57,255,20,0.5)]"
          style={{ 
            display: 'block'
          }}
          onError={(e) => {
            // Fallback caso a imagem não carregue
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
        <p className="text-muted-foreground text-sm mb-2">
          Agende seu horário em segundos
        </p>
        <button
          onClick={() => setShowCheckModal(true)}
          className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1 mx-auto"
        >
          <Calendar className="w-3 h-3" />
          Meus agendamentos
        </button>
      </motion.header>
      
      <CheckAppointmentsModal 
        isOpen={showCheckModal}
        onClose={() => setShowCheckModal(false)}
      />
    </>
  );
}
