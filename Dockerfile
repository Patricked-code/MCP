FROM node:20-alpine
ARG GIT_REVISION=unknown
LABEL org.opencontainers.image.source="https://github.com/Patricked-code/MCP"
LABEL org.opencontainers.image.revision="${GIT_REVISION}"
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
ENV NODE_ENV=production
EXPOSE 8787
CMD ["node", "dist/src/index.js"]
