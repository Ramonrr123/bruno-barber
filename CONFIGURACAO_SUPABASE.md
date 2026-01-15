# Configuração do Supabase

## Como configurar as variáveis de ambiente

1. Crie um arquivo `.env` na raiz do projeto (mesmo nível do `package.json`)

2. Adicione as seguintes variáveis:

```env
VITE_SUPABASE_URL=https://seu-projeto-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica-aqui
```

## Onde encontrar essas informações no Supabase:

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **API**
4. Você encontrará:
   - **Project URL**: Use como `VITE_SUPABASE_URL`
   - **Project API keys** → **anon/public**: Use como `VITE_SUPABASE_PUBLISHABLE_KEY`

## Exemplo:

```env
VITE_SUPABASE_URL=https://wjqycojnlvvhsdhalxcq.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Importante:

- ⚠️ **NUNCA** commite o arquivo `.env` no Git (já está no .gitignore)
- Após criar/editar o `.env`, **reinicie o servidor de desenvolvimento**
- O arquivo `.env` deve estar na raiz do projeto

## Verificar se está funcionando:

1. Abra o console do navegador (F12)
2. Procure por: "✅ Supabase configurado:"
3. Se aparecer erro, verifique se as variáveis estão corretas
