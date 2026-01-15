-- ============================================
-- Tabela schedule_overrides (Exceções de Agenda)
-- ============================================

-- Criar tabela schedule_overrides
CREATE TABLE IF NOT EXISTS public.schedule_overrides (
    id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    is_open BOOLEAN NOT NULL,
    start_time TIME,
    end_time TIME,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Constraint: Se is_open = true, start_time e end_time são obrigatórios
ALTER TABLE public.schedule_overrides
ADD CONSTRAINT check_open_times
CHECK (
    (is_open = false) OR 
    (is_open = true AND start_time IS NOT NULL AND end_time IS NOT NULL)
);

-- Constraint: end_time deve ser maior que start_time quando is_open = true
ALTER TABLE public.schedule_overrides
ADD CONSTRAINT check_time_order
CHECK (
    (is_open = false) OR 
    (is_open = true AND end_time > start_time)
);

-- Índice para busca rápida por data
CREATE INDEX IF NOT EXISTS idx_schedule_overrides_date 
ON public.schedule_overrides (date);

-- Habilitar RLS
ALTER TABLE public.schedule_overrides ENABLE ROW LEVEL SECURITY;

-- Policy: Leitura pública (necessário para verificar disponibilidade)
CREATE POLICY "Schedule overrides are viewable by everyone"
ON public.schedule_overrides
FOR SELECT
USING (true);

-- Policy: Apenas authenticated (Admin) pode criar/atualizar/deletar
CREATE POLICY "Only authenticated users can manage schedule overrides"
ON public.schedule_overrides
FOR ALL
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');
