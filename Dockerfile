FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
ENV NODE_ENV=production
EXPOSE 8787
CMD ["node", "dist/src/index.js"]
