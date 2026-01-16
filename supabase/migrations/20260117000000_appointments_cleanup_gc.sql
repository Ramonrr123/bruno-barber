-- ============================================
-- SCRIPT DE LIMPEZA AUTOMÁTICA (GARBAGE COLLECTION)
-- Tabela: appointments
-- Objetivo: Limpar registros antigos preservando histórico financeiro
-- ============================================

-- ============================================
-- PARTE 1: HABILITAR EXTENSÃO pg_cron
-- ============================================
-- Nota: pg_cron pode não estar disponível no plano Free do Supabase
-- Se falhar, você pode executar a função manualmente via Dashboard

DO $$
BEGIN
    -- Tentar habilitar a extensão pg_cron
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    RAISE NOTICE 'Extensão pg_cron habilitada com sucesso!';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'AVISO: pg_cron não está disponível neste plano. Você pode executar a função cleanup_old_appointments() manualmente quando necessário.';
        RAISE NOTICE 'Erro: %', SQLERRM;
END $$;

-- ============================================
-- PARTE 2: CRIAR FUNÇÃO DE LIMPEZA
-- ============================================

CREATE OR REPLACE FUNCTION public.cleanup_old_appointments()
RETURNS TABLE(
    deleted_count INTEGER,
    rule_a_count INTEGER,
    rule_b_count INTEGER,
    rule_c_count INTEGER,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rule_a_count INTEGER := 0;
    v_rule_b_count INTEGER := 0;
    v_rule_c_count INTEGER := 0;
    v_total_deleted INTEGER := 0;
    v_message TEXT;
BEGIN
    -- REGRA A: Deletar 'cancelled' ou 'no_show' com mais de 30 dias
    -- Baseado na data de criação do registro (created_at)
    WITH deleted_a AS (
        DELETE FROM public.appointments
        WHERE status IN ('cancelled', 'no_show')
          AND created_at < NOW() - INTERVAL '30 days'
        RETURNING id
    )
    SELECT COUNT(*) INTO v_rule_a_count FROM deleted_a;

    -- REGRA B: Deletar 'completed' apenas se for mais antigo que 5 anos
    -- Preserva histórico financeiro recente
    WITH deleted_b AS (
        DELETE FROM public.appointments
        WHERE status = 'completed'
          AND created_at < NOW() - INTERVAL '5 years'
        RETURNING id
    )
    SELECT COUNT(*) INTO v_rule_b_count FROM deleted_b;

    -- REGRA C: Deletar 'confirmed' onde a data do agendamento já passou há mais de 60 dias
    -- Provavelmente erro de operação (agendamento não foi completado nem cancelado)
    WITH deleted_c AS (
        DELETE FROM public.appointments
        WHERE status = 'confirmed'
          AND (appointment_date + (start_time::TIME)) < NOW() - INTERVAL '60 days'
        RETURNING id
    )
    SELECT COUNT(*) INTO v_rule_c_count FROM deleted_c;

    -- Calcular total
    v_total_deleted := v_rule_a_count + v_rule_b_count + v_rule_c_count;

    -- Mensagem de resultado
    v_message := format(
        'Limpeza concluída: %s registros deletados (Regra A: %s, Regra B: %s, Regra C: %s)',
        v_total_deleted,
        v_rule_a_count,
        v_rule_b_count,
        v_rule_c_count
    );

    -- Retornar resultado
    RETURN QUERY SELECT
        v_total_deleted,
        v_rule_a_count,
        v_rule_b_count,
        v_rule_c_count,
        v_message;
END;
$$;

-- ============================================
-- PARTE 3: AGENDAR TAREFA CRON (SE pg_cron DISPONÍVEL)
-- ============================================
-- Executa todo domingo às 03:00 da manhã (0 3 * * 0)

DO $$
BEGIN
    -- Remover job existente se houver
    PERFORM cron.unschedule('cleanup-appointments-weekly');
    
    -- Agendar novo job
    PERFORM cron.schedule(
        'cleanup-appointments-weekly',           -- Nome do job
        '0 3 * * 0',                             -- Cron expression: domingo às 03:00
        $$SELECT public.cleanup_old_appointments();$$  -- Função a executar
    );
    
    RAISE NOTICE 'Cron job agendado com sucesso! Executará todo domingo às 03:00.';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'AVISO: Não foi possível agendar o cron job. pg_cron pode não estar disponível.';
        RAISE NOTICE 'Você pode executar manualmente: SELECT * FROM public.cleanup_old_appointments();';
        RAISE NOTICE 'Erro: %', SQLERRM;
END $$;

-- ============================================
-- PARTE 4: COMENTÁRIOS E INSTRUÇÕES
-- ============================================

COMMENT ON FUNCTION public.cleanup_old_appointments() IS 
'Função de limpeza automática da tabela appointments.
Regras:
- REGRA A: Deleta cancelled/no_show com mais de 30 dias
- REGRA B: Deleta completed com mais de 5 anos (preserva histórico financeiro)
- REGRA C: Deleta confirmed onde a data passou há mais de 60 dias

Para executar manualmente: SELECT * FROM public.cleanup_old_appointments();';

-- ============================================
-- TESTE MANUAL (OPCIONAL - DESCOMENTE PARA TESTAR)
-- ============================================
-- Execute esta query para testar a função antes de agendar:
-- SELECT * FROM public.cleanup_old_appointments();

-- ============================================
-- VERIFICAÇÃO: Ver quantos registros serão afetados (SEM DELETAR)
-- ============================================
-- Execute estas queries para verificar antes de rodar a limpeza:

/*
-- Ver registros que seriam deletados pela REGRA A
SELECT 
    'REGRA A' as regra,
    COUNT(*) as total,
    MIN(created_at) as mais_antigo,
    MAX(created_at) as mais_recente
FROM public.appointments
WHERE status IN ('cancelled', 'no_show')
  AND created_at < NOW() - INTERVAL '30 days';

-- Ver registros que seriam deletados pela REGRA B
SELECT 
    'REGRA B' as regra,
    COUNT(*) as total,
    MIN(created_at) as mais_antigo,
    MAX(created_at) as mais_recente
FROM public.appointments
WHERE status = 'completed'
  AND created_at < NOW() - INTERVAL '5 years';

-- Ver registros que seriam deletados pela REGRA C
SELECT 
    'REGRA C' as regra,
    COUNT(*) as total,
    MIN(appointment_date) as data_mais_antiga,
    MAX(appointment_date) as data_mais_recente
FROM public.appointments
WHERE status = 'confirmed'
  AND (appointment_date + (start_time::TIME)) < NOW() - INTERVAL '60 days';
*/
