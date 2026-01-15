-- ============================================
-- VERIFICAR ESTRUTURA DA TABELA
-- Execute este SQL para ver exatamente quais colunas existem
-- ============================================

-- Ver todas as colunas da tabela appointments
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'appointments'
ORDER BY ordinal_position;

-- Verificar se end_time existe
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'appointments' 
            AND column_name = 'end_time'
        ) THEN '✅ Coluna end_time EXISTE'
        ELSE '❌ Coluna end_time NÃO EXISTE'
    END as status_end_time;

-- Verificar se service_type existe
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'appointments' 
            AND column_name = 'service_type'
        ) THEN '✅ Coluna service_type EXISTE'
        ELSE '❌ Coluna service_type NÃO EXISTE'
    END as status_service_type;

-- Verificar se service_name existe
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'appointments' 
            AND column_name = 'service_name'
        ) THEN '✅ Coluna service_name EXISTE'
        ELSE '❌ Coluna service_name NÃO EXISTE'
    END as status_service_name;
