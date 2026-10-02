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
- Portrait and introduction follow the garden, then work experience, selected projects, and hobbies. Card sections show three items and expand to show the rest.
- The hobbies section is a skeleton using a static sample of the old site's stats; nothing refreshes automatically.
- Daylight/evening palettes, pollen/fireflies, native project/info dialogs, and responsive mobile layouts.
- Reduced-motion support, keyboard navigation, and a skip-to-introduction link. Hidden navigation is inert until revealed.
- Canvas animation pauses when the garden is collapsed or the browser tab is hidden. Event listeners, animation frames, and resize observers are cleaned up on unmount, including React Strict Mode development remounts.

## Routing

The site is a single page at `/`. Navigation uses in-page anchors (`#about`, `#experience`, `#work`, `#hobbies`), and dialogs open without changing the URL.

Every other path, including the old site's `/hobbies`, `/coding`, and `/blog`, shows `404.html` with a real `404` status:

- **Vercel:** serves `dist/404.html` automatically for unmatched paths. Do not add a catch-all rewrite to `vercel.json`, or unknown URLs will return the homepage with status 200 instead.
- **Local dev and preview:** `vite.config.ts` uses `appType: 'mpa'` plus a small plugin that serves the same page with status 404, matching production.

## Project structure

```text
src/
  main.tsx                         React entry point and Strict Mode
  not-found.tsx                    Entry point for the 404 page
  App.tsx                          Page composition, theme and dialog state
  App.module.css                   Page-level grain and skip link
  index.css                        Global reset, theme tokens, motion defaults
  assets/                          Portrait, project SVGs, and hobbies/ icons
  components/
    GardenExperience.tsx           Garden, animated header, theme toggle, cursor
    About.tsx                      Portrait-and-introduction section
    Portrait.tsx                   Introduction portrait
    CardSection.tsx                Experience/project cards with show-all control
    HobbySection.tsx               Hobby tiles with headline stats
    Sparkline.tsx                  Small SVG rating-history chart
    DetailDialog.tsx               Native modal for bullets, tags, stats, and links
    ContactIcon.tsx                Email, LinkedIn, and GitHub icons
    Footer.tsx                     Soli deo gloria, 2 Corinthians 12:9, sign-off
    Logo.tsx                       Isometric cube wordmark icon
    NotFound.tsx                   “Nothing's grown here yet” 404 page
    *.module.css                   Styles scoped to each component
  data/
    profile.ts                     Name, alias, portrait, introduction, Currently list
    experience.ts                  Roles shown in “Where I've worked”
    projects.ts                    Projects shown in “A few things I've grown”
    hobbies.ts                     Static sample hobby stats and blurbs
    contact.ts                     Email, LinkedIn, and GitHub for “Say hello”
    portfolio.ts                   Field notes dialog copy
    types.ts                       Shared card and dialog types
  garden/
    scene.ts                       Seeded world generation and canvas renderer
  hooks/
    useGardenExperience.ts         Scroll morph, cursor, media queries, lifecycle
public/
  portfolio-mark.svg               Local cube favicon
  resume.pdf                       Résumé, served at /resume.pdf
tests/
  portfolio.spec.ts                Browser checks for layout and interactions
playwright.config.ts               Local-only browser test server
index.html                         Page title, description, and favicon
404.html                           Not-found page shell (noindex)
vite.config.ts                     Vite + React, 404 build entry, local 404 handling
```

### Customize content

- **Name, alias, introduction, Currently list, and portrait:** edit `src/data/profile.ts`. The introduction headline lives in `src/components/About.tsx`.
- **Portrait image:** replace `src/assets/portrait.jpg` (currently 1000 × 1162, cropped from the old site's photo with metadata removed). Keep a similar portrait aspect ratio or adjust `object-position` in `Portrait.module.css`.
- **Work experience:** edit `src/data/experience.ts`. Roles are listed newest first; the Geotab entry is a placeholder. Cards currently use company monograms until artwork is chosen.
- **Projects:** edit `src/data/projects.ts`. The first three appear before expanding. Cards rotate through placeholder icons until project artwork is chosen.
- **Hobbies:** edit `src/data/hobbies.ts`. It is a one-time copy of the old site's Oct 2, 2026 stats snapshot, with histories downsampled to 36 points. The table tennis entry has no profile link because the old link pointed to a raw API.
- **Résumé:** replace `public/resume.pdf`. It is served at the stable URL `/resume.pdf`, and the introduction's **Résumé** link downloads it as `William Shen - Resume.pdf` (set in `src/data/profile.ts`). The current file is the old site's PDF, unchanged, and includes your phone number.
- **Contact links:** edit `src/data/contact.ts`. The navbar's **Say hello** and the introduction's **Or just say hello** open the same dialog.
- **Field notes dialog copy:** edit `src/data/portfolio.ts`. Writing has not been ported yet, so this is still placeholder copy.
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

The tests cover the reversible scroll transition, header positioning at desktop and mobile widths, theme toggle, localized cursor glow, live reduced-motion preference changes, dialog focus return, section content, contact links, the résumé download, and 404 responses. Screenshots and failure traces are written to the ignored `test-results/` directory.
