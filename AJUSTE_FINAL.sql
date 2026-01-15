-- ============================================
-- AJUSTE FINAL - Tornar service_type NOT NULL
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- 1. Atualizar registros existentes que têm service_type NULL
UPDATE public.appointments
SET service_type = 'Serviço'
WHERE service_type IS NULL OR service_type = '';

-- 2. Tornar service_type NOT NULL com valor padrão
ALTER TABLE public.appointments 
ALTER COLUMN service_type SET NOT NULL;

ALTER TABLE public.appointments 
ALTER COLUMN service_type SET DEFAULT 'Serviço';

-- 3. Verificar resultado
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'appointments'
AND column_name = 'service_type';
