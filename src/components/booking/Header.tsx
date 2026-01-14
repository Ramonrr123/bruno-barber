import { motion } from 'framer-motion';

export function Header() {
  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-6 px-4"
    >
      <div className="flex items-center justify-center gap-3 mb-2">
        <span className="text-4xl">🐸</span>
        <h1 className="text-2xl font-bold text-foreground">
          Barbearia do <span className="text-primary neon-text">Sapo</span>
        </h1>
      </div>
      <p className="text-muted-foreground text-sm">
        Agende seu horário em segundos
      </p>
    </motion.header>
  );
}
