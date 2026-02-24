FROM node:20-alpine AS builder

WORKDIR /app

# Cache de dependências (só reinstala se package.json mudar)
COPY package*.json ./
RUN npm install --legacy-peer-deps --prefer-offline

# Código fonte
COPY . .

ARG EXPO_PUBLIC_API_URL=http://localhost:8000
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
# Mais memória para o bundler do Node
ENV NODE_OPTIONS="--max-old-space-size=2048"
ENV NODE_ENV=production

RUN npx expo export --platform web

# Stage 2: Nginx leve
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
