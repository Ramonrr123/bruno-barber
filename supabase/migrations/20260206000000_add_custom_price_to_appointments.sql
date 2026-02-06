-- ============================================
-- Adicionar preço customizado por agendamento
-- ============================================
-- Permite sobrescrever o preço do serviço para agendamentos específicos
-- sem alterar o catálogo global de serviços.

ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS custom_price NUMERIC(10, 2) NULL;

COMMENT ON COLUMN public.appointments.custom_price IS 'Preço customizado para este agendamento. Quando NULL, usa o preço padrão do serviço.';
