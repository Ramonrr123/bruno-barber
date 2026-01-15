-- ============================================
-- CORREÇÃO FINAL - ESTRUTURA DA TABELA
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- 1. Garantir que end_time existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'end_time'
    ) THEN
        ALTER TABLE public.appointments 
        ADD COLUMN end_time TIME NOT NULL DEFAULT '00:00:00';
        
        -- Atualizar registros existentes
        UPDATE public.appointments
        SET end_time = (start_time::time + INTERVAL '30 minutes')::time
        WHERE end_time = '00:00:00' OR end_time IS NULL;
        
        RAISE NOTICE '✅ Coluna end_time criada';
    ELSE
        RAISE NOTICE '✅ Coluna end_time já existe';
    END IF;
END $$;

-- 2. Garantir que service_type existe (e remover service_name se existir)
DO $$ 
BEGIN
    -- Se service_name existe mas service_type não, renomear
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'service_name'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'service_type'
    ) THEN
        ALTER TABLE public.appointments 
        RENAME COLUMN service_name TO service_type;
        RAISE NOTICE '✅ Coluna service_name renomeada para service_type';
    END IF;
    
    -- Se ambas existem, manter apenas service_type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'service_name'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'service_type'
    ) THEN
        -- Copiar dados se necessário
        UPDATE public.appointments 
        SET service_type = COALESCE(service_type, service_name)
        WHERE service_type IS NULL OR service_type = '';
        
        -- Remover service_name
        ALTER TABLE public.appointments 
        DROP COLUMN service_name;
        
        RAISE NOTICE '✅ Coluna service_name removida';
    END IF;
    
    -- Se service_type não existe, criar
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'service_type'
    ) THEN
        ALTER TABLE public.appointments 
        ADD COLUMN service_type TEXT NOT NULL DEFAULT 'Serviço';
        RAISE NOTICE '✅ Coluna service_type criada';
    END IF;
END $$;

-- 3. Verificar estrutura final
SELECT 
    'ESTRUTURA FINAL DA TABELA' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'appointments'
ORDER BY ordinal_position;
