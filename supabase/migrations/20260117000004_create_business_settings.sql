-- ============================================
-- CRIAR TABELA business_settings
-- Armazena configurações gerais do negócio
-- ============================================

CREATE TABLE IF NOT EXISTS public.business_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    whatsapp_url TEXT,
    instagram_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    -- Garantir apenas um registro
    CONSTRAINT single_settings CHECK (id IS NOT NULL)
);

-- Índice único para garantir apenas um registro (usando id, mas pode ser melhorado)
-- Como já temos PRIMARY KEY, isso já garante unicidade

-- Habilitar RLS na tabela business_settings
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Leitura pública (Anon)
CREATE POLICY "Business settings are viewable by everyone"
ON public.business_settings
FOR SELECT
USING (true);

-- Policy: Escrita apenas Admin (Authenticated)
CREATE POLICY "Only authenticated users can manage business settings"
ON public.business_settings
FOR ALL
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Seed: Inserir registro inicial (apenas se não existir)
INSERT INTO public.business_settings (whatsapp_url, instagram_url)
SELECT 
    'https://wa.me/5511999999999',  -- Substitua pelo número real
    'https://instagram.com/barbearia'  -- Substitua pelo instagram real
WHERE NOT EXISTS (SELECT 1 FROM public.business_settings);

-- Verificar o registro criado
SELECT * FROM public.business_settings;
