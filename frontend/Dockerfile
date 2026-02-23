FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

ARG EXPO_PUBLIC_API_URL=http://localhost:8000
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL

RUN npx expo export --platform web

# Stage 2: Nginx para servir o static
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
