import { motion } from 'framer-motion';

export function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="py-6 px-4 border-t border-white/5 mt-auto"
    >
      <div className="max-w-lg mx-auto">
        {/* Copyright */}
        <p className="text-center text-xs text-gray-400">
          Barbearia do Sapo © 2026
        </p>
      </div>
    </motion.footer>
  );
}
