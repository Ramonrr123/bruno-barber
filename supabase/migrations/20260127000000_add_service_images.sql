-- ============================================
-- Adicionar suporte a imagens para serviços
-- ============================================

-- 1. Adicionar coluna image_url na tabela services
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'services' 
        AND column_name = 'image_url'
    ) THEN
        ALTER TABLE public.services 
        ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- ============================================
-- 2. Criar Bucket no Storage (execute manualmente no Supabase Dashboard)
-- ============================================
-- Vá em Storage > Create Bucket
-- Nome: service-images
-- Public: true (para leitura pública)
-- File size limit: 5MB (ou conforme necessário)
-- Allowed MIME types: image/jpeg, image/png, image/webp, image/gif

-- ============================================
-- 3. Políticas RLS para o Storage
-- ============================================

-- Policy: Leitura pública (qualquer um pode ver as imagens)
CREATE POLICY IF NOT EXISTS "Service images are viewable by everyone"
ON storage.objects
FOR SELECT
USING (bucket_id = 'service-images');

-- Policy: Apenas usuários autenticados podem fazer upload
CREATE POLICY IF NOT EXISTS "Only authenticated users can upload service images"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'service-images' 
    AND auth.role() = 'authenticated'
);

-- Policy: Apenas usuários autenticados podem atualizar imagens
CREATE POLICY IF NOT EXISTS "Only authenticated users can update service images"
ON storage.objects
FOR UPDATE
USING (
    bucket_id = 'service-images' 
    AND auth.role() = 'authenticated'
)
WITH CHECK (
    bucket_id = 'service-images' 
    AND auth.role() = 'authenticated'
);

-- Policy: Apenas usuários autenticados podem deletar imagens
CREATE POLICY IF NOT EXISTS "Only authenticated users can delete service images"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'service-images' 
    AND auth.role() = 'authenticated'
);
