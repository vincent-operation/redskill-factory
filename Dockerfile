# ─── Build Stage ───────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ─── Server Stage ───────────────────────────────
FROM node:22-alpine AS server

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY templates/ ./templates/
COPY web/dist/ ./web/dist/

ENV NODE_ENV=production
ENV RFS_SERVER_PORT=3001

EXPOSE 3001
CMD ["node", "dist/server/index.js"]
