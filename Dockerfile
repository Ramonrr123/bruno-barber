# ============================================
# Estágio 1: Build da aplicação
# ============================================
FROM node:18-alpine AS builder

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package.json package-lock.json* ./

# Instalar dependências (npm ci é mais rápido e determinístico)
RUN npm ci --only=production=false

# Copiar o resto dos arquivos do projeto
COPY . .

# Aceitar argumentos de build para variáveis de ambiente do Vite
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Transformar ARGs em ENV para que o Vite possa acessá-los durante o build
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}

# Build da aplicação
# As variáveis VITE_* serão "queimadas" no código HTML/JS final
RUN npm run build

# ============================================
# Estágio 2: Servidor Nginx (Produção)
# ============================================
FROM nginx:alpine AS production

# Copiar os arquivos buildados do estágio anterior
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuração customizada do nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expor porta 80
EXPOSE 80

# Comando padrão do nginx (já está no container base)
CMD ["nginx", "-g", "daemon off;"]
