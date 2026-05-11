---
name: slop-web-ui
description: Design, modify, and validate web UI for this 3D Slop repo. Use when Codex is building or changing the GitHub Pages catalog, standalone browser apps under apps/, STL/model viewers, app navigation from the catalog, responsive CSS, UI copy, or frontend tests that should match the repo's sarcastic utilitarian visual language.
---

# Slop Web UI

## First Read

Before changing UI, read:

- `AGENTS.md` for repo voice and project boundaries.
- `site/index.html`, `site/assets/styles.css`, and `site/assets/app.js` for the GitHub Pages catalog.
- The target app's `index.html`, `src/styles.css`, and main JS when working under `apps/`.
- `package.json`, `playwright.config.mjs`, and nearby e2e tests before changing frontend behavior.

## Visual Language

Build interfaces that look like they belong in 3D Slop: useful, blunt, slightly sarcastic, and not pretending the triangles are royalty.

Use the shared palette unless the local file already defines a stronger reason:

```css
--ink: #181818;
--muted: #5f625c;
--paper: #f4f1e8;
--panel: #fffdfa;
--panel-strong: #ffffff;
--line: #252525;
--acid: #b7ff3c;
--rust: #c24c2f;
--blue: #247c8a;
--pink: #dc4d7a;
--shadow: 0 18px 50px rgba(24, 24, 24, 0.14);
```

Core styling rules:

- Use the beige grid page background, black ink, 2px black borders, 6-8px radii, hard panel divisions, and high-contrast accent buttons.
- Keep giant uppercase page titles for app/catalog identity. Keep panel headings compact.
- Use `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- Keep `letter-spacing: 0`; do not add squeezed display type.
- Use full-width tool surfaces and panels, not floating marketing sections.
- Use dark canvas/viewer shells for 3D previews, with the acid grid/helper lines when useful.
- Avoid glassmorphism, soft pastel SaaS gradients, decorative blobs, purple/blue hero mush, nested cards, oversized marketing hero sections, and ornamental SVG fluff.

## Layout Patterns

For the GitHub Pages catalog:

- Keep a two-column desktop layout: sticky collection/model browser on the left, large viewer/details panel on the right.
- Keep the catalog generic across model collections. Do not hard-code D-Bricks-specific language into root catalog UI.
- Add app links as pseudo-model buttons in the browser panel when an app belongs beside model presets.
- Show model descriptions in the detail view, not inside cramped preset buttons.

For standalone apps:

- Put the actual tool on the first screen: left control panel, right viewer/result panel.
- Keep controls feature-complete but not spreadsheet-shaped. Hide advanced numeric plumbing unless the user explicitly needs it.
- Prefer clear command buttons and status cards over explanatory in-app prose.
- Use stable dimensions for viewers, toolbars, counters, buttons, and control rows so generated text and loading states do not shove the layout around.
- Keep mobile layout single-column with panels stacked, full-width controls, and readable details.

## Copy Voice

Use dry, friendly sarcasm as seasoning:

- Good: "Feed the mesh", "Preparing the pile", "Triangles are being asked to form a line."
- Bad: jokes that obscure commands, dimensions, warnings, or file names.
- Keep status text actionable enough to debug.
- Keep root-level copy project-wide. Put collection-specific jokes or credits inside collection pages/docs.

## Implementation Rules

- Prefer plain HTML/CSS/JS for the catalog. Use Vite apps under `apps/<app-name>/` when the tool needs bundling, WASM, tests, or dependencies.
- Use Three.js for STL viewing or 3D interaction. Keep the 3D scene unframed inside the viewer shell, not inside another decorative card.
- Reuse CSS variable names and component class patterns from `site/assets/styles.css` and existing app styles before inventing new ones.
- Keep generated artifacts under ignored `build/` or `dist/`. Add new caches or intermediate files to `.gitignore`.
- If adding a new app, wire it into the Pages build and add a catalog entry/link without making the root catalog collection-specific.
- Expose a small `window.__...` debug/test API for Playwright only when it materially improves deterministic validation.
- Do not add a dependency for a control, icon, or animation that plain DOM/CSS can handle. Add dependencies only when they buy real geometry, rendering, parsing, or interaction capability.

## Validation

Run the smallest meaningful checks, then the Pages build:

```powershell
npm run build:everything-a-brick
npm run test:e2e
cmake --build build\default --parallel --target pages
```

Adjust the npm script for the app being changed. If a new app is added, add a build script and an e2e path for it.

For UI changes:

- Use Playwright or the in-app browser to inspect desktop and mobile-ish widths.
- Capture or inspect the actual local Pages URL after rebuilding, usually `http://127.0.0.1:4173/`.
- Verify canvas-based views are nonblank, correctly framed, and interactive.
- Check long labels, status messages, file names, and generated metadata for overflow.
- Confirm the catalog still loads generated `catalog.json` data and app links after the Pages build.
