FROM node:20-alpine
ARG GIT_REVISION=unknown
LABEL org.opencontainers.image.source="https://github.com/Patricked-code/MCP"
LABEL org.opencontainers.image.revision="${GIT_REVISION}"
WORKDIR /app
RUN apk add --no-cache openssh-client
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY .mcp/task-registry.json ./.mcp/task-registry.json
COPY .mcp/identity-policy.json ./.mcp/identity-policy.json
COPY .mcp/server-map.json ./.mcp/server-map.json
COPY .mcp/branch-governance.json ./.mcp/branch-governance.json
COPY docs/governance/program-backlog-convergence.json ./docs/governance/program-backlog-convergence.json
COPY scripts/program-backlog-convergence-lib.mjs ./scripts/program-backlog-convergence-lib.mjs
COPY src ./src
RUN npm run build
ENV NODE_ENV=production
EXPOSE 8787
CMD ["node", "dist/src/index.js"]
