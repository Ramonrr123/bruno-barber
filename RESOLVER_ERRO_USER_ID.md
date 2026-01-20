# 🔧 Como Resolver: Erro "user_id column not found"

## ⚠️ Problema

Você está vendo o erro: **"Could not find the 'user_id' column of 'services' in the schema cache"**

Isso acontece porque a coluna `user_id` ainda não foi adicionada à tabela `services` no banco de dados.

## ✅ Solução: Executar a Migration

### Passo 1: Acessar o Supabase

1. Acesse: https://supabase.com
2. Faça login e selecione o projeto do app_barber

### Passo 2: Abrir o SQL Editor

1. Menu lateral → **"SQL Editor"**
2. Clique em **"New Query"**

### Passo 3: Executar a Migration

Cole e execute este código SQL:

```sql
-- Adicionar coluna title (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'services' 
        AND column_name = 'title'
    ) THEN
        ALTER TABLE public.services 
        ADD COLUMN title TEXT;
        
        -- Preencher title com name existente
        UPDATE public.services 
        SET title = name 
        WHERE title IS NULL;
        
        -- Tornar title NOT NULL após preencher
        ALTER TABLE public.services 
        ALTER COLUMN title SET NOT NULL;
    END IF;
END $$;

-- Adicionar coluna user_id (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'services' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.services 
        ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        
        -- Preencher user_id com o primeiro usuário autenticado (para dados existentes)
        -- Se você tem apenas um usuário, isso vai funcionar
        DO $$
        DECLARE
            first_user_id UUID;
        BEGIN
            SELECT id INTO first_user_id 
            FROM auth.users 
            LIMIT 1;
            
            IF first_user_id IS NOT NULL THEN
                UPDATE public.services 
                SET user_id = first_user_id 
                WHERE user_id IS NULL;
            END IF;
        END $$;
        
        -- Atualizar políticas RLS
        DROP POLICY IF EXISTS "Only authenticated users can insert services" ON public.services;
        DROP POLICY IF EXISTS "Only authenticated users can update services" ON public.services;
        DROP POLICY IF EXISTS "Only authenticated users can delete services" ON public.services;
        
        -- Criar novas políticas com user_id
        CREATE POLICY "Users can insert their own services"
        ON public.services
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY "Users can update their own services"
        ON public.services
        FOR UPDATE
        TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY "Users can delete their own services"
        ON public.services
        FOR DELETE
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_services_user_id 
ON public.services (user_id);
```

### Passo 4: Executar

1. Clique em **"Run"** ou pressione `Ctrl + Enter`
2. Aguarde alguns segundos

### Passo 5: Verificar

Execute esta query para confirmar:

```sql
-- Verificar colunas da tabela services
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'services'
ORDER BY ordinal_position;
```

Você deve ver `title` e `user_id` na lista.

### Passo 6: Testar no App

1. Recarregue a página do app (F5)
2. Tente criar um serviço novamente
3. O erro deve desaparecer! 🎉

---

## 🔄 Alternativa: Criar Serviço Sem user_id (Temporário)

Se você quiser criar serviços enquanto a migration não é executada, o código já foi atualizado para funcionar sem `user_id`. Mas é recomendado executar a migration para ter a funcionalidade completa de multi-usuário.

---

## ❌ Se Ainda Der Erro

### Erro: "relation already exists"
- Significa que a coluna já existe - está tudo certo!

### Erro: "permission denied"
- Você precisa estar logado como admin do projeto
- Verifique suas permissões no Supabase

### Erro: "syntax error"
- Verifique se copiou todo o código corretamente
- Tente copiar linha por linha

---

**Depois de executar a migration, o sistema vai funcionar perfeitamente!** ✅
