-- ============================================
-- SCHEMA COMPLETO - BARBEARIA DO SAPO
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- 1. CONFIGURAÇÃO INICIAL
-- Habilitar extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. TABELA SERVICES (Catálogo de Serviços)
-- ============================================

-- Criar tabela services
CREATE TABLE IF NOT EXISTS public.services (
    id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    duration INTEGER NOT NULL CHECK (duration > 0),
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    description TEXT,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Seed Data: Inserir serviços iniciais (apenas se não existirem)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.services WHERE name = 'Corte Social') THEN
        INSERT INTO public.services (name, duration, price, description, icon) 
        VALUES ('Corte Social', 30, 45.00, 'Corte clássico e elegante para o dia a dia', '✂️');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.services WHERE name = 'Corte Degradê') THEN
        INSERT INTO public.services (name, duration, price, description, icon) 
        VALUES ('Corte Degradê', 40, 55.00, 'Degradê moderno com acabamento perfeito', '💈');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.services WHERE name = 'Combo Sapo') THEN
        INSERT INTO public.services (name, duration, price, description, icon) 
        VALUES ('Combo Sapo', 70, 85.00, 'Cabelo + Barba completa - O pacote premium', '🐸');
    END IF;
END $$;

-- Habilitar RLS na tabela services
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Policy: Leitura pública (Anon)
CREATE POLICY "Services are viewable by everyone"
ON public.services
FOR SELECT
USING (true);

-- Policy: Escrita apenas Admin (Authenticated)
CREATE POLICY "Only authenticated users can insert services"
ON public.services
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Only authenticated users can update services"
ON public.services
FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Only authenticated users can delete services"
ON public.services
FOR DELETE
USING (auth.role() = 'authenticated');

-- ============================================
-- 3. TABELA APPOINTMENTS (Agendamentos)
-- ============================================

-- Criar tabela appointments
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    service_type TEXT NOT NULL,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'blocked', 'no_show')),
    admin_notes TEXT
);

-- ============================================
-- 4. CONSTRAINTS E VALIDAÇÕES
-- ============================================

-- Garantir que end_time seja sempre maior que start_time
ALTER TABLE public.appointments
ADD CONSTRAINT check_time_order
CHECK (end_time > start_time);

-- Garantir que appointment_date não seja no passado (opcional, pode remover se necessário)
-- ALTER TABLE public.appointments
-- ADD CONSTRAINT check_future_date
-- CHECK (appointment_date >= CURRENT_DATE);

-- ============================================
-- 5. SEGURANÇA (RLS POLICIES)
-- ============================================

-- Habilitar RLS na tabela appointments
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Policy: INSERT - Permitir que role anon (público) crie agendamentos
CREATE POLICY "Anyone can create appointments"
ON public.appointments
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Policy: SELECT - Permitir que role anon leia agendamentos
CREATE POLICY "Anyone can view appointments"
ON public.appointments
FOR SELECT
TO anon, authenticated
USING (true);

-- Policy: UPDATE - Permitir APENAS para role authenticated (Admin)
CREATE POLICY "Only authenticated users can update appointments"
ON public.appointments
FOR UPDATE
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Policy: DELETE - Permitir APENAS para role authenticated (Admin)
CREATE POLICY "Only authenticated users can delete appointments"
ON public.appointments
FOR DELETE
TO authenticated
USING (auth.role() = 'authenticated');

-- ============================================
-- 6. PERFORMANCE (ÍNDICES)
-- ============================================

-- Índice para otimizar busca por telefone do cliente
CREATE INDEX IF NOT EXISTS idx_appointments_client_phone 
ON public.appointments (client_phone);

-- Índice para otimizar busca por data e status (usado na verificação de disponibilidade)
CREATE INDEX IF NOT EXISTS idx_appointments_date_status 
ON public.appointments (appointment_date, status);

-- Índice para otimizar busca por data e horário (usado na verificação de conflitos)
CREATE INDEX IF NOT EXISTS idx_appointments_date_time 
ON public.appointments (appointment_date, start_time, end_time);

-- Índice para otimizar busca por status
CREATE INDEX IF NOT EXISTS idx_appointments_status 
ON public.appointments (status);

-- Índice composto para busca de agendamentos futuros do cliente
CREATE INDEX IF NOT EXISTS idx_appointments_client_future 
ON public.appointments (client_phone, appointment_date, status) 
WHERE status IN ('confirmed', 'scheduled');

-- ============================================
-- 7. FUNÇÕES AUXILIARES (Opcional)
-- ============================================

-- Função para atualizar updated_at automaticamente (se necessário no futuro)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at em services
CREATE TRIGGER update_services_updated_at 
BEFORE UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. VERIFICAÇÃO FINAL
-- ============================================

-- Verificar estrutura das tabelas
SELECT 
    'services' as tabela,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'services'
ORDER BY ordinal_position;

SELECT 
    'appointments' as tabela,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'appointments'
ORDER BY ordinal_position;

-- Verificar índices criados
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('services', 'appointments')
ORDER BY tablename, indexname;

-- Verificar políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('services', 'appointments')
ORDER BY tablename, policyname;
