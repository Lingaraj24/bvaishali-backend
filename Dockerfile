# ─────────────────────────────────────────────────────────
# Stage 1 — deps: install everything (needs devDeps to build)
# ─────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ─────────────────────────────────────────────────────────
# Stage 2 — builder: compile TypeScript + generate Prisma
# ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# ─────────────────────────────────────────────────────────
# Stage 3 — runner: lean production image (no devDeps)
# ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

# Run as non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3001

# Migrate DB then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
