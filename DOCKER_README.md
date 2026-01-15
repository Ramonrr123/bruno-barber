# 🐳 Docker - Guia de Deploy

Este guia explica como construir e executar a aplicação Barbearia do Sapo usando Docker.

## 📋 Pré-requisitos

- Docker instalado (versão 20.10+)
- Docker Compose instalado (opcional, mas recomendado)
- Variáveis de ambiente do Supabase

## 🚀 Build e Execução

### Opção 1: Docker Compose (Recomendado)

1. **Criar arquivo `.env` na raiz do projeto:**
```bash
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-key
```

2. **Build e executar:**
```bash
docker-compose up --build -d
```

3. **Acessar a aplicação:**
```
http://localhost
```

### Opção 2: Docker CLI

1. **Build da imagem:**
```bash
docker build \
  --build-arg VITE_SUPABASE_URL=https://seu-projeto.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=sua-chave-anon-key \
  -t app-barber:latest .
```

2. **Executar container:**
```bash
docker run -d \
  -p 80:80 \
  --name app-barber \
  --restart unless-stopped \
  app-barber:latest
```

3. **Acessar a aplicação:**
```
http://localhost
```

## 🔧 Comandos Úteis

### Ver logs
```bash
docker-compose logs -f app
# ou
docker logs -f app-barber
```

### Parar container
```bash
docker-compose down
# ou
docker stop app-barber
```

### Rebuild após mudanças
```bash
docker-compose up --build -d
```

### Remover tudo (containers, imagens, volumes)
```bash
docker-compose down -v --rmi all
```

## 📝 Variáveis de Ambiente

As variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` são passadas como **build args** e são "queimadas" no código durante o build. Isso significa que:

- ✅ As variáveis são embutidas no HTML/JS final
- ✅ Não é necessário passar variáveis em runtime
- ✅ A aplicação funciona como um SPA estático

## 🌐 Nginx

O Nginx está configurado para:
- ✅ Escutar na porta 80
- ✅ Suportar rotas do React Router (`try_files`)
- ✅ Comprimir assets (gzip)
- ✅ Cache de arquivos estáticos
- ✅ Headers de segurança

## 🐛 Troubleshooting

### Porta 80 já em uso
Se a porta 80 estiver ocupada, altere no `docker-compose.yml`:
```yaml
ports:
  - "8080:80"  # Acesse em http://localhost:8080
```

### Variáveis não funcionam
Certifique-se de passar as variáveis como `--build-arg` durante o build, não como `ENV` em runtime.

### Rotas não funcionam ao recarregar
Verifique se o `nginx.conf` tem a linha:
```nginx
try_files $uri $uri/ /index.html;
```

## 📦 Estrutura

```
.
├── Dockerfile              # Multi-stage build
├── docker-compose.yml      # Orquestração
├── nginx.conf              # Configuração do Nginx
├── .dockerignore           # Arquivos ignorados no build
└── DOCKER_README.md       # Este arquivo
```
