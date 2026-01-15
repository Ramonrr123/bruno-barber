-- ============================================
-- Adicionar novos status: confirmed e no_show
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- Atualizar a constraint CHECK para incluir os novos status
ALTER TABLE public.appointments 
DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE public.appointments 
ADD CONSTRAINT appointments_status_check 
CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'blocked', 'no_show'));

-- Atualizar registros existentes: se status é 'scheduled', mudar para 'confirmed'
UPDATE public.appointments
SET status = 'confirmed'
WHERE status = 'scheduled';

-- Verificar resultado
SELECT 
    status,
    COUNT(*) as total
FROM public.appointments
GROUP BY status
ORDER BY status;
