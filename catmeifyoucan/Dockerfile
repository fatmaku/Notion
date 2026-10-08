# Cat Me If You Can – Container für den Server (Node ohne Framework).
#
# Gebaut wird von deploy/docker-compose.yml aus (deploy/kur.sh). Von Hand:
#   docker build -t catmeifyoucan .
#   docker run -p 8790:8790 -v catme-data:/data catmeifyoucan
#
# Ins Image kommt nur, was läuft: server.js, server/, public/, package*.json und die
# Produktions-Abhängigkeiten (nur das optionale @anthropic-ai/sdk). Keine Tests, kein Trailer-/
# Marketing-Code, keine Daten – .dockerignore lässt ohnehin nur diese Dateien in den Build.

# ---- Abhängigkeiten (ohne devDependencies; optionale wie @anthropic-ai/sdk bleiben drin)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund \
 && npm cache clean --force
# npm überspringt optionale Pakete still, wenn der Download scheitert. Dann liefe der Server ohne
# Claude-Analyse, obwohl ein Key gesetzt ist – lieber hier laut abbrechen (Build einfach wiederholen).
RUN node -e "import('@anthropic-ai/sdk').then(()=>console.log('@anthropic-ai/sdk ok'),()=>{console.error('FEHLER/HATA: @anthropic-ai/sdk fehlt (npm-Registry nicht erreichbar?) – Build wiederholen / tekrar deneyin');process.exit(1)})"

# ---- Laufzeit
FROM node:22-alpine
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8790 \
    CATME_DATA=/data
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json server.js ./
COPY server ./server
COPY public ./public

# Datenordner gehört dem Benutzer „node“ (uid 1000, ohne root-Rechte). Ein neues benanntes
# Docker-Volume übernimmt beim ersten Einhängen diesen Besitzer.
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 8790

# Gesundheitsprüfung mit Node selbst (kein curl/wget im Image nötig)
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "require('http').get({host:'127.0.0.1',port:process.env.PORT||8790,path:'/api/health',timeout:4000},r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1)).on('timeout',function(){this.destroy();process.exit(1)})"]

# server.js beendet sich bei SIGTERM sauber (Journal wird verdichtet). Node läuft direkt als
# Hauptprozess (exec-Form), damit das Signal ankommt; docker-compose setzt zusätzlich init: true.
CMD ["node", "server.js"]
