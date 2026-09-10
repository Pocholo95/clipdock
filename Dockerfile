# ---- Stage 1: build the frontend (PWA) ----
FROM node:22-slim AS web-build
WORKDIR /repo

COPY web/package.json web/package-lock.json web/
RUN cd web && npm ci

COPY web/ web/
RUN cd web && npm run build

# ---- Stage 2: install backend deps (better-sqlite3 needs a C++ toolchain) ----
FROM node:22-slim AS server-deps
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

# ---- Stage 3: runtime (no build tools, stays lean) ----
FROM node:22-slim AS server
WORKDIR /app

COPY --from=server-deps /app/node_modules ./node_modules
COPY server/package.json ./
COPY server/src ./src
COPY --from=web-build /repo/server/web-dist ./web-dist

ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV WEB_DIST=/app/web-dist

VOLUME ["/data"]
EXPOSE 3000

CMD ["node", "src/index.js"]
