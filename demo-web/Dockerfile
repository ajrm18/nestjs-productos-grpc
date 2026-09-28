# Se construye desde la raíz del repo para poder copiar src/productos.proto:
#   docker build -f demo-web/Dockerfile -t productos-demo-web .
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY demo-web/package*.json ./
RUN npm ci --omit=dev
COPY demo-web/server.js ./
COPY demo-web/public ./public
COPY src/productos.proto ./proto/productos.proto
ENV PROTO_PATH=/app/proto/productos.proto \
    PORT=80 \
    GRPC_TARGET=productos-grpc:5000
EXPOSE 80
CMD ["node", "server.js"]
