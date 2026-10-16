# Ladeklar – production image (no npm dependencies at runtime)
FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY core ./core
COPY server ./server
COPY web ./web
RUN mkdir -p /data && chown -R node:node /data
ENV NODE_ENV=production PORT=8080 DATA_DIR=/data TRUST_PROXY=1
VOLUME ["/data"]
EXPOSE 8080
USER node
HEALTHCHECK --interval=30s --timeout=4s CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1
CMD ["node", "--disable-warning=ExperimentalWarning", "server/index.js"]
