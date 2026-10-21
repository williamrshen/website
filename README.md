# William Shen — the garden portfolio

The personal site of William Shen (uselessleaf), built for [williamrshen.com](https://williamrshen.com). Built with React, TypeScript, Vite, CSS Modules, and the Canvas 2D API. All fonts, artwork, and interactions run locally; the browser makes no third-party API requests. Cubing, TETR.IO, and MCSR Ranked stats are imported into build-time snapshots; there are no CDN assets or analytics.

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
- Hobby cards expand into a side panel. Speedcubing has Official/Unofficial results, an event selector, and practice averages; a weekly workflow refreshes its bundled snapshot, and the same workflow refreshes the live TETR.IO and MCSR Ranked stats. Other hobbies use the old site's sample stats.
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
    Portrait.tsx                   Introduction photo slideshow
    CardSection.tsx                Experience/project cards with show-all control
    HobbySection.tsx               Hobby tiles with headline stats
    CubingStats.tsx                Source/event controls and practice extras
    CubingProgression.tsx          Interactive metric-button personal-best chart
    Sparkline.tsx                  Small SVG rating-history chart
    DetailDialog.tsx               Native modal for bullets, tags, stats, and links
    ContactIcon.tsx                Email, LinkedIn, and GitHub icons
    Footer.tsx                     Soli deo gloria, 2 Corinthians 12:9, sign-off
    Logo.tsx                       Isometric cube wordmark icon
    NotFound.tsx                   “Nothing's grown here yet” 404 page
    *.module.css                   Styles scoped to each component
  data/
    profile.ts                     Name, alias, portrait, introduction, Currently list
    experience.ts                  Roles shown in “where i've worked”
    projects.ts                    Projects shown in “a few things i've grown”
    hobbies.ts                     Static sample hobby stats and blurbs
    cubing.ts                      Typed cubing snapshot and display formatting
    cubing-chart.ts                Chart geometry, date ranges, carried-forward PBs
    generated/cubing.json           Last-good official/practice snapshot bundled by Vite
    contact.ts                     Email, LinkedIn, and GitHub for “Say hello”
    portfolio.ts                   Field notes dialog copy
    types.ts                       Shared card and dialog types
  garden/
    scene.ts                       Seeded world generation and canvas renderer
  hooks/
    useGardenExperience.ts         Scroll morph, cursor, media queries, lifecycle
public/
  portfolio-mark.svg               Local cube favicon (source for the PNG icons)
  favicon.ico                      32 × 32 fallback favicon
  apple-touch-icon.png             180 × 180 home-screen icon
  icon-192.png, icon-512.png       Manifest icons (cube on cream, maskable-safe padding)
  site.webmanifest                 Name, colors, and icons for installs/home screens
  robots.txt                       Allows crawlers except /resume.pdf; points at the sitemap
  sitemap.xml                      Lists the single page
  og-image.png                     1200 × 630 link-preview card (daylight garden)
  resume.pdf                       Résumé, served at /resume.pdf
tests/
  portfolio.spec.ts                Browser checks for layout and interactions
  cubing.spec.ts                   Cubing controls, mobile/keyboard flows, scoped axe checks
config/cubing.json                  WCA profile, explicit session-name mappings, practice filters
config/hobbies.json                 Usernames for the live hobby stat APIs
scripts/hobbies/                    Live hobby API clients and refresh scripts
scripts/cubing/                     Source clients, calculations, validation, refresh script
.github/workflows/ci.yml           Unit tests, lint, build, and e2e on pushes to main and PRs
.github/workflows/refresh-stats.yml Weekly refresh, checks, snapshot commit, optional deploy hook
playwright.config.ts               Local-only browser test server
index.html                         Page title, description, favicon, and social preview tags
404.html                           Not-found page shell (noindex)
vite.config.ts                     Vite + React, 404 build entry, local 404 handling
```

### Customize content

- **Name, alias, introduction, Currently list, and portrait:** edit `src/data/profile.ts`. The introduction headline lives in `src/components/About.tsx`.
- **Hero photos:** edit the `portraits` list in `src/data/profile.ts`. Each entry has an image, alt text, caption, and the CSS `object-position` used to crop it into the portrait frame; add an entry to add a slide. The slideshow advances every 6 seconds, pauses on hover/focus and in background tabs, and doesn't autoplay with reduced motion. Images live in `src/assets/` (`portrait.jpg` is 1000 × 1162, `burlington.jpg` 2048 × 1536, both with metadata removed).
- **Work experience:** edit `src/data/experience.ts`. Roles are listed newest first; the Geotab entry is a placeholder. Cards currently use company monograms until artwork is chosen.
- **Projects:** edit `src/data/projects.ts`. The first three appear before expanding. Cards rotate through placeholder icons until project artwork is chosen.
- **Hobby descriptions and other hobby stats:** edit `src/data/hobbies.ts`. Table tennis uses the old site's Oct 2, 2026 sample snapshot, with its history downsampled to 36 points. TETR.IO and MCSR Ranked numbers come from `src/data/generated/tetrio.json` and `mcsr.json` (see Live hobby stats), and speedcubing numbers from the generated snapshot described below.
- **Résumé:** replace `public/resume.pdf`. It is served at the stable URL `/resume.pdf`, and the introduction's **Résumé** link downloads it as `William Shen - Resume.pdf` (set in `src/data/profile.ts`). The current file is `WT6_RESUME.pdf` (Sep 10, 2026), unchanged, and includes your phone number.
- **Link previews:** the Open Graph and Twitter tags in `index.html` point at `public/og-image.png`, a 1200 × 630 screenshot of the daylight garden with the theme toggle and scroll hint hidden and the wordmark centered. Re-capture it at that viewport when the garden changes, and update `og:image:alt` to match.
- **Structured data:** `index.html` has a schema.org `ProfilePage`/`Person` JSON-LD block (name, alias, email, current role, school, LinkedIn/GitHub). It is static HTML so crawlers see it without running JavaScript; `tests/portfolio.spec.ts` checks the email, `sameAs` links, and current role against `src/data/contact.ts` and the first entry in `src/data/experience.ts`, so update it when those change.
- **Contact links:** edit `src/data/contact.ts`. The navbar's **Say hello** and the introduction's **Or just say hello** open the same dialog.
- **Field notes dialog copy:** edit `src/data/portfolio.ts`. Writing has not been ported yet, so this is still placeholder copy.
- **Colors and dimensions:** edit the CSS custom properties in `src/index.css`; component-specific layout lives alongside each component.
- **Garden shapes and placement:** edit `src/garden/scene.ts`. Its seeded random generator keeps the landscape stable across mounts and resizes.
- **Scroll choreography:** edit `src/hooks/useGardenExperience.ts` and `GardenExperience.module.css`. Frame-by-frame updates go straight to CSS variables and canvas rather than triggering React renders.

## Live hobby stats

TETR.IO stats come from the [TETRA CHANNEL API](https://tetr.io/about/api/). Usernames live in
`config/hobbies.json`. `npm run stats:refresh` (or `npm run stats:refresh:hobbies` on its own)
fetches the league summary, 40 LINES and Blitz records, and league history, then rewrites
`src/data/generated/tetrio.json`. No account or key is needed.

MCSR Ranked stats come from the [MCSR Ranked API](https://docs.mcsrranked.com/): the user
profile (Elo, rank, ranked record, best time) plus the last 100 ranked matches of the
current season for the Elo history, written to `src/data/generated/mcsr.json`. If the API fails, the previous
file is kept and a warning is printed, so one outage never blocks the other refreshes.
The browser never calls either API; the numbers are bundled at build time.

## Cubing stats

### Website behavior

- The compact card shows the configured featured event (3×3), initially using official PBs.
- Open **Speedcubing** to choose **Official** or **Unofficial** and select an event.
- Official results show ranked singles/averages, country/world ranks, rounds, and total attempts for the selected event. DNF attempts count; DNS and unattempted slots do not.
- Unofficial results show PBs, session average, and solve count in the stats boxes, with additional practice bests below.
- PB progression charts sit below the official stats strip, or below practice averages in unofficial mode.
- Changing the event affects the expanded panel; the compact card remains a 3×3 summary.
- Closing/reopening the panel retains your source and event selection until the page reloads.
- Empty practice data is explicitly unavailable; official times are never substituted into the unofficial view.
- Each source's footer shows one **last updated** date, taken from its last successful pull, rather than the WCA export date or individual solve dates.

### Progression charts

One **Metric** dropdown in the chart header selects **Single**, **Mo3**, **Ao5**,
**Ao12**, **Ao50**, **Ao100**, or **Ao1000** for practice. Official results support
**Single** and the event's official average format (Ao5 or Mo3). The previous
metric-button row and preset range selector have been removed. These are
personal-best improvement timelines, not every individual solve or a moving
performance trend. Lower times are better.

In unofficial mode, the third stats box shows **Session average** with the total
number of solves as its supporting text, and the chart summary is simply
**PB: time**. Solve count includes DNFs and remains the session total when
changing metrics or zooming. Session average is the arithmetic mean of non-DNF
effective times, including penalties and csTimer precision. When multiple
sessions map to an event, this mean is weighted by their valid solve counts, not
an average of session averages. All-DNF/empty sessions show `—` for session
average.

In official mode, the third stats box shows **Rounds** and its supporting text
shows **Attempts** for that event. Attempts count positive results and DNFs;
unattempted solves and DNS entries are excluded.

The time axis can be zoomed directly:

- Drag horizontally across the graph to select a timeframe, in either direction.
- Use the **+**/**−** controls to zoom in/out, and **Reset zoom** to return to all time.
- Hold **Ctrl** or **Command** while scrolling over the graph to zoom around the cursor.
  Ordinary scrolling continues to scroll the page.
- Once zoomed, **Shift-drag** pans the timeframe. Keyboard users can focus the
  graph and use **Shift+Left/Right** to pan, **+**/**−** to zoom, or **0** to reset.
- On touch devices, horizontal dragging or the zoom controls select a timeframe;
  vertical page scrolling and browser pinch zoom remain available.

Axis labels update from years to months, days, and times as the view narrows.
Zoom is bounded by the available history, with a minimum one-minute view (or the
whole history if shorter). Changing the metric preserves the selected timeframe,
clamped to that metric's history; changing the event/source resets the chart.
When zoomed, **PB in view** is the best held at the end of the selected timeframe.

Hover or tap the graph to inspect a record's time and date. For keyboard use,
focus the graph and use Left/Right to inspect records, or Home/End for the first
and last. Escape dismisses the selected point; pressing it again closes the
hobby panel. The chart uses responsive local SVGs and makes no browser API calls.

The weekly exporter backfills practice histories from solve timestamps, while
keeping all mean/average windows within their original session order. It then sorts dated
results and retains only successive PB improvements, coalescing equal timestamps.
Undated results are omitted from the timeline rather than assigned invented dates.
Only compact PB milestones are published, not the complete solve history.

Official progression uses positive round results and competition dates from the
WCA mirror. Multiple rounds in the same competition are coalesced into the best
result for that competition. Points are positioned at the competition's start
date; tooltips show the full date range for multi-day competitions. Official
round averages are used as published, not recomputed from attempts or joined
across rounds. A missing average can still be selected and shows an empty state.

Zoomed views carry an existing PB forward at the left edge when it was set before
the view. A flat line therefore means the PB was held, not that new identical
records were achieved. Tooltips retain the record's original date.

### Refresh locally

```sh
cp .env.example .env.local
# Edit .env.local and set CSTIMER_ID to your csTimer server export ID.
npm run stats:refresh
npm run dev
```

`.env.local` is ignored by Git. The refresh command loads it automatically; do
not use a `VITE_` prefix for the export ID because that would expose it to browser
code. There is no need to run or host the separate Express API.

Official data is read from the community-maintained [WCA REST mirror](https://wca-rest-api.robiningelbrecht.be/)
using the configured WCA ID (`2016SHEN13`). The script reads that person's JSON
and the mirror's `version.json`, plus competition metadata for history dates. It converts timed centiseconds into milliseconds
and retains personal records and rankings. Fewest Moves and Multi-Blind are not
included in this time-based snapshot.

Practice data is downloaded from the latest csTimer server export, including
compressed solve chunks. Only records, counts, session names, and record dates
are published; the export ID, raw solve history, scrambles, and comments are not
included. Export in csTimer before refreshing to include your latest solves.

The snapshot is written atomically to `src/data/generated/cubing.json` and
imported into the Vite bundle. A successful refresh appears in local development
through HMR and on the live website after deployment. There is no browser-side
fetching, loading spinner, or runtime API/cache server.

If one source fails, its previous data and original refresh timestamp are kept.
If both fail, the command exits unsuccessfully without replacing the file.
Missing `CSTIMER_ID` skips practice importing and still allows official refreshes.

### Select practice sessions

Edit `config/cubing.json`:

- `featuredEvent` controls the compact card.
- Each event's `sessionNames` explicitly maps csTimer session names to that WCA
  event. Scramble type is ignored. Event choices include events present in either
  data source plus the featured event.
- `practice.includeSessionNames: null` includes all sessions whose names are
  explicitly mapped. Set it to an array of names to further restrict publication.
- `practice.excludeSessionNames` excludes named sessions even when included above.

The configured mapping is:

| csTimer session | WCA event | Event ID |
| --- | --- | --- |
| `3x3` | 3×3 | `333` |
| `2x2` | 2×2 | `222` |
| `4x4` | 4×4 | `444` |
| `oh` | 3×3 one-handed | `333oh` |
| `bld` | 3×3 blindfolded | `333bf` |
| `skewb` | Skewb | `skewb` |
| `clock` | Clock | `clock` |
| `sq1` | Square-1 | `sq1` |

`virtual`, `cycles`, `2 ppl`, and `10.11 333` are not mapped and are excluded.
Matching is exact after decoding escaped text, trimming surrounding whitespace,
ignoring case, and treating `×` as `x`. There is no substring matching: a dated
name containing `333` is not automatically classified as 3×3.

For example, to further restrict publication to three of the mapped sessions:

```json
{
  "practice": {
    "includeSessionNames": ["3x3", "2x2", "oh"],
    "excludeSessionNames": []
  }
}
```

Duplicate names match all corresponding sessions. Session numbers are not used as persistent selectors
because csTimer can reassign them when deleting sessions.

Records are computed within each session, then the best result for each metric
is selected across sessions. Averages never span session boundaries. Calculations
honor penalties, DNFs, csTimer precision, and enabled session-specific trimming.
Custom trimming is labeled **custom average**, not as a WCA-equivalent Ao5.
Missing or invalid averages show `—`; timestamps are displayed as UTC dates.

### Weekly publishing

`.github/workflows/refresh-stats.yml` runs Mondays at **04:17 UTC** and supports
manual runs from **Actions → Refresh stats → Run workflow**. After this
code is pushed to the default branch, configure these repository Actions secrets:

| Secret | Purpose |
| --- | --- |
| `CSTIMER_ID` | Your csTimer server export ID; required for practice importing. |
| `VERCEL_DEPLOY_HOOK` | Optional production deploy-hook URL from Vercel project settings, targeting `main`. |

The workflow installs dependencies, refreshes the snapshot, runs unit tests,
lint, the production build, and browser tests, then commits only the generated
snapshots. This preserves the last-good data for normal website deployments.
It explicitly posts to the deploy hook when configured. Without the hook, the
snapshot is still committed; deployment depends on your existing Git integration.
The workflow requires permission to write repository contents; a protected
default branch may require a different publication strategy.

Use a deploy hook for predictable production refreshes, rather than relying on
an automated snapshot commit to trigger another workflow. Hook/token configuration
and production deployment are separate from local preview; no secrets belong in
the generated JSON or the website bundle.

## Checks

```sh
npm run lint        # Oxlint
npm test            # Snapshot clients, normalization, averages, and last-good behavior
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

The tests cover the reversible scroll transition, header positioning at desktop and mobile widths, theme toggle, localized cursor glow, live reduced-motion preference changes, dialog focus return, section content, contact links, the résumé download, and 404 responses. Cubing checks include source/event selection, empty/custom results, formatting, compact-card persistence, chart placement/metrics/ranges/hover/tap/keyboard inspection, mobile layouts, no external browser requests, and scoped axe scans of the cubing panel in both themes/sources. Practice test data is injected into the development module and is never written into the published snapshot. Screenshots and failure traces are written to the ignored `test-results/` directory.
