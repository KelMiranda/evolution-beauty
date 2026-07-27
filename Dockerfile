FROM node:20-alpine AS base
WORKDIR /app

FROM base AS spa-build
WORKDIR /spa
COPY app/package*.json ./
RUN npm ci
COPY app/ .
RUN npm run build

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm exec astro check
COPY --from=spa-build /spa/dist ./public
RUN npm exec astro build

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 4321
CMD ["npm", "start"]
