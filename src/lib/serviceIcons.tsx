import {
  Scissors,
  Sparkles,
  Snowflake,
  Eye,
  UserRoundCheck,
  User,
  type LucideIcon,
} from 'lucide-react';

/**
 * Mapeamento de strings do banco de dados para componentes de ícones do lucide-react
 */
export const iconMap: Record<string, LucideIcon> = {
  // Serviços de corte
  'scissors': Scissors,
  'social': Scissors,
  'corte-social': Scissors,
  'corte social': Scissors,
  
  // Degradê
  'barber-pole': Scissors,
  'degrade': Scissors,
  'corte-degrade': Scissors,
  'corte degradê': Scissors,
  'corte degrade': Scissors,
  
  // Luzes/Clareamento
  'sparkles': Sparkles,
  'luzes': Sparkles,
  'highlights': Sparkles,
  
  // Platinado
  'snowflake': Snowflake,
  'platinado': Snowflake,
  'platinum': Snowflake,
  'bleach': Snowflake,
  
  // Sobrancelha
  'eye': Eye,
  'sobrancelha': Eye,
  'sobrancelhas': Eye,
  'eyebrow': Eye,
  'eyebrows': Eye,
  
  // Barba - usando User como alternativa (Razor não existe no lucide-react padrão)
  'razor': User,
  'barba': User,
  'beard': User,
  
  // Combo/Pacote
  'user-round-check': UserRoundCheck,
  'combo': UserRoundCheck,
  'combo-sapo': UserRoundCheck,
  'pacote': UserRoundCheck,
  'package': UserRoundCheck,
};

/**
 * Retorna o componente de ícone correspondente ou Scissors como fallback
 */
export function getServiceIcon(iconString: string | null | undefined): LucideIcon {
  if (!iconString) return Scissors;
  
  // Normalizar string (lowercase, remover espaços e caracteres especiais)
  const normalized = iconString
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
  
  return iconMap[normalized] || iconMap[iconString.toLowerCase()] || Scissors;
}
