# ---- build: needs the devDependencies (vite) to produce dist/ ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime: only what server.js needs to serve dist/ ----
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server.js ./
EXPOSE 3000
USER node
CMD ["npm", "start"]
