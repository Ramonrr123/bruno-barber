-- ============================================
-- Migration: Remover Tabela schedule_overrides
-- ============================================
-- Esta migration remove completamente a funcionalidade de Exceções de Agenda
-- que se tornou redundante no sistema.

-- Remover trigger se existir
DROP TRIGGER IF EXISTS update_schedule_overrides_updated_at ON public.schedule_overrides;

-- Remover policies RLS
DROP POLICY IF EXISTS "Schedule overrides are viewable by everyone" ON public.schedule_overrides;
DROP POLICY IF EXISTS "Only authenticated users can manage schedule overrides" ON public.schedule_overrides;

-- Remover índice
DROP INDEX IF EXISTS public.idx_schedule_overrides_date;

-- Remover constraints
ALTER TABLE IF EXISTS public.schedule_overrides 
  DROP CONSTRAINT IF EXISTS check_open_times;
ALTER TABLE IF EXISTS public.schedule_overrides 
  DROP CONSTRAINT IF EXISTS check_time_order;

-- Remover tabela
DROP TABLE IF EXISTS public.schedule_overrides;
