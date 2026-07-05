import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

export default defineConfig({
  site: 'https://evolutionbeautyacademy.com',
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    node({
      mode: 'standalone',
    }),
  ],
  output: 'server',
  compressHTML: true,
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
});
