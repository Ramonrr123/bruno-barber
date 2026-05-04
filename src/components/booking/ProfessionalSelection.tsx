import { motion } from 'framer-motion';
import { ArrowLeft, UserRound } from 'lucide-react';
import { BOOKING_PROFESSIONALS } from '@/data/constants';
import { Service } from '@/types/booking';

interface ProfessionalSelectionProps {
  service: Service;
  onSelect: (professionalName: string) => void;
  onBack: () => void;
}

export function ProfessionalSelection({ service, onSelect, onBack }: ProfessionalSelectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="px-4 pb-8"
    >
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar</span>
      </button>

      <div className="glass-card rounded-xl p-4 mb-6 border border-white/10">
        <p className="text-xs text-muted-foreground mb-1">Serviço escolhido</p>
        <p className="font-semibold text-foreground">{service.name}</p>
      </div>

      <h2 className="text-lg font-semibold text-foreground mb-4">
        Escolha o profissional
      </h2>

      <ul className="space-y-3">
        {BOOKING_PROFESSIONALS.map((name) => (
          <li key={name}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(name)}
              className="w-full flex items-center gap-4 rounded-xl border border-border bg-card/80 hover:bg-card hover:border-primary/50 transition-colors p-4 text-left"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/25">
                <UserRound className="h-6 w-6" />
              </div>
              <span className="text-base font-semibold text-foreground">{name}</span>
            </motion.button>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
