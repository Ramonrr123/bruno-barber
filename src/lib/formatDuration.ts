/**
 * Formata a duração em minutos para uma string amigável
 * - Menos de 60 minutos: "X min"
 * - 60 minutos ou mais: "Xh Ymin" ou "Xh" se não houver minutos restantes
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}min`;
}
