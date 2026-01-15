-- Fix service column: ensure service_type exists and service_name is removed or aliased
-- This migration handles both cases: if service_name exists, we'll work with it
-- If service_type exists, we'll use it

DO $$ 
BEGIN
    -- Check if service_name column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'service_name'
    ) THEN
        -- If service_name exists but service_type doesn't, rename it
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'appointments' 
            AND column_name = 'service_type'
        ) THEN
            ALTER TABLE public.appointments 
            RENAME COLUMN service_name TO service_type;
        ELSE
            -- Both exist, drop service_name and use service_type
            ALTER TABLE public.appointments 
            DROP COLUMN service_name;
        END IF;
    END IF;
    
    -- Ensure service_type exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'service_type'
    ) THEN
        ALTER TABLE public.appointments 
        ADD COLUMN service_type TEXT NOT NULL DEFAULT 'Serviço';
    END IF;
END $$;
