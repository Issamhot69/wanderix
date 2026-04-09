# ─────────────────────────────────────────
# WANDERIX — Backend Dockerfile
# NestJS + Node.js 20
# ─────────────────────────────────────────

# Stage 1 — Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
COPY tsconfig*.json ./

# Installer les dépendances
RUN npm ci --only=production=false

# Copier le code source
COPY backend/ ./backend/

# Compiler TypeScript
RUN npm run build

# ─────────────────────────────────────────
# Stage 2 — Production
# ─────────────────────────────────────────

FROM node:20-alpine AS production

WORKDIR /app

# Sécurité — user non-root
RUN addgroup -g 1001 -S wanderix && \
    adduser -S wanderix -u 1001

# Copier uniquement le nécessaire
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./

# Permissions
RUN chown -R wanderix:wanderix /app
USER wanderix

# Variables d'environnement
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/backend/main.js"]