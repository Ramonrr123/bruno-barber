# 🚀 Comandos para Deploy no Servidor

## 1. Conectar ao servidor via SSH
```bash
ssh lavrasul@lavrasul
```

## 2. Navegar para o diretório do projeto
```bash
cd app_barber
```

## 3. Atualizar o código do repositório
```bash
git pull origin main
```

## 4. Verificar/criar arquivo .env (se necessário)
```bash
# Ver o conteúdo atual
cat .env

# Editar se precisar (usar nano ou vim)
nano .env
```

**Importante:** Certifique-se de que o `.env` contém:
```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-key
```

## 5. Parar os containers atuais
```bash
docker-compose down
```

## 6. Rebuild e iniciar os containers
```bash
docker-compose up --build -d
```

## 7. Verificar logs (opcional, mas recomendado)
```bash
# Ver logs em tempo real
docker-compose logs -f

# Ou ver logs da última vez
docker-compose logs --tail=100
```

## 8. Verificar status dos containers
```bash
docker-compose ps
```

## ⚠️ IMPORTANTE: Executar Migration no Supabase

Após o deploy, você **DEVE** executar a migration SQL no Supabase:

1. Acesse o **Supabase Dashboard** → SQL Editor
2. Execute o arquivo: `supabase/migrations/20260117000004_create_business_settings.sql`
3. Depois, atualize as URLs com seus dados reais:

```sql
UPDATE public.business_settings
SET 
  whatsapp_url = 'https://wa.me/5511999999999',  -- Substitua pelo seu número
  instagram_url = 'https://instagram.com/seu_perfil'  -- Substitua pelo seu Instagram
WHERE id = (SELECT id FROM public.business_settings LIMIT 1);
```

## 🔍 Troubleshooting

Se houver problemas:

1. **Verificar se o Docker está rodando:**
   ```bash
   docker ps
   ```

2. **Limpar containers e volumes (CUIDADO: isso remove dados):**
   ```bash
   docker-compose down -v
   docker-compose up --build -d
   ```

3. **Ver erros específicos:**
   ```bash
   docker-compose logs [nome-do-servico]
   ```

4. **Verificar se a porta está disponível:**
   ```bash
   netstat -tuln | grep 80
   ```

## ✅ Verificação Final

Após o deploy:
- Acesse o site no navegador
- Verifique se o Footer aparece no final da página
- Confirme que os ícones sociais aparecem (se as URLs estiverem configuradas)
