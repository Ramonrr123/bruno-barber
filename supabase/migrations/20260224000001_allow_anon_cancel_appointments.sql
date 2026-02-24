-- ============================================
-- Permitir que clientes cancelem seus próprios agendamentos
-- Executar no Supabase (SQL editor ou CLI de migrações)
-- ============================================

-- Criar policy específica para permitir UPDATE pela role anon
-- Regras:
-- - Só pode atualizar registros cujo status atual seja 'scheduled' ou 'confirmed'
-- - Só pode alterar o registro para status = 'cancelled'
-- - Só para agendamentos cuja data ainda não passou (>= hoje)

CREATE POLICY IF NOT EXISTS "Anon users can cancel future appointments"
ON public.appointments
FOR UPDATE
TO anon
USING (
  status IN ('scheduled', 'confirmed')
  AND appointment_date >= CURRENT_DATE
)
WITH CHECK (
  status = 'cancelled'
  AND appointment_date >= CURRENT_DATE
);

