# Baut das Backend aus dem Repo-Wurzelverzeichnis: docker build -f backend/Dockerfile .
FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /srv
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY packages/contracts/package.json packages/contracts/
RUN npm ci --omit=dev --workspace backend --include-workspace-root=false
COPY packages/contracts packages/contracts
COPY backend backend
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1:8080/health || exit 1
CMD ["node", "--import", "tsx", "backend/src/server.ts"]
