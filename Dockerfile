FROM node:20-alpine AS base
WORKDIR /app

FROM base AS spa-build
WORKDIR /spa
ARG VITE_TURNSTILE_SITEKEY=
ENV VITE_TURNSTILE_SITEKEY=$VITE_TURNSTILE_SITEKEY
COPY app/package*.json ./
RUN npm ci
COPY app/ .
RUN npm run build

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM base AS build
# Increase Node's heap to 4 GB so the Astro SPA + backend build
# (which bundles the SPA and re-runs Astro type-checks) doesn't run
# out of memory on the CI runner. The same applies to the runtime
# image in case any startup code needs more than the default ~1.7 GB.
ENV NODE_OPTIONS=--max-old-space-size=6144
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY --from=spa-build /spa/dist ./public
RUN npm exec astro check
RUN npm exec astro build

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 4321
# Force HOST=0.0.0.0 in the CMD. Some versions of @astrojs/node standalone
# ignore the HOST env var and bind only to 127.0.0.1; setting it via sh -c
# in the CMD (not just in the ENV) ensures the variable reaches the node
# process at the right time.
CMD ["sh", "-c", "HOST=0.0.0.0 PORT=4321 node ./dist/server/entry.mjs"]
