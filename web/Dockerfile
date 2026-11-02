FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY client/package.json client/package-lock.json ./
RUN npm ci

COPY client/ ./

ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build \
    && if grep -R "localhost:4002" dist; then exit 1; fi

FROM nginx:1.28-bookworm

COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
