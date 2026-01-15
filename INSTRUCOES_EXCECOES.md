# 📅 Instruções - Sistema de Exceções de Agenda

## ⚠️ IMPORTANTE: Execute a Migration Primeiro

O erro 404 que você está vendo é porque a tabela `schedule_overrides` ainda não foi criada no banco de dados.

## 🚀 Como Resolver

### 1. Acesse o Supabase SQL Editor

1. Vá para o seu projeto no Supabase
2. Clique em **SQL Editor** no menu lateral
3. Clique em **New Query**

### 2. Execute a Migration

Copie e cole o conteúdo do arquivo:
```
supabase/migrations/20260116000000_create_schedule_overrides.sql
```

Ou execute diretamente este SQL:

```sql
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
ADD CONSTRAINT check_time_order_override
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

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_schedule_overrides_updated_at 
BEFORE UPDATE ON public.schedule_overrides
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

### 3. Clique em "Run" ou pressione Ctrl+Enter

### 4. Verifique se funcionou

Você deve ver a mensagem: "Success. No rows returned"

### 5. Recarregue a aplicação

Após executar a migration, recarregue a página da aplicação. O erro 404 deve desaparecer e os dias da semana devem aparecer abertos corretamente.

## ✅ Após Executar a Migration

- ✅ O erro 404 não aparecerá mais
- ✅ Os dias da semana (Segunda a Sábado) aparecerão como abertos
- ✅ Você poderá criar exceções no calendário do Admin
- ✅ O sistema funcionará normalmente

## 🔍 Verificação

Para verificar se a tabela foi criada, execute no SQL Editor:

```sql
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'schedule_overrides';
```

Se retornar uma linha, a tabela foi criada com sucesso!
