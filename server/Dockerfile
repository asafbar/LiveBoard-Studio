FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
    && node -e "require('sharp')"

COPY . .

RUN chown -R node:node /app

USER node

ENV NODE_ENV=production
ENV PORT=4002

EXPOSE 4002

CMD ["node", "src/server.js"]
