import { useConfirmListener } from '@/hooks/useConfirm';
import { motion, AnimatePresence } from 'framer-motion';

export function ConfirmDialog() {
  const confirm = useConfirmListener();

  return (
    <AnimatePresence>
      {confirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            key="confirm-dialog"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-background border border-border rounded-lg shadow-lg p-6 max-w-md w-full"
          >
            <p className="text-foreground mb-6">{confirm.message}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  confirm.onCancel?.();
                }}
                className="px-4 py-2 rounded-md border border-border bg-background text-foreground hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  confirm.onConfirm();
                }}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                OK
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
