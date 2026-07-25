import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  site: 'https://evolutionbeautyacademy.com',
  integrations: [
    node({
      mode: 'standalone',
    }),
  ],
  output: 'server',
});
