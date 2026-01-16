import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { InstagramIcon } from '@/components/ui/InstagramIcon';
import { supabase } from '@/integrations/supabase/client';

interface BusinessSettings {
  whatsapp_url: string | null;
  instagram_url: string | null;
}

export function Footer() {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('business_settings')
          .select('whatsapp_url, instagram_url')
          .limit(1)
          .maybeSingle();

        if (error) {
          // Se a tabela não existir ainda, não logar erro (pode ser esperado)
          const isTableNotFound = 
            error.code === 'PGRST116' || 
            error.code === '42P01' || 
            error.message?.includes('Could not find the table') ||
            error.message?.includes('relation "public.business_settings" does not exist');
          
          if (!isTableNotFound) {
            console.error('Erro ao buscar configurações do negócio:', error);
          }
          
          // Fallback: permitir que o footer seja exibido mesmo sem configurações
          setSettings(null);
          return;
        }

        setSettings(data || null);
      } catch (error: any) {
        // Verificar se é erro de tabela não encontrada
        const isTableNotFound = 
          error?.code === 'PGRST116' || 
          error?.code === '42P01' ||
          error?.message?.includes('Could not find the table') ||
          error?.message?.includes('relation "public.business_settings" does not exist');
        
        if (!isTableNotFound) {
          console.error('Erro ao buscar configurações:', error);
        }
        
        setSettings(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Não exibir footer se estiver carregando e não houver configurações
  if (isLoading) {
    return null;
  }

  const hasSocialLinks = settings?.whatsapp_url || settings?.instagram_url;

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="py-6 px-4 border-t border-white/5 mt-auto"
    >
      <div className="max-w-lg mx-auto">
        {/* Links Sociais */}
        {hasSocialLinks && (
          <div className="flex items-center justify-center gap-4 mb-4">
            {settings?.whatsapp_url && (
              <motion.a
                href={settings.whatsapp_url}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 h-10 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/20 flex items-center justify-center text-primary/80 hover:text-primary transition-all"
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-5 h-5" />
              </motion.a>
            )}
            
            {settings?.instagram_url && (
              <motion.a
                href={settings.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 h-10 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/20 flex items-center justify-center text-primary/80 hover:text-primary transition-all"
                aria-label="Instagram"
              >
                <InstagramIcon className="w-5 h-5" />
              </motion.a>
            )}
          </div>
        )}

        {/* Copyright */}
        <p className="text-center text-xs text-gray-400">
          Barbearia do Sapo © 2026
        </p>
      </div>
    </motion.footer>
  );
}
