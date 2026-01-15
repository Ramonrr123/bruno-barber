-- ============================================
-- CORREÇÃO RÁPIDA DO BANCO DE DADOS
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- Opção 1: Se a tabela tem service_name mas não tem service_type
-- Renomear service_name para service_type
DO $$ 
BEGIN
    -- Se service_name existe e service_type não existe, renomear
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
        RAISE NOTICE 'Coluna service_name renomeada para service_type';
    END IF;
END $$;

-- Opção 2: Se ambas existem, manter apenas service_type
DO $$ 
BEGIN
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
        -- Copiar dados de service_name para service_type se service_type estiver vazio
        UPDATE public.appointments 
        SET service_type = service_name 
        WHERE service_type IS NULL OR service_type = '';
        
        -- Remover service_name
        ALTER TABLE public.appointments 
        DROP COLUMN service_name;
        
        RAISE NOTICE 'Coluna service_name removida, usando apenas service_type';
    END IF;
END $$;

-- Opção 3: Se service_type não existe, criar
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'service_type'
    ) THEN
        ALTER TABLE public.appointments 
        ADD COLUMN service_type TEXT;
        
        -- Se service_name existe, copiar os dados
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'appointments' 
            AND column_name = 'service_name'
        ) THEN
            UPDATE public.appointments 
            SET service_type = service_name;
        END IF;
        
        -- Tornar obrigatório
        ALTER TABLE public.appointments 
        ALTER COLUMN service_type SET NOT NULL;
        
        RAISE NOTICE 'Coluna service_type criada';
    END IF;
END $$;

-- Verificar resultado
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'appointments'
AND column_name IN ('service_name', 'service_type')
ORDER BY column_name;
