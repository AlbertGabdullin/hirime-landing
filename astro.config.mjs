// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://hirime.com',
  output: 'static',
  adapter: vercel(),
  // Alias the conventional /sitemap.xml path to the generated sitemap index,
  // since some crawlers/tools probe /sitemap.xml directly.
  redirects: {
    '/sitemap.xml': '/sitemap-index.xml',
  },
  integrations: [
    react(),
    sitemap({
      lastmod: new Date(),
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en-US',
          es: 'es-ES',
          fr: 'fr-FR',
        },
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'fr'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
