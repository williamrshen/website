# William Shen — the garden portfolio

The personal site of William Shen (uselessleaf), built for [williamrshen.com](https://williamrshen.com). Built with React, TypeScript, Vite, CSS Modules, and the Canvas 2D API. All fonts, artwork, and interactions run locally; there are no CDN assets, analytics, or external APIs.

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
- Canvas animation pauses when the garden is collapsed or the browser tab is hidden. Event listeners, animation frames, and resize observers are cleaned up on unmount, including React Strict Mode development remounts.

## Project structure

```text
src/
  main.tsx                         React entry point and Strict Mode
  App.tsx                          Page composition, theme and dialog state
  App.module.css                   Page-level grain and skip link
  index.css                        Global reset, theme tokens, motion defaults
  assets/                          Portrait and project SVGs
  components/
    GardenExperience.tsx           Garden, animated header, theme toggle, cursor
    About.tsx                      Portrait-and-introduction section
    Portrait.tsx                   Introduction portrait
    ProjectSection.tsx             Data-driven selected-project cards
    StoryDialog.tsx                Native modal with focus return / Escape support
    Footer.tsx                     Closing copy
    Logo.tsx                       Isometric cube wordmark icon
    *.module.css                   Styles scoped to each component
  data/
    profile.ts                     Name, alias, portrait, introduction, Currently list
    portfolio.ts                   Projects and dialog copy
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

- **Name, alias, introduction, Currently list, and portrait:** edit `src/data/profile.ts`. The introduction headline lives in `src/components/About.tsx`.
- **Portrait image:** replace `src/assets/portrait.jpg` (currently 1000 × 1162, cropped from the old site's photo with metadata removed). Keep a similar portrait aspect ratio or adjust `object-position` in `Portrait.module.css`.
- **Projects and dialog copy:** edit `src/data/portfolio.ts`.
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

The tests cover the reversible scroll transition, header positioning at desktop and mobile widths, theme toggle, localized cursor glow, live reduced-motion preference changes, dialog focus return, and introduction content. Screenshots and failure traces are written to the ignored `test-results/` directory.
