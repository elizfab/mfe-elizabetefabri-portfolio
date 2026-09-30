# Imagem do portfólio MFE: shell + todos os remotes na mesma origem, servidos pelo nginx.
#   /                          → shell
#   /remotes/<remote>/         → cada remote (remoteEntry.js + chunks)
#   /mf.manifest.json          → gerado no build apontando para /remotes/<remote>/remoteEntry.js
# Uso: docker run -p 8080:80 ghcr.io/elizfab/mfe-elizabetefabri-portfolio:latest

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NX_DAEMON=false NX_NO_CLOUD=true CI=true
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npx nx run-many -t build --projects='tag:type:app' --configuration=production \
 && node docker/assemble.mjs dist/apps /site

FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /site /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK CMD wget -qO- http://localhost/ >/dev/null || exit 1
