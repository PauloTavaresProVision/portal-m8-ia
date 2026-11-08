FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production SERVIDOR=1
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY . .
RUN mkdir -p data && chown -R node:node data config
USER node
EXPOSE 3000
CMD ["node", "server.js"]
