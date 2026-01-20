-- ============================================
-- SQL CORRIGIDO - Sem erro de sintaxe
-- Execute este código no Supabase SQL Editor
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
        
        -- Preencher title com name existente
        UPDATE public.services 
        SET title = name 
        WHERE title IS NULL;
        
        -- Tornar title NOT NULL
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
        -- Adicionar coluna
        ALTER TABLE public.services 
        ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        
        -- Preencher user_id existente com o primeiro usuário
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

-- Remover políticas antigas
DROP POLICY IF EXISTS "Only authenticated users can insert services" ON public.services;
DROP POLICY IF EXISTS "Only authenticated users can update services" ON public.services;
DROP POLICY IF EXISTS "Only authenticated users can delete services" ON public.services;

-- Criar novas políticas com user_id
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

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_services_user_id 
ON public.services (user_id);
