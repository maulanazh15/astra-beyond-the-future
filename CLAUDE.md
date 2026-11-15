# ASTRA: BEYOND THE FUTURE

Web-based space mission design and simulation game (NASA Space Apps Challenge 2026).
Players design, launch, operate, and evaluate hypothetical future missions, learning
aerospace engineering trade-offs (budget, mass, power, propellant, comms, risk).
Full design spec: `documentation/gdd.txt`. MVP mission: **LUNAR ECHO** (lunar far-side radio observatory).

Core loop: Discover → Define → Design → Plan → Validate → Launch → Operate → Evaluate → Redesign.

## Workflow

- Create subfolders only when the first file needs them.
- Run `npm run build && npm run lint && npm test` before considering work done.

## Architecture Rules

1. **Engine is UI-independent.** `src/engine/` must never import React, components,
   features, services, or browser APIs (`window`, `localStorage`). It only imports
   from `src/types/` and `src/utils/`.
2. **Engine functions are pure.** Input state + config → new state. No mutation, no
   hidden globals. Randomness comes from an injected seeded RNG so runs are reproducible.
3. **Layering:** Presentation (components/features) → Game logic → Engine → Data.
   UI calls the engine; the engine never calls the UI.
4. **Data lives in JSON.** Component specs, missions, launch vehicles, orbits, and NASA
   sources go in `src/data/*.json`, typed via `src/types/`. No hardcoded magic numbers in UI.
5. **Persistence goes through `src/services/persistence/`.** No direct `localStorage`
   calls elsewhere. Saved data includes a `version` field; parse defensively.
6. **No external API calls.** NASA data is pre-downloaded, curated, and stored locally.
7. **Every NASA-derived value cites a source** entry in `data/nasa-sources/`. Dataset values
   are `SourcedValue`s labeled `source-derived`, `derived-estimate`, or `placeholder`, with
   units and processing notes. Never mark a value source-derived unless it was checked
   against the publication. Simplifications are gameplay approximations, not NASA predictions.
8. **Scientific plausibility over precision.** Use simplified, documented models
   (see GDD §9.6); avoid professional-grade physics.

## Coding Conventions

- TypeScript strict; no `any` (use `unknown` + narrowing). Prefer `type` for data shapes.
- Function components with hooks only. One component per file, `PascalCase.tsx`.
- Non-component files: `camelCase.ts`; folders: `kebab-case`.
- Named exports (default export only for `App`).
- Keep components small and reusable; move logic into hooks or the engine.
- Style with Tailwind utility classes; no CSS modules or CSS-in-JS.
- Tailwind v4 has no config file: theme tokens live in `@theme` in `src/index.css`.
- Use Lucide icons; do not add other icon libraries.
- Units explicit in names or types: `massKg`, `powerW`, `costMUsd`, `durationDays`.
- Engine logic gets unit tests in `tests/` mirroring `src/engine/`.
- Do not add dependencies without a clear need.

## MVP Limitations

- Single mission (LUNAR ECHO); campaign/sandbox expansion later.
- Local co-op only (shared screen); no online multiplayer.
- No backend, accounts, or database; LocalStorage only (IndexedDB later if needed).
- No live NASA API dependency during play.
- 3D is display-only: `src/features/visualization/` (lazy-loaded; 2D screens import only
  `LazyScenes.tsx`; see `documentation/3d-asset-pipeline.md`). No interactive 3D assembly yet.
- Simplified orbital, thermal, and power models; not engineering-accurate.
- English only (Indonesian localization later).
