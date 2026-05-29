FROM node:22-slim

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --no-frozen-lockfile

COPY . .
# Prisma necesita una URL durante generate/build; el valor real se inyecta en ejecución.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
ENV SESSION_SECRET="build-only-not-used-at-runtime"
RUN pnpm db:generate && pnpm build

EXPOSE 3000
CMD ["sh", "-c", "pnpm db:deploy && pnpm start"]
