# Evolution Beauty Academy — Sitio Web

Migración del sitio de Framer a un proyecto propio con **Astro + TailwindCSS + TypeScript**, optimizado para performance y SEO (Lighthouse 95+).

## Stack

- [Astro](https://astro.build) — generador de sitio estático
- [TailwindCSS](https://tailwindcss.com) — utilidades de estilos
- TypeScript — tipado en componentes interactivos

## Estructura del proyecto

```
src/
  components/
    Header.astro          Navegación sticky + menú móvil
    Hero.astro             Sección principal con CTA
    Features.astro         3 propuestas de valor
    Stats.astro             Banda de estadísticas (500+, 5 años, 98%, 12 cursos)
    Programs.astro          Las 4 tarjetas de cursos
    Testimonials.astro      Testimonios de graduados
    Contact.astro            Formulario de inscripción
    Footer.astro              Pie de página
    SectionHeading.astro     Encabezado reutilizable (eyebrow + título)
  layouts/
    BaseLayout.astro         <head>, meta SEO, Open Graph, JSON-LD
  pages/
    index.astro               Ensambla todas las secciones
  styles/
    global.css                 Tokens de diseño, fuentes, animaciones
public/
  favicon.svg
  robots.txt
```

## Sistema de diseño

| Token | Valor | Uso |
|---|---|---|
| `cream` | `#FAF8F5` | Fondo principal |
| `ink` | `#161412` | Texto, fondos oscuros (Stats, Footer) |
| `sand` | `#D8CDBD` | Superficies secundarias |
| `gold` | `#A88A5C` | Acento único (CTAs, eyebrows, ★) |

Tipografía: **Fraunces** (display/serif editorial) + **Inter** (cuerpo/UI).

## Comandos

```bash
npm install       # instalar dependencias
npm run dev        # servidor local (localhost:4321)
npm run build       # build de producción + chequeo de tipos
npm run preview      # previsualizar el build
```

## Pendientes antes de producción

1. **Imágenes**: actualmente usa imágenes de stock de Unsplash como placeholder. Reemplázalas con fotos reales de la academia en `Hero.astro` y `Programs.astro`.
2. **Formulario**: el formulario de inscripción (`Contact.astro`) solo simula el envío. Conéctalo a un backend real (Formspree, API route propia, n8n, etc.) en el bloque `<script>` al final del componente.
3. **Datos de contacto**: el teléfono `+503 0000-0000` y el correo son placeholders — actualízalos en `Footer.astro` y `BaseLayout.astro` (structured data).
4. **Dominio**: actualiza `site` en `astro.config.mjs` con el dominio real al desplegar.
5. **OG image**: agrega una imagen real en `public/images/og-cover.jpg` (1200×630px) para que las vistas previas en redes sociales se vean bien.

## Despliegue

Compatible con Vercel, Netlify, Cloudflare Pages o cualquier hosting estático. `npm run build` genera la carpeta `dist/` lista para subir.
