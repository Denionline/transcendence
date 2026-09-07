FROM node:22-alpine

ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

RUN DATABASE_URL="postgresql://user:pass@localhost:5432/db" npx prisma generate

EXPOSE 9000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:9000/health').then(() => process.exit(0)).catch(() => process.exit(1))"

CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx src/server.ts"]
