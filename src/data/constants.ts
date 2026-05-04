// Constantes da aplicação
/** Profissionais exibidos no fluxo de agendamento (ordem da lista). */
export const BOOKING_PROFESSIONALS = ['Lucas Favero', 'Daniel De Camargo'] as const;
export type BookingProfessionalName = (typeof BOOKING_PROFESSIONALS)[number];

/** Nome institucional / fallback onde não há seleção específica. */
export const BARBER_NAME = 'Bruno Michailek';
