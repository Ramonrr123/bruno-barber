-- ============================================
-- Tabela exceptions (Bloqueios de Horário)
-- ============================================

-- Criar tabela exceptions
CREATE TABLE IF NOT EXISTS public.exceptions (
    id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    is_all_day BOOLEAN NOT NULL DEFAULT false,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Constraint: Se is_all_day = false, start_time e end_time são obrigatórios
ALTER TABLE public.exceptions
ADD CONSTRAINT check_exception_times
CHECK (
    (is_all_day = true) OR 
    (is_all_day = false AND start_time IS NOT NULL AND end_time IS NOT NULL)
);

-- Constraint: end_time deve ser maior que start_time quando is_all_day = false
ALTER TABLE public.exceptions
ADD CONSTRAINT check_exception_time_order
CHECK (
    (is_all_day = true) OR 
    (is_all_day = false AND end_time > start_time)
);

-- Índice para busca rápida por data
CREATE INDEX IF NOT EXISTS idx_exceptions_date 
ON public.exceptions (date);

-- Índice composto para busca por data e horário
CREATE INDEX IF NOT EXISTS idx_exceptions_date_time 
ON public.exceptions (date, start_time, end_time);

-- Habilitar RLS
ALTER TABLE public.exceptions ENABLE ROW LEVEL SECURITY;

-- Policy: Leitura pública (necessário para verificar disponibilidade)
CREATE POLICY "Exceptions are viewable by everyone"
ON public.exceptions
FOR SELECT
USING (true);

-- Policy: Apenas authenticated (Admin) pode criar/atualizar/deletar
CREATE POLICY "Only authenticated users can manage exceptions"
ON public.exceptions
FOR ALL
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');
