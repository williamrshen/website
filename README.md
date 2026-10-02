# William Shen — the garden portfolio

A React + TypeScript port of the isometric oak-grove mockup. Built with Vite, CSS Modules, and the Canvas 2D API. All fonts, artwork, and interactions run locally; there are no CDN assets, analytics, external APIs, or photo uploads.

## Run locally

Requires Node.js 22.12 or newer.

```sh
npm install
npm run dev
```

Open the localhost URL printed by Vite. No sharing service or deployment is needed.

## Experience

- Full-screen voxel garden with circular grid fades and a cursor-local glow.
- Scrolling shrinks the garden into a leaf-green navigation bar. The centered wordmark moves left, the menu appears on the right, and the daylight/evening toggle moves from beside the name to the far right.
- Portrait and introduction follow the garden; selected projects follow the introduction.
- Daylight/evening palettes, pollen/fireflies, native project/info dialogs, and responsive mobile layouts.
- Reduced-motion support, keyboard navigation, and a skip-to-introduction link. Hidden navigation is inert until revealed.
- Canvas animation pauses when the garden is collapsed or the browser tab is hidden. Event listeners, animation frames, resize observers, and local photo URLs are cleaned up on unmount, including React Strict Mode development remounts.

## Project structure

```text
src/
  main.tsx                         React entry point and Strict Mode
  App.tsx                          Page composition, theme and dialog state
  App.module.css                   Page-level grain and skip link
  index.css                        Global reset, theme tokens, motion defaults
  assets/                          Local portrait placeholder and project SVGs
  components/
    GardenExperience.tsx           Garden, animated header, theme toggle, cursor
    About.tsx                      Portrait-and-introduction section
    Portrait.tsx                   Configured portrait or local-only photo picker
    ProjectSection.tsx             Data-driven selected-project cards
    StoryDialog.tsx                Native modal with focus return / Escape support
    Footer.tsx                     Closing copy
    Logo.tsx                       Isometric cube wordmark icon
    *.module.css                   Styles scoped to each component
  data/
    portfolio.ts                   Profile settings, projects, and dialog copy
  garden/
    scene.ts                       Seeded world generation and canvas renderer
  hooks/
    useGardenExperience.ts         Scroll morph, cursor, media queries, lifecycle
public/
  portfolio-mark.svg               Local cube favicon
tests/
  portfolio.spec.ts                Browser checks for layout and interactions
playwright.config.ts               Local-only browser test server
index.html                         Page title, description, and favicon
vite.config.ts                     Vite + React plugin
```

### Customize content

- **Name, projects, and dialog copy:** edit `src/data/portfolio.ts`. The project descriptions, field notes, and contact dialog are still mock content.
- **Introduction:** edit `src/components/About.tsx`.
- **Permanent portrait:** add your photo to `src/assets/`, import it in `src/data/portfolio.ts`, and set `profile.portraitSrc` to that import. A nonempty value hides the preview picker. Alternatively, place a file in `public/` and use its root-relative path.
- **Try a portrait first:** use **Add your photo**. It creates a browser-local object URL, never uploads the image, and resets on reload.
- **Colors and dimensions:** edit the CSS custom properties in `src/index.css`; component-specific layout lives alongside each component.
- **Garden shapes and placement:** edit `src/garden/scene.ts`. Its seeded random generator keeps the landscape stable across mounts and resizes.
- **Scroll choreography:** edit `src/hooks/useGardenExperience.ts` and `GardenExperience.module.css`. Frame-by-frame updates go straight to CSS variables and canvas rather than triggering React renders.

## Checks

```sh
npm run lint        # Oxlint
npm run build       # TypeScript checks + production build in dist/
npm run preview     # Serve the production build locally
```

Browser tests automatically start and stop a Vite server bound to `127.0.0.1:4173`:

```sh
npx playwright install chromium  # One-time browser installation
npm run test:e2e
```

To use an existing local Chrome installation instead:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome npm run test:e2e
```

The tests cover the reversible scroll transition, header positioning at desktop and mobile widths, theme toggle, localized cursor glow, live reduced-motion preference changes, dialog focus return, and local-only portrait preview. Screenshots and failure traces are written to the ignored `test-results/` directory.
