-- Nome do profissional escolhido pelo cliente na reserva online.
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS professional text;

COMMENT ON COLUMN public.appointments.professional IS 'Profissional (barbeiro) associado ao agendamento.';
