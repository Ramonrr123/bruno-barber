import { motion } from 'framer-motion';

export function Header() {
  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-6 px-4"
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
      <p className="text-muted-foreground text-sm">
        Agende seu horário em segundos
      </p>
    </motion.header>
  );
}
