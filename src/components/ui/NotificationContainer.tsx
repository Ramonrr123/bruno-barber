import { useNotification } from '@/hooks/useNotification';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function NotificationContainer() {
  const { notifications, remove } = useNotification();

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="pointer-events-auto"
          >
            <div
              className={`
                rounded-lg border p-4 shadow-lg backdrop-blur-sm
                ${
                  notification.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100'
                    : notification.type === 'error'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100'
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100'
                }
              `}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium flex-1">{notification.message}</p>
                <button
                  onClick={() => remove(notification.id)}
                  className="flex-shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
