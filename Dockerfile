# ---------- Etapa 1: build (compila TypeScript -> dist/) ----------
FROM node:22-slim AS build
WORKDIR /app

# Primero solo los manifiestos: así Docker cachea `npm ci`
# y no reinstala todo cuando cambias código fuente.
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- Etapa 2: runtime (imagen final, liviana) ----------
FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
# Solo dependencias de producción (sin vitest, oxlint, @nestjs/cli, etc.)
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 9000
USER node
CMD ["node", "dist/main.js"]
