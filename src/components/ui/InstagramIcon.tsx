import { LucideProps } from 'lucide-react';

/**
 * Ícone SVG customizado do Instagram
 * Mantém o formato do logo do Instagram (câmera polaroid) adaptado para o tema da aplicação
 */
export function InstagramIcon({ className, ...props }: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Quadrado arredondado (moldura da câmera) */}
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      {/* Círculo central (lente da câmera) */}
      <circle cx="12" cy="12" r="4" />
      {/* Ponto no canto superior direito (flash/visor) */}
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}
