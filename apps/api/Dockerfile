# docker build -f apps/api/Dockerfile .
FROM node:20-bookworm-slim
WORKDIR /app
RUN corepack enable pnpm
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps ./apps
RUN pnpm install --frozen-lockfile \
  && pnpm --filter api exec prisma generate \
  && pnpm --filter api build
WORKDIR /app/apps/api
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/main.js"]
