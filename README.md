# ASTRA: BEYOND THE FUTURE

> **Design Tomorrow. Explore Beyond.**

**Live:** https://astra-beyond-future.homelabchester.my.id/

ASTRA is a web-based space mission design and simulation game built for the
**NASA Space Apps Challenge 2026**. You lead a mission design team that turns a
science goal into a mission that can actually fly. Along the way you learn the
real engineering trade-offs aerospace teams face: budget, mass, power,
propellant, communications, and risk.

## The MVP mission: LUNAR ECHO

Build a radio observatory on the far side of the Moon, where the Moon itself
shields the instruments from Earth's radio noise. Because the far side never
faces Earth, you also have to plan relay communications, survive the lunar
night, and fit everything within the launch vehicle's mass and budget limits.

## Core loop

```
Discover → Define → Design → Plan → Validate → Launch → Operate → Evaluate → Redesign
```

- **Design:** pick subsystems, instruments, and a launch vehicle, and watch the
  mass, power, and cost budgets update as you go.
- **Validate:** see which constraints your design breaks before you commit.
- **Launch and operate:** a reproducible simulation (seeded RNG) runs the mission,
  including random events and subsystem failures.
- **Evaluate and redesign:** score the outcome, learn from it, and iterate.

Modes: single-player, or local co-op for 1–4 players on a shared screen.

## Scientific grounding

Component specs, orbits, and launch vehicles live in `src/data/*.json`. Every
NASA-derived value cites a source in `data/nasa-sources/` and is labeled
`source-derived`, `derived-estimate`, or `placeholder`. The models are simplified
for gameplay and are meant to be plausible, not engineering-accurate predictions.
All data is stored locally, so the game makes no live API calls.

## Tech stack

React 19 · TypeScript (strict) · Vite · Tailwind CSS v4 · React Router ·
Three.js / React Three Fiber (display-only 3D) · Recharts · Vitest · oxlint.

The simulation engine (`src/engine/`) is pure TypeScript with no UI
dependencies, and it has unit tests in `tests/`.

## Development

```bash
npm install
npm run dev        # local dev server
npm run build      # type-check + production build into dist/
npm run lint
npm test
```

Further docs:
- `documentation/gdd.txt`: full game design document
- `documentation/3d-asset-pipeline.md`: 3D asset workflow
- `CLAUDE.md`: architecture rules and coding conventions

## Deployment

The site is self-hosted on a homelab: nginx running under Termux, exposed
through a Cloudflare Tunnel.

```bash
scripts/deploy.sh             # build + lint + test, upload, atomic swap, verify
scripts/deploy.sh --rollback  # restore the previous release
```

What the script does to keep deploys safe:
1. Runs the full build, lint, and test suite, and aborts on any failure.
2. Uploads to a staging directory (`public.new`), so the live site is never
   half-written.
3. Swaps the release in with `mv` and keeps the previous one as `public.prev`.
4. Checks the live URL over HTTPS, and rolls back automatically if the check fails.

You can override the defaults with environment variables: `DEPLOY_HOST` (default
`j2-ssh`), `DEPLOY_DIR`, `DEPLOY_URL`, and `SKIP_CHECKS=1` to only build. The SSH
host alias must be set up in `~/.ssh/config` with key-based auth.

The nginx vhost (`conf.d/astra.conf` on the server) listens on `:8080`, falls
back to `index.html` for client-side routes, and caches `/assets/` immutably
while serving `index.html` with `no-cache`.

## License & disclaimer

This is an educational project for NASA Space Apps Challenge 2026. It is not
affiliated with or endorsed by NASA. The missions are hypothetical, and the
simulations are simplified approximations.
