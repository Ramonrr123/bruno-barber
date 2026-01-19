-- ============================================
-- Atualizar tabela services
-- Adicionar coluna title e user_id
-- ============================================

-- Adicionar coluna title (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'services' 
        AND column_name = 'title'
    ) THEN
        ALTER TABLE public.services 
        ADD COLUMN title TEXT;
        
        -- Preencher title com name existente para manter compatibilidade
        UPDATE public.services 
        SET title = name 
        WHERE title IS NULL;
        
        -- Tornar title NOT NULL após preencher
        ALTER TABLE public.services 
        ALTER COLUMN title SET NOT NULL;
    END IF;
END $$;

-- Adicionar coluna user_id (se não existir)
DO $$ 
DECLARE
    first_user_id UUID;
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'services' 
        AND column_name = 'user_id'
    ) THEN
        -- Adicionar coluna user_id
        ALTER TABLE public.services 
        ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        
        -- Preencher user_id existente com o primeiro usuário (se existir)
        SELECT id INTO first_user_id 
        FROM auth.users 
        LIMIT 1;
        
        IF first_user_id IS NOT NULL THEN
            UPDATE public.services 
            SET user_id = first_user_id 
            WHERE user_id IS NULL;
        END IF;
    END IF;
END $$;

-- Atualizar políticas RLS (remover antigas se existirem)
DROP POLICY IF EXISTS "Only authenticated users can insert services" ON public.services;
DROP POLICY IF EXISTS "Only authenticated users can update services" ON public.services;
DROP POLICY IF EXISTS "Only authenticated users can delete services" ON public.services;

-- Criar novas políticas que consideram user_id (se a coluna existir)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'services' 
        AND column_name = 'user_id'
    ) THEN
        -- Criar políticas com user_id
        CREATE POLICY "Users can insert their own services"
        ON public.services
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY "Users can update their own services"
        ON public.services
        FOR UPDATE
        TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY "Users can delete their own services"
        ON public.services
        FOR DELETE
        TO authenticated
        USING (auth.uid() = user_id);
    ELSE
        -- Se user_id não existir, criar políticas sem filtro de user_id
        CREATE POLICY "Authenticated users can insert services"
        ON public.services
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.role() = 'authenticated');
        
        CREATE POLICY "Authenticated users can update services"
        ON public.services
        FOR UPDATE
        TO authenticated
        USING (auth.role() = 'authenticated');
        
        CREATE POLICY "Authenticated users can delete services"
        ON public.services
        FOR DELETE
        TO authenticated
        USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Índice para busca rápida por user_id (só cria se a coluna existir)
CREATE INDEX IF NOT EXISTS idx_services_user_id 
ON public.services (user_id)
WHERE user_id IS NOT NULL;
