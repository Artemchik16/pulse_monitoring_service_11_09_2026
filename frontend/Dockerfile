# syntax=docker/dockerfile:1

### Build: static bundle ###
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

COPY . .
# Empty: the API is served from the same origin (nginx proxies /api)
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build


### Runtime: nginx as a non-root user, no Node, no sources ###
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
