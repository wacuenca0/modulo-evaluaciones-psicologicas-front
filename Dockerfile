# Build stage: compila la app Angular (SSR)
FROM node:20-alpine AS build

WORKDIR /app

# Instalar dependencias
COPY package.json .
RUN npm install

# Copiar el resto del código fuente y construir
COPY . .
RUN npm run build

# Runtime stage: ejecuta el servidor Node SSR
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

# Solo dependencias necesarias en runtime
COPY package.json .
RUN npm install --omit=dev

# Copiar artefactos compilados
COPY --from=build /app/dist ./dist

# Puerto interno del servidor SSR (ver src/server.ts)
ENV PORT=4000
EXPOSE 4000

CMD ["node", "dist/modulo-evaluaciones-psicoogicas-front/server/server.mjs"]
