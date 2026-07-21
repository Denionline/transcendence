FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci
COPY . .

EXPOSE 5173

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:5173').then(() => process.exit(0)).catch(() => process.exit(1))"

CMD ["npm", "run", "dev"]
