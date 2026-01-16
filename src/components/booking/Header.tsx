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
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1"></div>
          <img 
            src="/logo.png" 
            alt="Logo Barbearia Sapo do Corte - Agendamento Online"
            className="w-32 md:w-40 mx-auto drop-shadow-[0_0_15px_rgba(57,255,20,0.5)]"
            style={{ 
              display: 'block'
            }}
            onError={(e) => {
              // Fallback caso a imagem não carregue
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
          <div className="flex-1 flex justify-end">
            <motion.button
              onClick={() => setShowCheckModal(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-xl text-primary font-medium text-sm transition-all hover:shadow-lg hover:shadow-primary/20"
            >
              <Calendar className="w-4 h-4" />
              <span>Meus agendamentos</span>
            </motion.button>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          Agende seu horário em segundos
        </p>
      </motion.header>
      
      <CheckAppointmentsModal 
        isOpen={showCheckModal}
        onClose={() => setShowCheckModal(false)}
      />
    </>
  );
}
